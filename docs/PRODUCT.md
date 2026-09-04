# Product: Adaptive GitHub Repository Tutor (working name: Understory)

## User problem

Understanding an unfamiliar codebase is slow, passive, and unreliable. READMEs, wikis,
and AI-generated summaries optimize the artifact — they explain the repository once,
the same way, to everyone. Reading without being tested produces the illusion of
understanding; nothing checks what actually landed, and nothing adapts when it didn't.

## Target user

A developer who needs to work with a public GitHub repository they don't know —
to understand it, use and configure it, grasp its architecture, or become ready
to contribute. Their goal determines how deep the curriculum goes.

## Core experience

1. Paste a public GitHub URL — or click "Try the demo" (zero input required).
2. Pick a goal (understand / use / architecture / contribute) and a question style
   (multiple choice / free form / mixed). Onboarding stays under 30 seconds.
3. The loop: one small concept grounded in real code (path + line range) →
   a test of at most 3 questions → honest grading → a visible adaptation message →
   the next concept chosen from both the repository model and the learner model.

The teaching philosophy behind the loop:
- learn in small chunks, then be asked questions about what you just read;
- get tested before moving on — new concepts only after current ones are checked;
- memorable analogies and clear contrast with alternative tools make ideas stick;
- a great teacher continuously gauges understanding and reshapes the path.

The system keeps two explicit state models: a RepositoryModel (what must be
understood) and a LearnerState (what this person currently understands). Every
next step is the policy that closes the gap between them. Adaptation is always
visible: the message names what the last answer revealed and why the path changed.

## Durable history and resume

- A learning journey (one user × one repo × one goal) persists under a durable
  browser identity — no account required.
- The left sidebar lists recent journeys: repo name, subtle progress %, recency.
- Reopening a journey never restarts analysis or the curriculum. It offers:
  **Continue** / **Review last lesson** / **Review what I've learned**.
  Restarting is possible but always an explicit action.

## Review behavior

Review is active testing, not a recap:
- **Review last lesson** — 1–3 short questions on the most recent lesson.
- **Review what I've learned** — a short mixed review sampled from covered
  concepts, weighted toward weak, stale, and low-confidence areas.
- Review results update LearnerState exactly like normal assessments and may
  trigger remediation before advancing. Review never inflates coverage by itself.

## Progress semantics

Progress = goal-scoped curriculum coverage, not an intelligence score.
- In-scope concepts are those applicable to the chosen goal (plus adaptively
  added prerequisites). Each has a weight.
- Credit: 0 untaught · 0.5 taught-but-untested · 1.0 taught and assessed.
- Coverage % = weighted credit over the in-scope set.
- Mastery per concept is tracked separately and drives adaptation and review;
  it never moves the percentage. The UI says "42% covered", never "42% expert".
- Adding a prerequisite may dip the percentage slightly; the UI explains why.

## Non-goals (MVP)

- accounts / authentication, private repos, teams, billing
- embeddings / vector search
- code execution or sandboxes
- Redis, job queues, background workers
- analytics dashboards

## MVP vs later

**MVP (guaranteed path):** the full adaptive loop on one bundled demo repository
(precomputed snapshot + RepositoryModel), deployed and self-contained, with
durable resume and active review.

**Stretch (same build, if time remains):** live ingestion and analysis of an
arbitrary public GitHub repository.

**Later:** contribution exercises on real code, spaced repetition, issue/PR
awareness, IDE integration — see CLAUDE.md section 20.
