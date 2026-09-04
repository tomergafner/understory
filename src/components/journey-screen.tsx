"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchAssess,
  fetchLesson,
  fetchReviewPlan,
  type ContentSource,
} from "@/lib/client-api";
import { getConceptTitle, getRepoContent } from "@/lib/content";
import { computeCoverage } from "@/lib/coverage";
import {
  applyStepOutcome,
  lastTaughtConceptId,
  newDemoJourney,
  submitReview,
  type ReviewPlan,
} from "@/lib/engine";
import { nowMs, timeAgo } from "@/lib/time";
import type {
  LearningJourney,
  Lesson,
  Question,
  QuestionStyle,
  ReviewRecord,
  StepOutcome,
  StepRecord,
} from "@/lib/types";
import { useJourneysCtx } from "./journeys-context";
import {
  AdaptationNote,
  ExcerptBlock,
  ProgressLine,
  QuizQuestion,
} from "./lesson-bits";

type View =
  | { kind: "boot" }
  | { kind: "analysis" }
  | { kind: "onboard" }
  | { kind: "lesson"; conceptId: string }
  | { kind: "feedback"; lesson: Lesson; asked: Question[]; step: StepRecord; prevPercent: number }
  | { kind: "endOfPath" }
  | { kind: "resume" }
  | { kind: "review"; reviewKind: "last_lesson" | "broad" }
  | { kind: "reviewResult"; plan: ReviewPlan; review: ReviewRecord }
  | { kind: "notFound" };

function questionsForStyle(lesson: Lesson, style: QuestionStyle): Question[] {
  if (style === "mixed") return lesson.questions;
  const filtered = lesson.questions.filter((q) =>
    style === "mc" ? q.kind === "mc" : q.kind === "free" || q.essential,
  );
  return filtered.length > 0 ? filtered : lesson.questions;
}

const ANALYSIS_STAGES = [
  "Reading project structure…",
  "Finding important flows…",
  "Building your learning path…",
];

function defaultView(ready: boolean, journey: LearningJourney | undefined): View {
  if (!ready) return { kind: "boot" };
  if (!journey) return { kind: "notFound" };
  // "Fresh" means no learning has happened — steps, reviews, or any concept
  // touched in learner state (seeded journeys carry history there).
  const fresh =
    journey.steps.length === 0 &&
    journey.reviews.length === 0 &&
    Object.keys(journey.learner.conceptStatus).length === 0;
  return fresh ? { kind: "analysis" } : { kind: "resume" };
}

