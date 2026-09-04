CLAUDE CODE MASTER INSTRUCTIONS
Adaptive GitHub Repository Tutor — Anthropic SWE Take-Home

ROLE
You are my senior product/engineering pair programmer. Help me think, document, and build this project incrementally. Do not jump directly to a large implementation. The quality of the product idea, interaction, technical judgment, and scope matter more than feature count.

This is an Anthropic Software Engineering take-home. The intended submission should be compelling within a small amount of engineering time, deployed and immediately usable in a browser, with code on GitHub and a short design rationale. The project must have a self-contained demo path.

IMPORTANT WORKING STYLE
1. Work in phases.
2. At the beginning of each phase:
   - restate the objective,
   - identify the smallest useful implementation,
   - identify important tradeoffs,
   - tell me what you propose to change.
3. At the end of each phase:
   - run relevant tests/typechecks/lint/build,
   - from Phase 2 onward, deploy and verify the demo path in production,
   - give me a SHORT manual test checklist so I can verify the phase myself in the browser,
   - summarize exactly what changed,
   - identify remaining risks,
   - update the project documentation,
   - STOP and wait for my manual-testing feedback before beginning the next phase.
4. Do not silently make major product or architecture decisions.
5. Prefer a simple vertical slice over infrastructure breadth.
6. Avoid abstractions that are not yet needed.
7. If a feature does not strengthen the core adaptive-learning experience, push it to "later".
8. Preserve an understandable transcript of our reasoning. I need to submit my AI-development transcript, so make tradeoffs and decisions explicit rather than hiding them.
9. When you disagree with one of my ideas, say why and propose a simpler alternative.
10. Never expose secrets or API keys in code, logs, client bundles, screenshots, or committed files.
11. TIME BUDGET: target roughly 6 hours of build plus 1 hour for the rationale doc and video. The assignment targets 1-2 hours with a hard cap of 8 and explicitly evaluates scoping ability; report actual time honestly and treat scope cuts as part of the deliverable, not as failures.
12. ALWAYS-SUBMITTABLE INVARIANT: from Phase 2 onward, the deployed app must remain a valid submission at all times. Later phases upgrade the submission; none of them may leave it broken.

============================================================
1. PRODUCT IDEA
============================================================

Build a polished web application that teaches a user an unfamiliar public GitHub repository.

The home screen should be extremely simple:
- user can input a link to a GitHub repository URL, if not Github user should be indicated that other repos are not supported at the moment.
- one primary action such as "Learn this repo",
- options for level of tests (1 - multiple choice only, 2 - open questions, 3- combination)
- one subtle "Try the demo" path so an evaluator can use the product immediately.

The application should not merely summarize a repository.

THE TEACHING PHILOSOPHY BEHIND IT
This product applies how I learn best to the problem of understanding a large unfamiliar codebase:
1. Learn in small chunks, then ask yourself questions about what you just read and try to answer them.
2. Get tested before moving on — new concepts arrive only after the current ones are checked.
3. Use memorable analogies, and clear contrast with alternative repos/technologies, to make ideas stick.
4. A great teacher constantly gauges the student's understanding and dynamically adjusts the curriculum, methods, reviews, and pacing of new concepts.
The interaction rules in section 3 encode these principles. Lead with this framing in the rationale doc and the video.

The three core product properties are:
1. ADAPTIVE — the next lesson depends on demonstrated understanding.
2. DURABLE — the learner can leave and return later without losing progress/state.
3. PROGRESSIVE — the curriculum moves from conceptual understanding toward contribution readiness.

Its key idea is ADAPTIVE LEARNING:
A. The system builds a structured understanding of the repository.
B. The system builds and continuously updates a structured understanding of the learner.
C. Every next lesson is selected/generated from BOTH models.

The tutorial should move from high-level understanding toward contribution readiness:

LEVEL 1 — What is this?
- What problem does the project solve?
- Who uses it?
- What is the simplest mental model?
- What are the important nouns/entities?

LEVEL 2 — Basic usage
- How would I install/run/use it?
- What is the simplest useful flow?
- What inputs go in and what outputs come out?

LEVEL 3 — Configurable / advanced usage
- Important configuration.
- Common variations.
- What changes behavior materially?
- Important operational constraints.

LEVEL 4 — Architecture
- Major components.
- Control/data flow.
- Important boundaries and abstractions.
- Why the architecture plausibly looks this way.

