# Decisions

Material decisions only. Format: Decision / Why / Alternatives considered / Tradeoff.

---

## 001 — Thesis-first phase order with an always-submittable invariant (2026-09-03)

**Decision:** Deploy a walking skeleton in Phase 2 and build the real adaptive loop
(Phase 3) before persistence (Phase 4) and live ingestion (Phase 5, stretch). From
Phase 2 onward the deployed app must always be a valid submission.

**Why:** The assignment targets 1–2 hours (hard cap 8) and explicitly evaluates
scoping. Deployment and visible adaptation are the two things that cannot fail;
everything else upgrades the submission rather than gating it.

**Alternatives:** The original nine-phase order (persistence and ingestion before
the loop, deployment seventh).

**Tradeoff:** The loop initially runs on a lightweight store, so Phase 4 involves
some migration work that a persistence-first order would have avoided.

---

## 002 — No Redis in the MVP (2026-09-03)

**Decision:** Cut Redis entirely; it lives in future extensions.

**Why:** At take-home scale, caching and locking change nothing an evaluator can
see, while adding a service to provision and a failure mode to debug.

**Alternatives:** Redis for RepositoryModel caching keyed by repo+commit and a
duplicate-analysis lock.

**Tradeoff:** Until/unless needed, duplicate analysis of the same commit is
theoretically possible; a Postgres advisory lock or unique constraint covers it.

---

## 003 — Bundled demo repo is the guaranteed path; live ingestion is stretch (2026-09-03)

**Decision:** Bundle a precomputed snapshot + RepositoryModel for one demo
repository (expressjs/express). The evaluator journey never depends on live
GitHub access or a long-running analysis.

**Why:** The assignment's critical requirement is self-contained evaluation.
Live analysis is the least reliable component: rate limits, repo size, and
multi-minute model latency in front of a reviewer.

**Alternatives:** Live-analysis-first with the demo as a fallback.

**Tradeoff:** The stretch goal may not ship; the product would then teach one
repository brilliantly instead of any repository adequately — acceptable here.

---

## 004 — Two explicit state models instead of chat-transcript memory (2026-09-03)

**Decision:** A structured RepositoryModel (what must be understood) and a compact
LearnerState snapshot (what is understood), both schema-validated; each next step
is generated from both. History lives in append-only tutorial steps; the snapshot,
not a transcript, is what the model sees each turn.

**Why:** Transcripts bloat and drift. Explicit state is durable, cheap to prompt
with, resumable by loading one row, and makes adaptation auditable — you can point
at the answer that changed the path.

**Alternatives:** Long-context chat; retrieval over the transcript.

**Tradeoff:** More upfront schema design, and a snapshot can lose nuance that a
full transcript would retain.

---

## 005 — Coverage separated from mastery, with a coarse credit function (2026-09-03)

**Decision:** Progress % = weighted coverage of goal-scoped concepts with credit
0 / 0.5 (taught) / 1.0 (taught + assessed). Mastery and confidence are stored per
concept and drive adaptation and review, never the percentage.

**Why:** The number stays honest ("42% covered", not "42% expert"), stable, and
explainable. Reviews improve mastery without minting progress.

**Alternatives:** Mastery-weighted progress; per-question scoring.

**Tradeoff:** Quantized credit is coarse, and the denominator shifts slightly when
remediation adds prerequisites. Understandable beats precise.

---

## 006 — Durable browser identity, no authentication (2026-09-03)

**Decision:** A cookie/local identifier as the user identity, backed by Postgres
from Phase 4. The schema leaves room for a real user_id later.

**Why:** Resume and history are core product properties; authentication is not.
An evaluator should never have to create an account.

**Alternatives:** Full auth (e.g. NextAuth); no identity at all.

**Tradeoff:** Journeys are per-browser; clearing storage orphans them. Acceptable.

---

## 007 — Test pyramid scoped to the demo path (2026-09-03)

**Decision:** Unit tests for judgment-bearing deterministic code; API-route
integration tests with the Anthropic client mocked at the boundary (including
schema-rejection paths); a 3–6 test Playwright suite guarding only the evaluator
journey; GitHub Actions CI gates every deploy.

