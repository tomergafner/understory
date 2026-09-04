import type { CodeExcerpt, Lesson, Question, RepositoryModel } from "../types";

// Fixture for the pre-existing sidebar journey — proves history/resume at a glance.
// Excerpts approximate the real source; Phase 5 replaces fixtures with pinned reads.

export const fastapiModel: RepositoryModel = {
  id: "fastapi",
  repoUrl: "https://github.com/fastapi/fastapi",
  owner: "fastapi",
  name: "fastapi",
  commitLabel: "0.111.0 (fixture)",
  description: "FastAPI framework, high performance, easy to learn, fast to code",
  languages: ["Python"],
  concepts: [
    { id: "what-is-fastapi", title: "What FastAPI is", summary: "A Python web framework where type hints drive validation, serialization, and docs.", level: 1, weight: 2, goals: ["understand", "use", "architecture", "contribute"], prerequisites: [] },
    { id: "path-operations", title: "Path operations", summary: "Decorated functions bound to method+path; typed parameters are matched and converted from the request.", level: 2, weight: 3, goals: ["understand", "use", "architecture", "contribute"], prerequisites: ["what-is-fastapi"] },
    { id: "pydantic-validation", title: "Pydantic models as contracts", summary: "Request/response bodies validate against Pydantic models; failures 422 before handlers run.", level: 2, weight: 3, goals: ["use", "architecture", "contribute"], prerequisites: ["path-operations"] },
    { id: "async-endpoints", title: "Sync vs async endpoints", summary: "async def runs on the event loop; plain def is offloaded to a threadpool so blocking I/O doesn't stall.", level: 3, weight: 2, goals: ["use", "architecture", "contribute"], prerequisites: ["path-operations"] },
    { id: "dependency-injection", title: "Dependency injection", summary: "Handlers declare needs via Depends(); a per-request resolver walks the dependency tree with caching.", level: 4, weight: 3, goals: ["architecture", "contribute"], prerequisites: ["path-operations"] },
    { id: "routing-groups", title: "Routers and composition", summary: "APIRouter groups path operations; include_router composes them with shared prefixes and dependencies.", level: 4, weight: 2, goals: ["architecture", "contribute"], prerequisites: ["path-operations"] },
    { id: "openapi-docs", title: "OpenAPI generation", summary: "The OpenAPI schema is generated from the same type declarations that drive validation.", level: 4, weight: 2, goals: ["use", "architecture", "contribute"], prerequisites: ["pydantic-validation"] },
    { id: "middleware-cors", title: "Middleware and CORS", summary: "Starlette middleware wraps the whole app; CORS is a stock middleware configured per-origin.", level: 3, weight: 2, goals: ["use", "architecture", "contribute"], prerequisites: ["path-operations"] },
    { id: "background-tasks", title: "Background tasks", summary: "BackgroundTasks queues work to run after the response is sent, on the same worker.", level: 3, weight: 2, goals: ["use", "architecture", "contribute"], prerequisites: ["path-operations"] },
  ],
};

export const fastapiEvidence: Record<string, CodeExcerpt> = {
  "routing-groups": {
    path: "fastapi/routing.py",
    startLine: 1236,
    endLine: 1250,
    code: `def include_router(
    self,
    router: "APIRouter",
    *,
    prefix: str = "",
    dependencies: Optional[Sequence[params.Depends]] = None,
    # ...
) -> None:
    for route in router.routes:
        # each route is re-registered with the combined prefix
        # and merged dependencies
        self.add_api_route(
            prefix + route.path,
            route.endpoint,
            # ...
        )`,
  },
};

export const fastapiLessons: Record<string, Lesson> = {
  "dependency-injection": {
    conceptId: "dependency-injection",
    title: "Dependencies: declared needs, injected values",
    kicker: "Level 4 · Architecture",
    paragraphs: [
      "A FastAPI endpoint doesn't fetch what it needs — it declares it. Like a dish on a menu listing its ingredients, a path operation writes Depends(get_db) or Depends(current_user) in its signature, and the kitchen — FastAPI's dependency resolver — gathers everything before the handler runs.",
      "The resolution happens per request in solve_dependencies: each dependency can itself declare sub-dependencies, forming a small tree that FastAPI walks, caching repeated dependencies so get_db runs once even if three things ask for it. This is why handlers stay flat and testable — swap the dependency, not the handler.",
    ],
    excerpt: {
      path: "fastapi/dependencies/utils.py",
      startLine: 508,
      endLine: 522,
      code: `async def solve_dependencies(
    *,
    request: Union[Request, WebSocket],
    dependant: Dependant,
    dependency_cache: Optional[Dict[Tuple[Callable[..., Any], Tuple[str]], Any]] = None,
    # ...
) -> SolvedDependency:
    values: Dict[str, Any] = {}
    # ...
    for sub_dependant in dependant.dependencies:
        # resolve each declared dependency, reusing the
        # per-request cache when the same callable repeats
        solved_result = await solve_dependencies(...)`,
    },
    questions: [
      {
        id: "f1-q1",
        kind: "mc",
        prompt: "Three path operations all declare Depends(get_db). During one request that hits one of them, how many times does get_db run?",
        options: [
          { id: "a", label: "Once — resolved dependencies are cached per request" },
          { id: "b", label: "Three times — once per declaration in the codebase" },
          { id: "c", label: "Zero — it only runs at startup" },
          { id: "d", label: "It depends on how many workers are running" },
        ],
        correctOptionId: "a",
      },
      {
        id: "f1-q2",
        kind: "mc",
        prompt: "What's the main architectural payoff of handlers declaring dependencies instead of constructing them?",
        options: [
          { id: "a", label: "Handlers run faster because dependencies are precompiled" },
          { id: "b", label: "Handlers stay flat and testable — swap the dependency without touching the handler" },
          { id: "c", label: "It removes the need for a database session entirely" },
          { id: "d", label: "It lets FastAPI parallelize all endpoint code automatically" },
        ],
        correctOptionId: "b",
      },
    ],
  },
};

export const fastapiReviewBank: Record<string, Question[]> = {
  "pydantic-validation": [
    {
      id: "fr1-q1",
      kind: "mc",
      prompt: "A request body fails to match the endpoint's Pydantic model. What does FastAPI do?",
      options: [
        { id: "a", label: "Rejects it with a structured 422 before your handler ever runs" },
        { id: "b", label: "Passes the raw dict to your handler with a warning" },
        { id: "c", label: "Coerces every field to a string and continues" },
        { id: "d", label: "Returns a 500 from inside your handler" },
      ],
      correctOptionId: "a",
    },
  ],
  "path-operations": [
    {
      id: "fr2-q1",
      kind: "mc",
      prompt: "In @app.get(\"/users/{user_id}\"), how does user_id reach your function?",
      options: [
        { id: "a", label: "Through a global request object you import" },
        { id: "b", label: "As a typed parameter — FastAPI matches it from the path and converts it using your annotation" },
        { id: "c", label: "Via request.params, untyped" },
        { id: "d", label: "It doesn't — you parse the URL yourself" },
      ],
      correctOptionId: "b",
    },
  ],
  "async-endpoints": [
    {
      id: "fr3-q1",
      kind: "mc",
      prompt: "You write a plain `def` (not async) endpoint that does blocking I/O. What does FastAPI do with it?",
      options: [
        { id: "a", label: "Rejects it at startup — endpoints must be async" },
        { id: "b", label: "Runs it in a threadpool so it doesn't block the event loop" },
        { id: "c", label: "Runs it on the event loop and blocks everything" },
        { id: "d", label: "Silently converts it to async" },
      ],
      correctOptionId: "b",
    },
  ],
};