LEVEL 5 — Design choices and tradeoffs
- Why did the maintainers likely choose these designs?
- What alternatives exist?
- What would become easier/harder with another design?
- Compare with similar projects only when it improves understanding.

LEVEL 6 — Critical code paths
- Read small, important excerpts from the actual repository.
- Ask what a function/module is doing.
- Ask why a decision is made here.
- Ask what assumptions or tradeoffs the code encodes.
- Do not dump large files into the UI.

LEVEL 7 — Contribution readiness
- Can the learner find where a behavior should be changed?
- Can the learner reason about the likely impact?
- Can the learner explain how they would fix a realistic issue?
- Can the learner identify tests or validation they would add?
- Later extension, NOT MVP: code-completion exercises using real code - on dedicated environments for the learner.

A learner may stop earlier depending on their goal.

LEARNING IS PERSISTENT, NOT A ONE-SHOT SESSION.
- A user should be able to leave and return later.
- Every repository-learning journey must preserve its tutorial history and learner state.
- Returning to a repository should resume from the learner's current state, not restart analysis or the curriculum.
- A learner may intentionally restart from the beginning, but this should be an explicit action.
- The product should feel more like an ongoing learning workspace than a generated report.

============================================================
2. USER / LEARNER MODEL
============================================================

The tutorial must maintain explicit learner state rather than relying on the entire chat transcript.

Initial learner configuration should be minimal. Prefer a fast onboarding after repository analysis:
- Goal:
  1. Understand what it does
  2. Learn to use/configure it
  3. Understand the architecture
  4. Become ready to contribute
- Optional experience/background
- Optional time budget
- Question style:
  - multiple choice
  - free form
  - mixed (default)

Do not turn onboarding into a long questionnaire.

Persist a compact learner model such as:
- user/session identity
- repository learning journey ID
- goal
- background summary
- question style preference
- current curriculum level
- concepts introduced
- mastery estimate per concept
- misconceptions
- code areas already examined
- recent assessment evidence
- confidence in the mastery estimate
- recommended next action
- last completed lesson/step
- last active timestamp
- review history
- resume preference when known

The learner state should be UPDATED from evidence after every test.

The model should distinguish:
- "not yet taught"
- "taught but untested"
- "understood"
- "partially understood"
- "misconception detected"

Do not reduce the entire learner to a single score.

RETURNING / RESUMING A LEARNING JOURNEY
When a user opens a repository they previously studied, do not immediately continue blindly.

Offer a very small resume choice, for example:
1. Continue where I left off
2. Quick review of the last lesson
3. Review what I've learned so far

Optional later action:
4. Restart this repository

Review should be ACTIVE, not just a recap.
- "Quick review" should test the most recent lesson with 1-3 short questions before continuing.
- "Review what I've learned" should sample previously covered concepts, prioritizing:
  - weak or partially understood concepts,
  - concepts not tested recently,
  - important prerequisites,
  - areas where confidence is low.
- Review results update LearnerState exactly like normal assessments.
- If review exposes a misconception, the next lesson may remediate it before progressing.
- Do not ask the learner to reread everything by default.

The system should know the difference between:
- progress through the repository curriculum,
- current mastery,
- review activity.

============================================================
3. INTERACTION LOOP — THE CORE PRODUCT
============================================================

One tutorial step should feel focused and calm.
The step structure below is the teaching philosophy from section 1 made concrete: one small chunk, an active test, then adaptation.

Each step:
1. Present ONE coherent concept.
2. Keep the explanation short enough. Max 2 - 3 paragraphs. Use clear common analogies. 
3. Ground claims in the repository.
4. When useful, show a small code excerpt with filename and line range.
5. Give a test of MAXIMUM 3 questions.
6. Grade the response.
7. Explain important mistakes briefly.
8. Update learner state.
9. Decide whether to:
   - advance,
   - reinforce,
   - remediate,
   - or revisit a prerequisite.
10. Generate/select the next concept based on repository state + learner state + goal.

The application should make adaptation VISIBLE.
For example, after an answer:
- "You understand the request flow, but the ownership of retry behavior is still unclear. We'll inspect that before moving deeper."

That visible adaptation is more important than a fancy progress bar.

PROGRESS INDICATOR
Show a simple percentage so the learner has a sense of how far they have progressed toward their selected goal.

The percentage should represent CURRICULUM COVERAGE TOWARD THE USER'S GOAL, not a fake "intelligence score".

