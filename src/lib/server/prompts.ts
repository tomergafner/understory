import type {
  CodeExcerpt,
  Goal,
  LearnerState,
  Question,
  QuestionStyle,
  RepositoryModel,
} from "../types";
import type { RepoSnapshot } from "./github";

// Prompt context per CLAUDE.md §6: pedagogy rules + compact repo model +
// learner state + recent evidence. Never the whole conversation.

// Stable system prompt — cacheable prefix; keep volatile content out of it.
export const TUTOR_SYSTEM = `You are the tutor engine of Understory, an app that teaches unfamiliar codebases the way a great teacher would.

Teaching philosophy (encode it in everything you produce):
1. One small chunk at a time — a lesson covers exactly one concept.
2. Test before advancing — at most 3 questions, answerable from the lesson.
3. Memorable analogies and clear contrast with alternative tools make ideas stick.
4. Continuous assessment reshapes the path — decisions cite the learner's actual answers.

Rules:
- Explanations: 2-3 calm paragraphs maximum. Concrete over abstract. Non-patronizing.
- Ground every claim in the provided repository evidence. Never invent file paths, line numbers, or code. If you reference code, it must be the provided excerpt.
- Separate observed facts from inference. When attributing intent to maintainers, say "likely" or "plausibly" — never certainty.
- Multiple-choice questions: 3-4 options, exactly one correct, ids "a" through "d", question ids "q1".."q3". Wrong options should be plausible misconceptions, not jokes.
- Free-form questions must be answerable in one sentence.
- Feedback is brief and evidence-based. Never include your private reasoning.
- Adaptation messages must name what the learner's answer revealed ("you said X, which suggests Y") and where the path goes next and why.`;

function curriculumBlock(
  model: RepositoryModel,
  goal: Goal,
  learner: LearnerState,
): string {
  const rows = model.concepts.map((c) => {
    const status = learner.conceptStatus[c.id] ?? "untaught";
    const mastery = learner.mastery[c.id];
    const inScope = c.goals.includes(goal) ? "in-scope" : "out-of-scope";
    return `- ${c.id} (L${c.level}, ${inScope}, status: ${status}${
      mastery ? `, mastery ${mastery.score}` : ""
    }): ${c.title} — ${c.summary}${
      c.prerequisites.length ? ` [prereqs: ${c.prerequisites.join(", ")}]` : ""
    }`;
  });
  return `Repository: ${model.owner}/${model.name} (${model.commitLabel}) — ${model.description}\nLearner goal: ${goal}\nCurriculum:\n${rows.join("\n")}`;
}