**Why:** End-to-end tests are the most expensive to maintain, so they protect the
one path that must never break. The schema-validation contract is the seam where
model output becomes application state — tests prove rejection works.

**Alternatives:** Broad e2e coverage; no e2e at all.

**Tradeoff:** Regressions outside the demo path can slip through CI; accepted at
this scale.

---

## 009 — Fixture fallback behind the same API (2026-09-03)

**Decision:** The three loop routes serve Claude-generated content when
`ANTHROPIC_API_KEY` is configured and fall back to the Phase 1 scripted engine
(same response shape, `source: "fixture"`) when it isn't or when a call fails.

**Why:** CI stays deterministic without a key; the demo survives API outages;
the UI needs one code path. The fallback is honest — the UI tags scripted
content.

**Alternatives:** Model-only with hard errors; separate fixture UI path.

**Tradeoff:** Fixture depth is limited to scripted concepts; an unscripted
concept without a key returns a clear 503.

---

## 010 — One model call for grading + next-step decision (2026-09-03)

**Decision:** `/api/assess` grades free-form answers, produces the assessment,
and decides the next concept in a single structured call.

**Why:** Halves the perceived latency of the loop's slowest moment, and the
decision sees the grading evidence directly instead of a summary of it.

**Alternatives:** Separate grade and plan calls.

**Tradeoff:** A schema failure loses both outputs at once — mitigated by the
deterministic fallback.

---

## 011 — Reviews are multiple-choice only (2026-09-03)

**Decision:** Review questions (quick and broad) are MC-only; grading is
deterministic application code.

**Why:** Reviews are quick retention checks, not essays; deterministic grading
keeps them instant and keeps `submitReview` client-side and testable.

**Alternatives:** Free-form reviews graded by the model.

**Tradeoff:** Less expressive retention evidence; acceptable — lessons carry
the free-form load.

---

## 012 — Model default corrected to claude-fable-5 (2026-09-03)

**Decision:** `ANTHROPIC_MODEL` defaults to `claude-fable-5`; CLAUDE.md's
`claude-fable-5-1` does not exist in the API catalog.

**Why:** The instruction's intent was "newest frontier model"; the env var
keeps it swappable without code changes. Effort defaults to `medium` for
interactive latency.

**Alternatives:** `claude-opus-4-8` (cheaper, faster).

**Tradeoff:** Fable costs ~2× Opus per token and thinks longer; per-lesson
cost is still cents at demo scale.

---

## 013 — Persistence: jsonb payloads + dual-write with local fallback (2026-09-03)

**Decision:** Four tables (users, journeys, steps, reviews). Keyed columns only
for what we query (user, repo, recency); learner state and step/review records
are jsonb. The client loads server-first and keeps localStorage as a
write-through cache and fallback; a failed sync degrades to local mode.

**Why:** The data structures are still expected to change (explicit product
constraint) — jsonb absorbs churn without migrations. The fallback satisfies
"the demo keeps working even if external services fail" and keeps CI
deterministic with no database.

**Alternatives:** Fully normalized schema; Prisma; server-only state with hard
errors.

**Tradeoff:** Can't query inside learner state with SQL (not needed yet);
local-mode writes are not synced back when the server returns (acceptable —
sessions are short; the server copy wins on next load).

---

## 008 — Demo repository: expressjs/express (2026-09-03)

**Decision:** Use expressjs/express as the bundled demo repository.

**Why:** Famous enough that an evaluator has instant context; small enough to
model honestly; the middleware pipeline is ideal material for analogies (airport
security checkpoints) and contrast with alternatives (Koa, Fastify) — both
pillars of the teaching philosophy.

**Alternatives:** fastapi/fastapi (bigger, moved to the sidebar-history fixture);
teaching this project's own repo (compelling later, circular now).

**Tradeoff:** A JavaScript-ecosystem repo assumes JS familiarity; acceptable for
a developer-evaluator audience.
