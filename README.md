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

Phase 1 — UX prototype with fixtures. The full learning loop runs on a bundled
demo repository (expressjs/express) with no API or database: lesson → quiz →
graded feedback → **visible adaptation** (a wrong answer about middleware
ordering reroutes the curriculum through a remediation lesson) → durable
resume and active review via localStorage.

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

`DATABASE_URL` arrives with Phase 4 (see CLAUDE.md §18).

## Docs

- `docs/PRODUCT.md` — product definition and progress semantics
- `docs/DECISIONS.md` — material decisions with tradeoffs
- `docs/BUILD_LOG.md` — per-phase state of the world