export function JourneyScreen({ journeyId }: { journeyId: string }) {
  const { journeys, ready, now, upsert, remove } = useJourneysCtx();
  const journey = journeys.find((j) => j.id === journeyId);
  const [override, setOverride] = useState<View | null>(null);

  // The view is derived until the user interacts; transitions set an override.
  const view: View = override ?? defaultView(ready, journey);
  const setView = setOverride;

  const coverage = useMemo(() => {
    if (!journey) return null;
    const { model } = getRepoContent(journey.repoId);
    return computeCoverage(model, journey.goal, journey.learner);
  }, [journey]);

  if (!ready || view.kind === "boot") {
    return <div className="min-h-screen" />;
  }

  if (view.kind === "notFound" || !journey || !coverage) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="font-display text-xl">This journey isn&apos;t here anymore.</p>
          <Link href="/" className="mt-3 inline-block text-[0.85rem] text-moss underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const { model } = getRepoContent(journey.repoId);
  const grewNote =
    coverage.addedByAdaptation.length > 0
      ? `path grew: +${getConceptTitle(journey.repoId, coverage.addedByAdaptation[0])}`
      : null;

  function goToConcept(conceptId: string | null) {
    setView(
      conceptId ? { kind: "lesson", conceptId } : { kind: "endOfPath" },
    );
  }

  return (
    <div className="min-h-screen">
      {view.kind !== "analysis" && (
        <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-8 py-3">
            <div className="flex items-baseline gap-2.5">
              <span className="font-code text-[0.78rem] font-medium text-ink">
                {journey.repoDisplayName}
              </span>
              <span className="font-code text-[0.65rem] text-ink-faint">
                {model.commitLabel}
              </span>
            </div>
            <ProgressLine
              percent={coverage.percent}
              goalLabel={journey.goalLabel}
              grewNote={grewNote}
            />
          </div>
        </header>
      )}

      <div className="mx-auto max-w-3xl px-8 py-10">
        {view.kind === "analysis" && (
          <AnalysisView onDone={() => setView({ kind: "onboard" })} />
        )}

        {view.kind === "onboard" && (
          <OnboardView
            journey={journey}
            onStart={(style) => {
              const updated = { ...journey, questionStyle: style };
              upsert(updated);
              goToConcept(journey.learner.recommendedNext?.conceptId ?? null);
            }}
          />
        )}

        {view.kind === "lesson" && (
          <LessonFlow
            key={view.conceptId}
            journey={journey}
            conceptId={view.conceptId}
            prevPercent={coverage.percent}
            onSubmitted={(lesson, asked, answers, outcome, prevPercent) => {
              const { journey: updated, step } = applyStepOutcome(
                journey,
                lesson.conceptId,
                answers,
                outcome,
                nowMs(),
              );
              upsert(updated);
              setView({ kind: "feedback", lesson, asked, step, prevPercent });
            }}
          />
        )}

        {view.kind === "feedback" && (
          <FeedbackView
            journey={journey}
            lesson={view.lesson}
            asked={view.asked}
            step={view.step}
            prevPercent={view.prevPercent}
            newPercent={coverage.percent}
            onContinue={() => goToConcept(view.step.nextConceptId)}
          />
        )}

        {view.kind === "endOfPath" && (
          <EndOfPathView
            onReview={() => setView({ kind: "review", reviewKind: "broad" })}
          />
        )}

        {view.kind === "resume" && (
          <ResumeView
            journey={journey}
            now={now}
            percent={coverage.percent}
            onContinue={() => goToConcept(journey.learner.recommendedNext?.conceptId ?? null)}
            onReview={(kind) => setView({ kind: "review", reviewKind: kind })}
            onRestart={
              journey.id === "demo-express"
                ? () => {
                    remove(journey.id);
                    upsert(newDemoJourney(nowMs()));
                    setView({ kind: "analysis" });
                  }
                : undefined
            }
          />
        )}

        {view.kind === "review" && (
          <ReviewFlow
            key={view.reviewKind}
            journey={journey}
            reviewKind={view.reviewKind}
            onSubmitted={(plan, review, updated) => {
              upsert(updated);
              setView({ kind: "reviewResult", plan, review });
            }}
            onBack={() => setView({ kind: "resume" })}
          />
        )}

        {view.kind === "reviewResult" && (
          <ReviewResultView
            journey={journeys.find((j) => j.id === journeyId) ?? journey}
            plan={view.plan}
            review={view.review}
            onContinue={() => {
              const current = journeys.find((j) => j.id === journeyId) ?? journey;
              goToConcept(current.learner.recommendedNext?.conceptId ?? null);
            }}
            onBack={() => setView({ kind: "resume" })}
          />
        )}
      </div>
    </div>
  );
}

function AnalysisView({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (stage >= ANALYSIS_STAGES.length) {
      const t = setTimeout(onDone, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStage((s) => s + 1), 700);
    return () => clearTimeout(t);
  }, [stage, onDone]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center" role="status">
      <div className="flex flex-col gap-3">
        {ANALYSIS_STAGES.slice(0, stage + 1).map((line, i) => (
          <p
            key={line}
            className={`anim-rise font-display text-[1.05rem] ${
              i === stage ? "text-ink" : "text-ink-faint line-through decoration-moss/40"
            }`}
          >
            {line}
          </p>
        ))}
      </div>
      <p className="mt-8 text-[0.72rem] uppercase tracking-[0.14em] text-ink-faint">
        Demo uses a bundled analysis — no waiting
      </p>
    </div>
  );
}

const GOALS = [
  { id: "understand", label: "Understand what it does" },
  { id: "use", label: "Learn to use and configure it" },
  { id: "architecture", label: "Understand the architecture" },
  { id: "contribute", label: "Become ready to contribute" },
];