Recommended approach:
- RepositoryModel defines weighted curriculum concepts / milestones.
- The user's goal determines which milestones are in scope.
- Progress = weighted coverage of in-scope concepts that have been meaningfully taught.
- Mastery is stored separately and can affect whether a concept is revisited.
- A concept that was merely shown should not necessarily count the same as one that was taught and assessed.
- Keep the number understandable; avoid false precision.
- UI may show e.g. "42% covered" rather than implying "42% expert".

If the adaptive path adds a necessary prerequisite, the denominator may change slightly. Prefer stability and understandable behavior over mathematically perfect precision.

MULTIPLE CHOICE
- Prefer deterministic grading when the correct answer is known.
- Still allow the model to explain why the selected answer is right/wrong.

FREE FORM
- Grade semantically.
- Require structured output from the model.
- Store a short evidence-based assessment, not chain-of-thought.
- Do not present the model's private reasoning.

Suggested assessment object:
{
  "mastery": 0.0-1.0,
  "concepts_demonstrated": [],
  "misconceptions": [],
  "missing_points": [],
  "feedback": "...",
  "recommended_action": "advance|reinforce|remediate",
  "confidence": 0.0-1.0
}

============================================================
4. REPOSITORY UNDERSTANDING
============================================================

Do not solve repository understanding by blindly sending every file to the model on every turn.

Build a reusable REPOSITORY MODEL once per commit/revision and then retrieve only the context needed for a tutorial step.

Suggested durable RepositoryModel:
- repository URL
- owner/name
- branch
- commit SHA
- project description
- primary languages/frameworks
- README / docs summary
- setup and basic usage
- important configuration
- architecture components
- major flows
- important directories/files
- entrypoints
- critical code paths
- important abstractions
- inferred design tradeoffs (clearly marked as inference)
- comparison axes with similar projects
- suggested curriculum concepts
- curriculum concept IDs
- curriculum ordering / prerequisite relationships
- curriculum weight / importance
- goal applicability for each concept
- contribution-readiness areas
- repository evidence for each important claim

IMPORTANT:
Separate observed facts from inferred intent.
Example:
- Observed: "Requests are enqueued in X and processed in Y."
- Inference: "This may have been chosen to isolate latency/failure."

Never tell the learner that an inferred motivation is definitely what the maintainers intended.

For code evidence, store references to:
- path
- line range
- commit SHA
- small excerpt or content hash

============================================================
5. REPOSITORY INGESTION STRATEGY
============================================================

MVP supports PUBLIC GitHub repositories only.

Normalize and validate the GitHub URL.

Reasonable safety/resource limits:
- github.com only for MVP
- cap repository/archive size
- cap file count and total text bytes
- ignore binaries
- ignore generated/build/vendor/dependency directories
- ignore huge lockfiles unless specifically needed
- protect archive extraction from path traversal
- do not execute repository code
- do not run arbitrary install scripts

Prefer a two-stage understanding process:

STAGE A — Deterministic repository snapshot
Collect:
- metadata
- commit SHA
- directory tree
- README/docs
- common manifests
- obvious entrypoints
- language statistics if easy

STAGE B — Model-guided analysis
Give Claude the tree + high-value seed files, then allow it to inspect additional files using a SMALL set of server-side read-only tools such as:
- list_directory(path)
- read_file(path, start_line?, end_line?)
- search_repository(query)

The model should use those tools to produce the structured RepositoryModel.

This is preferable to stuffing an arbitrary repository into one prompt and gives us a strong technical story:
"The model actively inspects the codebase, but the application controls the filesystem interface, size limits, and durable representation."

If tool-based analysis is too much for the first vertical slice, first implement a constrained repository-size path and add tools second.

DO NOT implement a vector database in the MVP unless retrieval quality proves we need it.
A repository tree + keyword/code search + structured RepositoryModel is probably sufficient for a take-home.

============================================================
6. CLAUDE / ANTHROPIC API
============================================================

Use the Anthropic API from the server only.

The model must be configurable through an environment variable:
ANTHROPIC_MODEL=claude-fable-5-1

At the time these instructions were written, Claude Fable 5.1 is the newest generally available Anthropic frontier model. Do not scatter the model ID through the code.

Verify the exact model ID against the Anthropic API before first use (the correct ID may be e.g. "claude-fable-5" rather than "claude-fable-5-1"). Fail loudly at startup on an invalid model rather than at the first user request; the env var makes it correctable without code changes.

