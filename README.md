# Understory

An adaptive tutor for unfamiliar GitHub repositories. Instead of summarizing a
codebase once, Understory teaches it the way a great teacher would: one small
concept at a time, grounded in real code, tested with at most three questions —
and the next lesson is chosen from what your answers reveal you actually
understand.

Built for the Anthropic SWE take-home (Theme 1: Exploration & Understanding).

**Live**: https://understory.chat — click "Try the demo".
(Direct Railway URL: https://understory-production-e6f9.up.railway.app)

## Current state

The full product loop is live: paste any public GitHub repository and a
**two-stage analysis** starts learning in ~20 seconds — a README-based starter
curriculum first, while Claude reads the code agentically in the background
and upgrades the curriculum in place. Lessons are generated per concept,
grounded in real code evidence, graded (multiple-choice deterministically,
free-form semantically), and every next step is decided from the learner's
demonstrated understanding. Journeys persist in Postgres behind an anonymous
cookie identity, resumable across visits with active review of weak concepts.
A bundled demo (expressjs/express) runs the same loop with a scripted fallback
so it works even without any external service.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000 → click "Try the demo"
```

Checks:

```bash
npm run typecheck
npm run lint            # eslint src
npm test                # vitest: coverage math, grading, engine transitions
npm run build
npx playwright test     # 3-test evaluator-journey smoke (builds + serves itself)
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests,
build, and the Playwright smoke on every push/PR. Pushes to `main` then deploy
to Railway (`railway up --ci`) and verify the production health endpoint.
Requires the `RAILWAY_TOKEN` secret and `HEALTH_URL` variable on the repo.

## Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | For live tutoring | — | Without it, the app serves the scripted fixture demo (marked "scripted" in the UI) |
| `ANTHROPIC_MODEL` | No | `claude-fable-5` | Server-side only |
| `ANTHROPIC_EFFORT` | No | `medium` | `low` / `medium` / `high` |
| `DATABASE_URL` | For durable journeys | — | Without it, journeys live in the browser only (localStorage) |
| `GITHUB_TOKEN` | Strongly recommended | — | Raises GitHub API limits from 60/hr (per server IP!) to 5,000/hr for live-repo analysis |

## Docs

- `docs/PRODUCT.md` — product definition and progress semantics
- `docs/DECISIONS.md` — material decisions with tradeoffs
- `docs/BUILD_LOG.md` — per-phase state of the world