function OnboardView({
  journey,
  onStart,
}: {
  journey: LearningJourney;
  onStart: (style: QuestionStyle) => void;
}) {
  const [style, setStyle] = useState<QuestionStyle>(journey.questionStyle);

  return (
    <div className="anim-rise mx-auto max-w-lg pt-10">
      <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-moss">
        {journey.repoDisplayName}
      </p>
      <h1 className="mt-2 font-display text-[1.9rem] tracking-tight">
        One minute of setup, then we start.
      </h1>

      <fieldset className="mt-8">
        <legend className="text-[0.8rem] font-medium text-ink">
          What do you want out of this repo?
        </legend>
        <div className="mt-3 flex flex-col gap-2">
          {GOALS.map((g) => {
            const selected = g.id === journey.goal;
            const disabled = g.id !== "architecture";
            return (
              <label
                key={g.id}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-[0.88rem] ${
                  selected
                    ? "border-moss bg-moss/10 font-medium text-moss-deep"
                    : disabled
                      ? "cursor-not-allowed border-line text-ink-faint/60"
                      : "border-line text-ink-soft"
                }`}
              >
                <input
                  type="radio"
                  name="goal"
                  checked={selected}
                  disabled={disabled}
                  readOnly
                  className="accent-[#3e7c4f]"
                />
                {g.label}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-[0.72rem] text-ink-faint">
          The demo teaches the architecture path; other goals open up with live analysis.
        </p>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-[0.8rem] font-medium text-ink">How should we test you?</legend>
        <div className="mt-3 flex gap-2">
          {(["mc", "free", "mixed"] as const).map((s) => (
            <label
              key={s}
              className={`cursor-pointer rounded-full border px-4 py-1.5 text-[0.8rem] ${
                style === s
                  ? "border-moss bg-moss/10 font-medium text-moss-deep"
                  : "border-line text-ink-soft hover:border-ink-faint"
              }`}
            >
              <input
                type="radio"
                name="qstyle"
                checked={style === s}
                onChange={() => setStyle(s)}
                className="sr-only"
              />
              {s === "mc" ? "Multiple choice" : s === "free" ? "Open questions" : "Mixed"}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        onClick={() => onStart(style)}
        className="mt-8 rounded-lg bg-moss px-6 py-3 text-[0.88rem] font-semibold text-cream transition-colors hover:bg-moss-deep"
      >
        Start learning
      </button>
    </div>
  );
}

function LessonFlow({
  journey,
  conceptId,
  prevPercent,
  onSubmitted,
}: {
  journey: LearningJourney;
  conceptId: string;
  prevPercent: number;
  onSubmitted: (
    lesson: Lesson,
    asked: Question[],
    answers: Record<string, string>,
    outcome: StepOutcome,
    prevPercent: number,
  ) => void;
}) {
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "error"; message: string }
    | { phase: "ready"; lesson: Lesson; source: ContentSource }
  >({ phase: "loading" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { model } = getRepoContent(journey.repoId);

  useEffect(() => {
    let cancelled = false;
    fetchLesson(journey, conceptId)
      .then(({ lesson, source }) => {
        if (!cancelled) setState({ phase: "ready", lesson, source });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ phase: "error", message: err.message });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on concept/attempt only
  }, [conceptId, attempt]);

  if (state.phase === "loading") {
    return (
      <LoadingNarration
        lines={[
          "Reading your learner model…",
          "Choosing what to teach next…",
          "Writing your lesson…",
        ]}
      />
    );
  }

  if (state.phase === "error") {
    return (
      <ErrorPane
        title="The lesson didn't arrive."
        message={state.message}
        onRetry={() => {
          setState({ phase: "loading" });
          setAttempt((a) => a + 1);
        }}
      />
    );
  }

  const { lesson, source } = state;
  // Style filtering applies to fixture lessons; model lessons already respect it.
  const asked =
    source === "fixture"
      ? questionsForStyle(lesson, journey.questionStyle)
      : lesson.questions;

  const allAnswered = asked.every((q) => (answers[q.id] ?? "").trim().length > 0);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGrading(true);
    setGradeError(null);
    fetchAssess(journey, lesson, asked, answers)
      .then(({ outcome }) =>
        onSubmitted(lesson, asked, answers, outcome, prevPercent),
      )
      .catch((err: Error) => {
        setGradeError(err.message);
        setGrading(false);
      });
  }

  return (
    <article>
      <p className="anim-rise text-[0.72rem] font-medium uppercase tracking-[0.14em] text-moss">
        {lesson.kicker}
        {source === "fixture" && (
          <span className="ml-2 normal-case tracking-normal text-ink-faint">
            · scripted
          </span>
        )}
      </p>
      <h1
        className="anim-rise mt-2 font-display text-[2.1rem] leading-tight tracking-tight"
        style={{ animationDelay: "60ms" }}
      >
        {lesson.title}
      </h1>

      <div className="anim-rise prose-lesson mt-6 max-w-[38rem]" style={{ animationDelay: "140ms" }}>
        {lesson.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {lesson.excerpt && (
        <div className="anim-rise mt-7" style={{ animationDelay: "220ms" }}>
          <ExcerptBlock excerpt={lesson.excerpt} commitLabel={model.commitLabel} />
        </div>
      )}

      <form onSubmit={onSubmit} className="anim-rise mt-9" style={{ animationDelay: "300ms" }}>
        <h2 className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-ink-faint">
          Check your understanding
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {asked.map((q, i) => (
            <QuizQuestion
              key={q.id}
              question={q}
              index={i}
              value={answers[q.id] ?? ""}
              onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={!allAnswered || grading}
          className="mt-5 rounded-lg bg-moss px-6 py-3 text-[0.88rem] font-semibold text-cream transition-colors hover:bg-moss-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          {grading ? "Reading your answers…" : "Check my answers"}
        </button>
        {gradeError && (
          <p role="alert" className="anim-fadein mt-3 text-[0.8rem] text-rust">
            Grading failed ({gradeError}) — your answers are still here, try
            again.
          </p>
        )}
      </form>
    </article>
  );
}

function LoadingNarration({ lines }: { lines: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setIndex((i) => Math.min(i + 1, lines.length - 1)),
      2200,
    );
    return () => clearInterval(t);
  }, [lines.length]);

  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center"
      role="status"
    >
      <p className="anim-fadein font-display text-[1.05rem] text-ink-soft" key={index}>
        {lines[index]}
      </p>
      <span className="mt-4 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-moss/60"
            style={{ animationDelay: `${i * 220}ms` }}
          />
        ))}
      </span>
    </div>
  );
}

function ErrorPane({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="anim-rise mx-auto max-w-md pt-20 text-center">
      <h1 className="font-display text-[1.5rem] tracking-tight">{title}</h1>
      <p className="mt-3 text-[0.85rem] leading-relaxed text-ink-soft">
        {message}
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={onRetry}
          className="rounded-lg bg-moss px-5 py-2.5 text-[0.85rem] font-semibold text-cream transition-colors hover:bg-moss-deep"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-line px-5 py-2.5 text-[0.85rem] text-ink-soft transition-colors hover:border-ink-faint"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

function FeedbackView({
  journey,
  lesson,
  asked,
  step,
  prevPercent,
  newPercent,
  onContinue,
}: {
  journey: LearningJourney;
  lesson: Lesson;
  asked: Question[];
  step: StepRecord;
  prevPercent: number;
  newPercent: number;
  onContinue: () => void;
}) {
  const nextTitle = step.nextConceptId
    ? getConceptTitle(journey.repoId, step.nextConceptId)
    : null;

  return (
    <article>
      <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-ink-faint">
        {lesson.title}
      </p>
      <h1 className="anim-rise mt-2 font-display text-[1.7rem] tracking-tight">
        Here&apos;s where you stand.
      </h1>

      <div className="mt-6 flex flex-col gap-3">
        {asked.map((q, i) => (
          <QuizQuestion
            key={q.id}
            question={q}
            index={i}
            value={step.answers[q.id] ?? ""}
            onChange={() => {}}
            result={step.correct[q.id]}
          />
        ))}
      </div>

      <p className="anim-rise mt-6 max-w-[38rem] text-[0.92rem] leading-relaxed text-ink-soft">
        {step.assessment.feedback}
      </p>

      <AdaptationNote message={step.adaptationMessage} />

      <p className="anim-fadein mt-7 font-code text-[0.78rem] text-ink-soft" style={{ animationDelay: "400ms" }}>
        Coverage <span className="text-ink-faint">{prevPercent}%</span>
        <span className="mx-1.5 text-moss">→</span>
        <span className="font-medium text-moss-deep">{newPercent}%</span>
      </p>

      <button
        onClick={onContinue}
        className="mt-7 rounded-lg bg-moss px-6 py-3 text-[0.88rem] font-semibold text-cream transition-colors hover:bg-moss-deep"
      >
        {nextTitle ? `Continue: ${nextTitle}` : "Continue"}
      </button>
    </article>
  );
}

function EndOfPathView({ onReview }: { onReview: () => void }) {
  return (
    <div className="anim-rise mx-auto max-w-lg pt-16 text-center">
      <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-moss">
        Path complete
      </p>
      <h1 className="mt-3 font-display text-[1.8rem] tracking-tight">
        You&apos;ve covered the curriculum for your goal.
      </h1>
      <p className="mt-4 text-[0.9rem] leading-relaxed text-ink-soft">
        Coverage isn&apos;t the same as mastery — a short review of your
        weakest concepts is the honest way to close. Your progress is saved.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          onClick={onReview}
          className="rounded-lg bg-moss px-5 py-2.5 text-[0.85rem] font-semibold text-cream transition-colors hover:bg-moss-deep"
        >
          Review what I&apos;ve learned
        </button>
        <Link
          href="/"
          className="rounded-lg border border-line px-5 py-2.5 text-[0.85rem] text-ink-soft transition-colors hover:border-ink-faint"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

function ResumeView({
  journey,
  now,
  percent,
  onContinue,
  onReview,
  onRestart,
}: {
  journey: LearningJourney;
  now: number;
  percent: number;
  onContinue: () => void;
  onReview: (kind: "last_lesson" | "broad") => void;
  onRestart?: () => void;
}) {
  const next = journey.learner.recommendedNext;
  const nextTitle = next?.conceptId
    ? getConceptTitle(journey.repoId, next.conceptId)
    : null;

  return (
    <div className="anim-rise mx-auto max-w-lg pt-14">
      <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-moss">
        Welcome back
      </p>
      <h1 className="mt-2 font-display text-[1.9rem] tracking-tight">
        {journey.repoDisplayName}
      </h1>
      <p className="mt-2 text-[0.85rem] text-ink-soft">
        {percent}% covered toward “{journey.goalLabel}” · last here{" "}
        {timeAgo(now, journey.lastActiveAt)}
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={onContinue}
          className="group rounded-lg border border-moss bg-moss/5 px-5 py-4 text-left transition-colors hover:bg-moss/10"
        >
          <span className="block text-[0.9rem] font-semibold text-moss-deep">
            Continue where I left off
          </span>
          {nextTitle && (
            <span className="mt-0.5 block text-[0.8rem] text-ink-soft">
              Next: {nextTitle}
              {next?.action === "remediate" && " · shoring up a gap first"}
              {next?.action === "reinforce" && " · reinforcing before advancing"}
            </span>
          )}
        </button>
        <button
          onClick={() => onReview("last_lesson")}
          className="rounded-lg border border-line bg-white/50 px-5 py-4 text-left transition-colors hover:border-ink-faint"
        >
          <span className="block text-[0.9rem] font-medium text-ink">
            Quick review of the last lesson
          </span>
          <span className="mt-0.5 block text-[0.8rem] text-ink-soft">
            A couple of questions before continuing — retention beats rereading.
          </span>
        </button>
        <button
          onClick={() => onReview("broad")}
          className="rounded-lg border border-line bg-white/50 px-5 py-4 text-left transition-colors hover:border-ink-faint"
        >
          <span className="block text-[0.9rem] font-medium text-ink">
            Review what I&apos;ve learned
          </span>
          <span className="mt-0.5 block text-[0.8rem] text-ink-soft">
            Sampled from your weakest and least-recently-tested concepts.
          </span>
        </button>
      </div>

      {onRestart && (
        <button
          onClick={onRestart}
          className="mt-6 text-[0.75rem] text-ink-faint underline-offset-2 hover:underline"
        >
          Restart this demo from the beginning
        </button>
      )}
    </div>
  );
}

function ReviewFlow({
  journey,
  reviewKind,
  onSubmitted,
  onBack,
}: {
  journey: LearningJourney;
  reviewKind: "last_lesson" | "broad";
  onSubmitted: (
    plan: ReviewPlan,
    review: ReviewRecord,
    updated: LearningJourney,
  ) => void;
  onBack: () => void;
}) {
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "error"; message: string }
    | { phase: "ready"; plan: ReviewPlan }
  >({ phase: "loading" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchReviewPlan(journey, reviewKind, lastTaughtConceptId(journey))
      .then(({ plan }) => {
        if (!cancelled) setState({ phase: "ready", plan });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ phase: "error", message: err.message });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on kind/attempt only
  }, [reviewKind, attempt]);

  if (state.phase === "loading") {
    return (
      <LoadingNarration
        lines={[
          "Looking over what you've covered…",
          "Finding the concepts worth re-testing…",
          "Writing review questions…",
        ]}
      />
    );
  }

  if (state.phase === "error") {
    return (
      <ErrorPane
        title="The review didn't arrive."
        message={state.message}
        onRetry={() => {
          setState({ phase: "loading" });
          setAttempt((a) => a + 1);
        }}
      />
    );
  }

  const { plan } = state;
  const allAnswered = plan.questions.every(
    (q) => (answers[q.id] ?? "").trim().length > 0,
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { journey: updated, review } = submitReview(
      journey,
      plan,
      answers,
      nowMs(),
    );
    onSubmitted(plan, review, updated);
  }

  const title =
    plan.kind === "last_lesson"
      ? `Quick review · ${getConceptTitle(journey.repoId, plan.conceptIds[0])}`
      : "Review across your journey";

  return (
    <article className="anim-rise mx-auto max-w-2xl pt-6">
      <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-moss">
        Active review
      </p>
      <h1 className="mt-2 font-display text-[1.7rem] tracking-tight">{title}</h1>
      <p className="mt-2 max-w-[36rem] text-[0.85rem] leading-relaxed text-ink-soft">
        {plan.reason}
      </p>

      <form onSubmit={onSubmit} className="mt-7">
        <div className="flex flex-col gap-3">
          {plan.questions.map((q, i) => (
            <QuizQuestion
              key={q.id}
              question={q}
              index={i}
              value={answers[q.id] ?? ""}
              onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
            />
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={!allAnswered}
            className="rounded-lg bg-moss px-6 py-3 text-[0.88rem] font-semibold text-cream transition-colors hover:bg-moss-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            Check my answers
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-line px-5 py-3 text-[0.85rem] text-ink-soft transition-colors hover:border-ink-faint"
          >
            Back
          </button>
        </div>
      </form>
    </article>
  );
}

function ReviewResultView({
  journey,
  plan,
  review,
  onContinue,
  onBack,
}: {
  journey: LearningJourney;
  plan: ReviewPlan;
  review: ReviewRecord;
  onContinue: () => void;
  onBack: () => void;
}) {
  const next = journey.learner.recommendedNext;
  const nextTitle = next?.conceptId
    ? getConceptTitle(journey.repoId, next.conceptId)
    : null;

  return (
    <article className="anim-rise mx-auto max-w-2xl pt-6">
      <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-moss">
        Review result
      </p>
      <h1 className="mt-2 font-display text-[1.7rem] tracking-tight">
        {review.feedback}
      </h1>

      <div className="mt-6 flex flex-col gap-3">
        {plan.questions.map((q, i) => (
          <QuizQuestion
            key={q.id}
            question={q}
            index={i}
            value={review.answers[q.id] ?? ""}
            onChange={() => {}}
            result={review.correct[q.id]}
          />
        ))}
      </div>

      <AdaptationNote
        message={
          Object.values(review.correct).every(Boolean)
            ? "Retention looks solid, so nothing needs re-teaching — your path picks up exactly where it was headed."
            : `That answer changes the plan: before advancing, we'll revisit ${nextTitle ?? "the shaky concept"} so the foundation holds.`
        }
      />

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onContinue}
          className="rounded-lg bg-moss px-6 py-3 text-[0.88rem] font-semibold text-cream transition-colors hover:bg-moss-deep"
        >
          {nextTitle ? `Continue: ${nextTitle}` : "Continue"}
        </button>
        <button
          onClick={onBack}
          className="rounded-lg border border-line px-5 py-3 text-[0.85rem] text-ink-soft transition-colors hover:border-ink-faint"
        >
          Back
        </button>
      </div>
    </article>
  );
}
