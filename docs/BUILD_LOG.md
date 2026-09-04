# Build Log

## Phase 0 — Think before coding (2026-09-03)

**What works:** Assignment analyzed against the master plan; plan re-scoped from
nine phases to seven (deploy 2nd, adaptive loop 3rd, Redis cut, video script
added). A–K proposal delivered. `docs/PRODUCT.md` and `docs/DECISIONS.md` drafted.

**What remains:** Everything buildable.

**Notable learning:** The original phase order risked failing the assignment's
explicit scoping test; transcripts make time spent visible, so over-scope is a
scoring risk, not just a schedule risk.

## Phase 1 — UX prototype with fixtures (2026-09-03)

**What works (all fixture-driven, no API, no DB):**
- Full shell: pine sidebar with recent journeys (computed coverage %, recency,
  active state), home screen with URL validation, style control, demo entry.
- Demo journey on expressjs/express: staged analysis → onboarding → lesson 1
  (prose + analogy + code excerpt with line numbers) → ≤3-question quiz →
  graded feedback → **visible adaptation with a real branch** (ordering wrong →
  remediation lesson on the layer stack; all right → router lesson).
- Coverage math is the real formula: goal-scoped weights, 0.5/1.0 credit, and a
  denominator that visibly grows when remediation pulls a concept into scope
  ("path grew" note in the header).
- Leave-and-return: localStorage persistence survives full reloads; resume
  screen offers Continue (remediation-aware) / Quick review / Broad review;
  demo has an explicit restart.
- Reviews are active: broad review samples the two weakest/stalest concepts
  (seeded fastapi journey at 64%); a wrong review answer redirects the path.
- 21 unit tests over coverage/grading/engine; typecheck, lint, prod build clean.
- Verified end-to-end in a real browser (Playwright): both branches, resume,
  broad review, sidebar state.

**What remains:** Deployment + CI (Phase 2), real Claude loop (Phase 3),
Postgres (Phase 4), live ingestion (Phase 5).

## Phase 2 — Walking-skeleton deployment + CI (2026-09-03)

**What works:**
- Live at https://understory-production-e6f9.up.railway.app (Railway project
  "understory", production env); `/api/health` returns ok.
- GitHub repo github.com/tomergafner/understory (private until submission).
- CI pipeline: checks (typecheck/lint/vitest/build) + e2e (Playwright smoke of
  the evaluator journey) gate a deploy job that runs `railway up --ci` on main
  and curls the health endpoint afterward.
- The 3-test smoke suite passes locally AND against production.
- Always-submittable invariant is now in force.

**What remains:** Phase 3 (real adaptive loop).

**Completed after token setup:** first CI run fully green (checks 
-> e2e -> deploy -> health verification). Custom domain understory.chat added
on Railway + Cloudflare (CNAME apex -> b9fduj14.up.railway.app, proxied);
waiting on Cloudflare Universal SSL issuance at time of writing.

**Notable failure/learning:**
- Railway project tokens can't be created with the CLI session token
  (projectTokenCreate → Not Authorized); dashboard-only. Everything else
  (rename, domain) worked via GraphQL with the CLI's accessToken.
- The plugin's railway-api.sh reads ~/.railway/config.json `.user.token`;
  current CLI stores `.user.accessToken`.

## Phase 3 — Real adaptive tutorial loop (2026-09-03)

**What works:**
- Three server routes (`/api/lesson`, `/api/assess`, `/api/review`) drive the
  loop with Claude (default model `claude-fable-5`, env-configurable), using
  `messages.parse` + zod structured outputs; the stable tutor system prompt is
  prompt-cached.
- Deterministic guardrails everywhere the model meets state: MC grading is
  application code and overrides the model; free-form is graded semantically;
  concept status mapping (misconception/understood/partial) is deterministic;
  an invalid nextConceptId falls back to the first untaught in-scope concept.
- Grade + next-step decision is ONE model call (halves loop latency).
- Fixture fallback: no API key or any model failure → the Phase 1 scripted
  engine serves the same response shape, marked `source: "fixture"` (UI shows
  a subtle "scripted" tag). CI stays deterministic; the demo survives outages.
- Concept summaries + per-concept code evidence added to fixtures so lessons
  stay grounded at any curriculum depth; reviews are MC-only by design
  (quick checks, deterministic grading).
- Client: calm loading narration, error + retry per §15, answers preserved on
  grading failure.
- 33 unit/route tests (incl. guardrails and schema-rejection fallback) +
  1 real-API smoke behind RUN_REAL_API; e2e passes in fixture mode.

**What remains:** ANTHROPIC_API_KEY on Railway (user, dashboard), then prod
verification of model mode. Then Phase 4 (Postgres persistence).

**Notable learning:**
- CLAUDE.md's `claude-fable-5-1` is not a real model ID; the correct current
  ID is `claude-fable-5` (per the API model catalog). Code defaults there.
- The e2e suite is only deterministic keyless; with a key configured the
  demo serves live model lessons, so prod content assertions don't apply.

**Notable failure/learning:**
- create-next-app's generated CLAUDE.md pointer clobbered the master
  instructions during scaffold move — caught immediately because Phase 0 was
  already committed. Commit early.
- Seeded journeys carry history in learner state, not step records; the
  "fresh journey" check had to consider conceptStatus, found via browser
  verification, fixed and covered by the flow.
- React Compiler lint pushed the store to useSyncExternalStore (better
  architecture anyway) and flags Date.now() even in submit handlers (wrapped).