Use structured outputs / JSON schema where appropriate for:
- RepositoryModel
- lesson step
- quiz
- answer assessment
- learner-state update
- next-step decision

Do not allow arbitrary model prose to become application state when structured state is required.

PROMPT CONTEXT FOR GENERATING THE NEXT STEP
The next-step call should receive the minimum useful context:
1. Tutorial objective / pedagogical rules
2. Compact RepositoryModel
3. Current learner state
4. Recent step and assessment
5. Selected repository evidence/code excerpts relevant to the candidate next concept
6. User's goal/question-style preference

Do NOT resend the entire prior conversation by default.

Consider prompt caching for stable repository context later if it materially reduces latency/cost.

============================================================
7. IMPORTANT MODEL BOUNDARIES
============================================================

Use Claude for tasks that require semantic judgment:
- repository synthesis
- deciding educational sequencing
- generating explanations
- generating good conceptual questions
- grading free-form responses
- diagnosing misconceptions
- adapting the next step

Use deterministic application code for:
- GitHub URL validation
- repository download/read limits
- persistence
- session management
- multiple-choice answer matching
- permission/security boundaries
- state transitions that should not be probabilistic
- data validation
- caching keys
- deployment/configuration

============================================================
8. PROPOSED TECHNICAL STACK
============================================================

Optimize for one-repo take-home simplicity.

Preferred baseline:
- TypeScript
- Next.js full-stack application
- Tailwind CSS
- a small accessible component system such as shadcn/ui if useful
- Anthropic TypeScript SDK
- PostgreSQL on Railway (introduced only in Phase 4, after the adaptive loop is proven)
- GitHub-hosted source
- GitHub Actions CI + Railway automatic deployment from GitHub

NO REDIS IN THE MVP.
At take-home scale Redis adds a service to provision and a failure mode to debug while changing nothing an evaluator can see. It moved to section 20 (future extensions). If duplicate-analysis protection is ever needed in the MVP, use a Postgres advisory lock or unique constraint instead.

Do NOT split into microservices for the sake of architecture.

Preferred deployment:
- one web application service (deployed from Phase 2 onward)
- Railway Postgres (from Phase 4 onward)
- add a separate worker only if repository analysis demonstrably requires background-job isolation

POSTGRES = durable source of truth.
Possible tables/entities:
- users (or a minimal anonymous/browser identity for the take-home)
- repositories
- repository_snapshots
- repository_analyses
- learning_journeys
- learner_states
- tutorial_steps
- quiz_attempts
- review_attempts

A learning_journey represents one user's durable learning history for one repository/goal.
For the take-home, avoid building complex authentication unless necessary. A durable browser/session identity is acceptable for demonstrating resume behavior, as long as the architecture clearly supports a real user account later.

Keep the schema small.

============================================================
9. UI / PRODUCT TASTE
============================================================

The app should feel like a focused learning product, not an admin dashboard.

OVERALL LAYOUT
Use a clean, minimal layout inspired by the interaction model of modern LLM products, without copying any specific product.

Desktop:
- narrow left sidebar
- large calm main learning area
- very little visual chrome

LEFT SIDEBAR
The sidebar is the learner's history/navigation.
Show recent repository learning journeys, similar to how common LLM interfaces show recent chats.

Each item should be recognizable at a glance:
- repo name, e.g. "fastapi/fastapi"
- subtle progress percentage
- optional last-active recency

Behavior:
- click a repo to reopen that learning journey
- selected repo is visually clear but understated
- most recent journeys first
- allow sidebar collapse if easy
- do not turn it into a project-management dashboard
- no dense metadata, badges, charts, or nested navigation

HOME / NEW REPO
When no journey is selected:
- generous whitespace
- concise one-line explanation
- one GitHub URL input
- one primary button
- question/test-style control
- small demo option
- recent repos remain available in the sidebar
- no feature-grid clutter

ANALYSIS
- clear progress/status without pretending to know exact percentages for repository ingestion
- examples: "Reading project structure", "Finding important flows", "Building your learning path"

TUTORIAL
Main reading area:
- small repository context/header
- concept title
- concise explanation
- optional code excerpt
- repository path/link
- quiz directly beneath

Persistent lightweight controls:
- curriculum coverage percentage
- user's target/goal
- optional "Review" action
- optional compact "What I think you know" drawer
- do not show raw JSON state