export function buildLessonPrompt(args: {
  model: RepositoryModel;
  evidence: Record<string, CodeExcerpt>;
  conceptId: string;
  goal: Goal;
  questionStyle: QuestionStyle;
  learner: LearnerState;
  recentAdaptation?: string | null;
}): string {
  const { model, evidence } = args;
  const concept = model.concepts.find((c) => c.id === args.conceptId);
  const excerpt = evidence[args.conceptId];

  const styleRule =
    args.questionStyle === "mc"
      ? "multiple choice only"
      : args.questionStyle === "free"
        ? "free-form preferred; one MC is acceptable if it tests something free-form cannot"
        : "mix of multiple choice and at most one free-form";

  return [
    curriculumBlock(model, args.goal, args.learner),
    args.recentAdaptation
      ? `Previous step's adaptation decision (continue its thread): ${args.recentAdaptation}`
      : null,
    `Teach this concept now: ${args.conceptId} — ${concept?.title}. ${concept?.summary}`,
    excerpt
      ? `Code evidence you may show and reference (path ${excerpt.path}, lines ${excerpt.startLine}-${excerpt.endLine}):\n${excerpt.code}`
      : "No code evidence is available for this concept — teach it conceptually and set useExcerpt to false.",
    `Question style: ${styleRule}. 2-3 questions.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildAssessPrompt(args: {
  model: RepositoryModel;
  conceptId: string;
  lessonTitle: string;
  goal: Goal;
  learner: LearnerState;
  questions: Question[];
  answers: Record<string, string>;
  mcResults: Record<string, boolean>;
}): string {
  const questionRows = args.questions.map((q) => {
    const answer = args.answers[q.id] ?? "(no answer)";
    if (q.kind === "mc") {
      const chosen = q.options?.find((o) => o.id === answer)?.label ?? answer;
      const correctLabel = q.options?.find((o) => o.id === q.correctOptionId)?.label;
      return `- [MC ${q.id}] "${q.prompt}" — learner chose: "${chosen}" — graded ${
        args.mcResults[q.id] ? "CORRECT" : "INCORRECT"
      } by the application (correct answer: "${correctLabel}"). Do not re-grade.`;
    }
    return `- [FREE ${q.id}] "${q.prompt}" — learner wrote: "${answer}" — grade this semantically.`;
  });

  return [
    curriculumBlock(args.model, args.goal, args.learner),
    `The learner just completed the lesson "${args.lessonTitle}" on concept ${args.conceptId}. Their answers:`,
    questionRows.join("\n"),
    `Now: grade the free-form answers, produce the assessment, and decide the next step.
- nextConceptId must be one of the curriculum ids above (out-of-scope ids are allowed only for remediation of a revealed misconception), or null if the goal-scoped curriculum is exhausted.
- Prefer: remediate a revealed misconception via a prerequisite > reinforce a shaky concept > advance to the next untaught in-scope concept (respect prerequisites).
- The adaptationMessage is shown to the learner verbatim.`,
  ].join("\n\n");
}

// Stage B of CLAUDE.md §5: one structured analysis from the deterministic
// snapshot. The model sees only what ingestion collected.
export function buildAnalysisPrompt(snapshot: RepoSnapshot): string {
  const treeListing = snapshot.tree
    .map((e) => `${e.path} (${e.size}b)`)
    .join("\n");
  const seedBlocks = snapshot.seeds
    .map((s) => `--- FILE: ${s.path} ---\n${s.content}`)
    .join("\n\n");

  return [
    `Analyze this repository and produce a learning curriculum for it.

Repository: ${snapshot.owner}/${snapshot.repo} @ ${snapshot.commitSha.slice(0, 7)}
GitHub description: ${snapshot.description || "(none)"}
Primary language: ${snapshot.primaryLanguage ?? "unknown"}
Files (filtered${snapshot.truncatedTree ? ", truncated" : ""}; ${snapshot.treeTotal} total):
${treeListing}`,
    `Seed file contents (the ONLY code you have read):

${seedBlocks}`,
    `Produce 6-16 curriculum concepts in teaching order, spanning level 1 (what is this) through level 5 (design tradeoffs); include level 6-7 (critical code paths, contribution readiness) only where the seed files give you real material.

Rules:
- ids kebab-case and unique; prerequisites reference listed ids only.
- summary: one concrete sentence. Separate observed facts from inference — say "likely" when inferring maintainer intent.
- goals: which learner goals (understand/use/architecture/contribute) each concept serves. Early concepts usually serve all; deep internals usually architecture/contribute.
- weight: 1-5 importance toward understanding this repo.
- evidence: where a seed file contains a genuinely illustrative snippet, quote a SMALL excerpt (5-20 lines) VERBATIM with its exact path. If unsure of line numbers, estimate conservatively. NEVER quote from files you were not given; use null instead.
- description: one crisp sentence, no marketing language.`,
  ].join("\n\n");
}

export function buildReviewPrompt(args: {
  model: RepositoryModel;
  goal: Goal;
  kind: "last_lesson" | "broad";
  learner: LearnerState;
  lastConceptId: string | null;
}): string {
  const target =
    args.kind === "last_lesson"
      ? `Quick review of the most recent lesson: concept ${args.lastConceptId}. 1-2 questions on that concept only.`
      : `Broad review across the journey: pick the 1-2 taught concepts most worth re-testing — prioritize low mastery, low confidence, and stale lastTestedAt. Only concepts whose status is not "untaught" are eligible.`;

  return [
    curriculumBlock(args.model, args.goal, args.learner),
    target,
    `Rules: multiple choice only (reviews are quick checks). Fresh questions — test understanding from a new angle, don't repeat lesson phrasing. The "reason" field is shown to the learner and should say why these concepts were chosen.`,
  ].join("\n\n");
}
