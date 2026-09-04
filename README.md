# Understory

An adaptive tutor for unfamiliar GitHub repositories. Instead of summarizing a
codebase once, Understory teaches it the way a great teacher would: one small
concept at a time, grounded in real code, tested with at most three questions —
and the next lesson is chosen from what your answers reveal you actually
understand.

Built for the Anthropic SWE take-home (Theme 1: Exploration & Understanding).

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
npm run lint       # eslint src
npm test           # vitest: coverage math, grading, engine transitions
npm run build
```

## Environment variables

None required yet. Later phases add `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`,
`DATABASE_URL` (see CLAUDE.md §18).

## Docs

- `docs/PRODUCT.md` — product definition and progress semantics
- `docs/DECISIONS.md` — material decisions with tradeoffs
- `docs/BUILD_LOG.md` — per-phase state of the world