RETURNING TO A REPO
If the journey already has learning history, show a minimal resume state rather than the new-repo onboarding:
- "Continue"
- "Review last lesson"
- "Review what I've learned"

Do not force a modal if an inline choice feels cleaner.

Feedback:
- immediate
- specific
- non-patronizing
- visibly explains why the path is adapting

Design mobile reasonably, but optimize reviewer experience for desktop first.

Accessibility:
- keyboard accessible
- visible focus
- semantic controls
- reasonable contrast

============================================================
10. SELF-CONTAINED DEMO MODE — REQUIRED
============================================================

The evaluator must not need to find a suitable repository.

Create a one-click demo path.

Best option:
- Bundle/precompute a repository snapshot + RepositoryModel fixture for one compelling example repo.
- Ideally the project can even teach its own repository once mature, but the demo must not depend on a live external analysis succeeding.

The demo should enter the tutorial quickly and showcase:
1. explanation,
2. question,
3. answer,
4. visible adaptation,
5. progress changing,
6. a later code-reading step if practical.

If practical, the demo fixture should also make resume/history behavior easy to demonstrate:
- complete one step,
- navigate away or select another repo,
- return from the sidebar,
- resume or review without losing state.

The demo is a product requirement, not test data hidden from users.

============================================================
11. TAKE-HOME SCOPE
============================================================

The complete product vision is larger than the take-home.
The take-home MVP should prove ONE loop extremely well:

GitHub URL
  -> repository understanding
  -> durable learning journey
  -> user goal
  -> concept
  -> <=3-question assessment
  -> learner-state update
  -> progress update
  -> visibly adapted next concept
  -> leave
  -> return from recent-repo history
  -> continue or review from persisted state

The bundled demo repo runs this exact loop and is the GUARANTEED evaluator path.
Teaching an arbitrary live GitHub URL is the Phase 5 stretch upgrade of the same loop, not a prerequisite for submission.

A compelling vertical slice beats:
- full account/authentication flows (but persistence/resume itself IS core)
- teams
- billing
- private repos
- embeddings
- complex job infrastructure
- issue tracker integrations
- contribution PR creation
- code execution
- sandboxed builds
- elaborate analytics

Those belong in "With more time".

============================================================
12. WHAT MAKES THIS INTERESTING / NON-OBVIOUS
============================================================

Preserve these ideas in the design rationale:

1. Static repo explainers optimize for the repository.
   This product optimizes for the relationship between the repository AND the learner.

2. The system has two evolving state models:
   - RepositoryModel: what must be understood.
   - LearnerState: what this person currently understands.

3. The tutorial is not pre-generated end-to-end.
   It is planned progressively because the correct next lesson depends on evidence from the previous answer.

4. Code is not merely summarized.
   At deeper levels, code becomes assessment material.

5. "Ready to contribute" is a concrete terminal learning objective:
   the learner should be able to locate a change, reason about consequences, and propose validation.

6. The product can stop at different depths based on the user's goal.

7. Learning is longitudinal.
   The learner can return days later, review weak concepts, and continue from durable evidence rather than restarting from a fresh chat.

8. Progress and mastery are intentionally separate.
   Coverage tells the learner how much of the goal-specific curriculum has been traversed; mastery determines where adaptation or review is needed.

9. The feature set is derived from an explicit teaching philosophy (section 1) — small chunks, self-testing before advancing, memorable analogies with contrast to alternatives, and continuous assessment that reshapes the curriculum — not from a feature checklist.

============================================================
13. COST / LATENCY DISCIPLINE
============================================================

Repository analysis can be expensive.

Design for:
- analysis once per commit SHA
- reuse across learners
- durable learning journeys across visits
- compact durable RepositoryModel
- compact durable LearnerState
- only relevant excerpts on each lesson turn
- caching
- streaming model output where it improves perceived latency

Track enough metadata to understand:
- model used
- input/output token usage
- analysis latency
- tutorial-step latency

Do not build a full analytics system for the MVP.

============================================================
14. DURABLE HISTORY, IDENTITY, RESUME, AND REVIEW
============================================================

This is a core product requirement.

The learner should see a recent-repository history in the left sidebar and be able to return to any learning journey.

For the take-home:
- do not spend significant time on production authentication unless it becomes necessary,
- it is acceptable to use a durable anonymous/browser identity stored in a cookie/local identifier and backed by Postgres from Phase 4 (a lightweight local store is acceptable before then),
- design the schema so a real authenticated user_id can replace/augment this later.

A durable learning journey should preserve:
- repository + commit analyzed
- selected learning goal
- test/question preference
- current curriculum position
- all completed tutorial steps
- assessment evidence
- mastery/misconception state
- progress/coverage
- review history
- last active timestamp

RECENT REPOS SIDEBAR
- load the user's recent learning journeys
- order by last active
- show repo name and subtle progress
- selecting one restores the journey
- do not re-run repository analysis if the same analyzed commit is already available

RESUME OPTIONS
On return:
- Continue: proceed from the current recommended next action.
- Review last lesson: generate/test 1-3 questions focused on the most recent lesson, then update state.
- Review what I've learned: generate a short mixed review sampled from prior important concepts, weighted toward weak/stale/low-confidence areas.

Review is part of learning, not a separate quiz product.
After review, the adaptive planner decides whether to:
- continue,
- reinforce,
- remediate,
- or revisit a prerequisite.

Progress percentage must remain understandable through review:
- reviews do not directly increase coverage just because they occurred,
- they may improve mastery/confidence,
- remediation may delay advancing coverage.

============================================================
15. FAILURE STATES
============================================================

Handle a few failures gracefully:
- invalid/non-GitHub URL
- private repo
- repo not found
- repo too large
- unsupported/empty repo
- GitHub rate limit
- Anthropic API error
- model response failing schema validation

The UI should give a useful retry/recovery path.

Do not build exhaustive enterprise reliability.

============================================================
16. DOCUMENTATION TO MAINTAIN AS WE WORK
============================================================

Create/update these files only if they remain useful:

README.md
- what the product is
- how to run
- environment variables
- deployment notes

docs/PRODUCT.md
- user problem
- target user
- core experience
- durable history/resume behavior
- review behavior
- progress semantics
- non-goals
- MVP vs later

docs/ARCHITECTURE.md
- data flow
- model boundaries
- persistence
- important interfaces
- simple Mermaid diagram if useful

docs/DECISIONS.md
For material decisions, add a short entry:
- Decision
- Why
- Alternatives considered
- Tradeoff

docs/BUILD_LOG.md
Keep this concise:
- phase completed
- what works
- what remains
- notable failure/learning

docs/TAKEHOME_RATIONALE.md
Evolve this during development so the final write-up is easy.
Include:
- why Exploration & Understanding
- why this particular problem
- what is non-obvious
- key decisions/tradeoffs
- what I would extend
- approximate time spent (I will provide final time)

docs/VIDEO_SCRIPT.md
The assignment REQUIRES a ~5-minute self-recorded rationale video in addition to the written doc.
- shot-by-shot script I can read/record from, drafted in Phase 7
- structure: teaching-philosophy hook (~45s) -> live demo following the evaluator journey (~2.5 min) -> key decisions and tradeoffs (~1 min) -> "with more time" + honest time spent (~45s)
- written to be spoken aloud over a screen recording, not a slide deck

Do not generate pages of documentation that nobody will read.

============================================================
17. TESTING STRATEGY
============================================================

Prioritize tests around judgment-bearing deterministic code:
- GitHub URL parsing/normalization
- file filtering and size limits
- safe path handling
- state transitions
- resume/review state restoration
- curriculum coverage/progress calculation
- multiple-choice grading
- schema validation
- caching key by repo+commit
- critical API route behavior

For model-dependent behavior:
- use fixture responses for deterministic application tests
- keep 1-2 optional real API smoke tests outside normal test runs
- do not assert exact model prose

UI TESTING
- keep a SMALL Playwright end-to-end suite (roughly 3-6 tests) covering only the critical evaluator journey: home -> demo -> lesson -> answer -> visible adaptation -> leave -> return -> resume/review
- run it headless in CI and before declaring a phase complete
- assert on user-visible behavior and accessible roles/names, not pixels or internal markup
- the suite exists to protect the demo path, not to maximize coverage

API TESTING
- integration tests for critical API routes with the Anthropic client mocked at the boundary using fixture responses
- test error paths explicitly: invalid URL, model output failing schema validation, upstream API error
- prove the contract: no structured model output becomes application state without passing schema validation, and tests demonstrate rejection works

Before each phase is declared complete:
- typecheck
- lint
- relevant tests
- Playwright smoke of the demo path (once it exists)
- production build
- a short manual test checklist handed to me to run in the browser

============================================================
18. AUTOMATIC DEPLOYMENT
============================================================

Target:
GitHub push -> CI (GitHub Actions) -> Railway deploy automatically.

CI/CD BEST PRACTICES
- one GitHub Actions workflow, run on every push/PR: typecheck, lint, unit + API tests, production build, Playwright smoke of the demo path
- deploy only from main, and only after CI is green
- run Postgres migrations as part of the deploy (from Phase 4 onward)
- verify the health endpoint after each deploy
- do not build multi-environment promotion or release management for the take-home

Keep all configuration in environment variables.
Likely variables:
- ANTHROPIC_API_KEY
- ANTHROPIC_MODEL
- DATABASE_URL (from Phase 4 onward)
- optional GITHUB_TOKEN for higher API limits if needed

Never commit secrets.

Use migrations for Postgres.

Ensure there is a basic health endpoint or equivalent so deployment failures are diagnosable.

============================================================
19. BUILD PHASES
============================================================

PHASE ORDERING RATIONALE
Phases are ordered so the thesis (the adaptive loop) is proven and deployed as early as possible. Deployment comes second, not seventh: if time runs out at any point after Phase 2, there is still a complete, deployed, demo-mode submission. Persistence and live ingestion UPGRADE the submission; they do not gate it.

END-OF-PHASE RITUAL — applies to EVERY phase:
1. Run typecheck, lint, relevant tests, and production build.
2. From Phase 2 onward: deploy, then verify the health endpoint and demo path in production.
3. Give me a SHORT manual test checklist (5-10 steps) so I can verify the phase myself in the browser.
4. Summarize exactly what changed and the remaining risks.
5. Update the project documentation.
6. STOP and wait for my manual-testing feedback before beginning the next phase.

PHASE 0 — THINK BEFORE CODING
Do not modify application code yet.

Tasks:
1. Read these instructions.
2. If the take-home assignment text/PDF is in the repo, read it.
3. Challenge the product concept.
4. Identify the strongest 2-3 interaction ideas.
5. Identify what would make this look like a generic "AI repo summarizer" and how we avoid that.
6. Propose the smallest compelling evaluator journey.
7. Propose a realistic MVP scope.
8. Draft PRODUCT.md and DECISIONS.md.
9. Show me the proposal and STOP.

PHASE 1 — UX PROTOTYPE WITH FIXTURES
Goal: prove the experience before GitHub/API/infrastructure.

Build:
- polished shell with minimal left sidebar
- recent repository-learning history fixture
- polished home/new-repo screen
- demo repo button
- tutorial screen
- fixture RepositoryModel
- fixture LearnerState
- fixture learning journey/history
- one concept
- quiz
- answer -> visible adaptation -> second concept
- visible curriculum coverage percentage
- navigate away and return to the repo
- resume choice: Continue / Review last lesson / Review what I've learned

No real Anthropic API yet if it slows us down.
No database dependency.
Make the interaction delightful.
Complete the end-of-phase ritual (local verification only; deployment arrives next phase).

PHASE 2 — WALKING-SKELETON DEPLOYMENT + CI
Goal: the fixture prototype live on the internet, protected by CI, before any deeper features.

Configure:
- GitHub repository
- GitHub Actions CI: typecheck, lint, tests, production build, Playwright smoke of the demo path
- Railway web service with automatic deployment from main after CI is green
- basic health endpoint
- no database, no Redis

Verify the demo path manually in production.
From here on, the always-submittable invariant applies.
Complete the end-of-phase ritual.

PHASE 3 — REAL ADAPTIVE TUTORIAL LOOP
This is the most important phase. Run the real loop against the BUNDLED DEMO REPO's fixture RepositoryModel — no live ingestion yet.

Implement real:
- lesson generation
- <=3 questions
- answer grading
- LearnerState update
- next-step decision
- selected repository/code evidence
- visible adaptation message
- goal-scoped curriculum coverage calculation
- quick review of last lesson
- broader review sampled from prior concepts
- review-driven remediation when needed

Constraints:
- Anthropic API server-side only; all structured outputs schema-validated
- learner state may live in a lightweight store (localStorage or a simple server-side store) until Phase 4
- API-route integration tests with fixture model responses; 1-2 optional real API smoke tests
- test both multiple choice and free form

Complete the end-of-phase ritual.

PHASE 4 — PERSISTENCE (POSTGRES)
Add the minimum Postgres schema required to persist:
- repository analysis
- durable per-user/per-browser learning journey
- learner state
- tutorial steps / attempts
- review attempts
- last active / resume position

Implement recent-repository history retrieval for the sidebar.
Implement reopening a journey with its exact learner state and progress.
Run migrations in CI/deploy.
Keep the fixture demo working even if external services fail.
Complete the end-of-phase ritual.

PHASE 5 — LIVE GITHUB INGESTION + ANALYSIS (STRETCH GOAL)
Start this only if the deployed adaptive loop is solid and time remains.

Ingestion:
- URL validation
- public repo ingestion
- commit SHA
- file tree/snapshot
- filtering/limits
- no code execution

Analysis:
- deterministic repository snapshot
- a constrained set of relevant seed files
- structured RepositoryModel output
- add read-only model tools (list_directory, read_file, search_repository) only if time clearly remains

Validate all structured output.
Persist by repo + commit SHA.
Show a real repository being ingested and taught.
Complete the end-of-phase ritual.

PHASE 6 — TAKE-HOME POLISH
Focus on evaluator journey, not new infrastructure.

Polish:
- empty/loading/error states, including the failure states in section 15
- concise copy
- recent-repo sidebar/history
- resume/review interaction
- progress indicator clarity
- code excerpt readability
- keyboard/accessibility
- visible adaptation
- demo speed
- one compelling deeper code-reading example

Add only features that strengthen the core thesis.
Update TAKEHOME_RATIONALE.md with actual tradeoffs.
Complete the end-of-phase ritual.

PHASE 7 — SUBMISSION PACKAGE
Do not add features.

Review as an Anthropic interviewer:
- Is the idea obvious within 30 seconds?
- Can it be evaluated without reviewer-supplied data?
- Does it demonstrate taste?
- Does it handle complexity gracefully?
- Does adaptation actually change behavior?
- Can I leave a repo, return from history, and continue without losing learner state?
- Is the progress percentage meaningful and explainable?
- Does review actually test retained understanding rather than just summarize?
- Does the code show good judgment?
- Are limitations explicit?
- Can I explain every major decision?
- Does the AI transcript show that I directed the project rather than merely accepted generated output?

Produce:
1. prioritized final fixes only,
2. suggested 5-minute demo sequence,
3. concise written-rationale outline,
4. docs/VIDEO_SCRIPT.md — the shot-by-shot ~5-minute video script per section 16; reserve 30-45 minutes to actually record it,
5. "with more time" list,
6. exact known limitations,
7. reminder to export and attach the AI transcripts.

STOP.

============================================================
20. FUTURE EXTENSIONS — DO NOT BUILD FOR TAKE-HOME UNLESS AHEAD
============================================================

Potential extensions:
- Redis caching (RepositoryModel by repo + commit SHA) and duplicate-analysis locking — cut from the MVP
- private GitHub repositories / OAuth
- organization knowledge
- spaced repetition
- embeddings / semantic code retrieval
- issue/PR awareness
- test execution in secure sandboxes
- generated contribution exercises
- "complete this missing line/function" assessments
- learner writes a patch and explains it
- compare learner patch with project tests/style
- team onboarding curricula
- human-maintainer annotations
- curriculum sharing
- branch/commit-aware learning paths
- IDE integration

The deepest future assessment:
Give the learner a carefully selected real code location with a small section removed or a realistic issue. Ask them to complete/propose the change and explain the tradeoffs. Evaluate correctness, repository conventions, side effects, and tests. This is strong evidence of contribution readiness, but it is explicitly later scope.

============================================================
21. FIRST RESPONSE TO ME
============================================================

Do NOT code yet.

Start by answering:

A. Restate the product in one paragraph.
B. What is the strongest non-obvious insight?
C. What are the three biggest ways this could become a mediocre take-home?
D. What is the smallest end-to-end evaluator journey that proves the idea?
E. Which parts of my proposed infrastructure should NOT be built until later, and why?
F. Propose the data model for RepositoryModel, LearningJourney, and LearnerState.
G. Define precisely how curriculum coverage percentage should be calculated and explain its limitations.
H. Propose the exact Phase 1 fixture/demo interaction, including sidebar history, leave-and-return, Continue, Review last lesson, and Review what I've learned.
I. Propose 3 product names, but do not spend meaningful time on naming.
J. Draft docs/PRODUCT.md and the first entries for docs/DECISIONS.md.
K. Then STOP. Do not implement until I tell you to proceed.

END OF INSTRUCTIONS
