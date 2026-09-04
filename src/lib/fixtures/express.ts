import type {
  Assessment,
  Lesson,
  Question,
  RepositoryModel,
} from "../types";

// Fixture RepositoryModel for expressjs/express (docs/DECISIONS.md 008).
// Code excerpts approximate the real source at the 4.x line; Phase 5 replaces
// these with excerpts read from a pinned commit.

export const expressModel: RepositoryModel = {
  id: "express",
  repoUrl: "https://github.com/expressjs/express",
  owner: "expressjs",
  name: "express",
  commitLabel: "v4.19.2 (fixture)",
  description: "Fast, unopinionated, minimalist web framework for Node.js",
  languages: ["JavaScript"],
  concepts: [
    // NOTE: router-stack has goals: [] on purpose — it enters scope only when the
    // adaptive path pulls it in (remediation), which visibly grows the denominator.
    { id: "middleware-pipeline", title: "The middleware pipeline", level: 1, weight: 2, goals: ["understand", "use", "architecture", "contribute"], prerequisites: [] },
    { id: "routing-layer", title: "The router: choosing the gate", level: 4, weight: 3, goals: ["architecture", "contribute"], prerequisites: ["middleware-pipeline"] },
    { id: "router-stack", title: "Where order lives: the layer stack", level: 4, weight: 2, goals: [], prerequisites: ["middleware-pipeline"] },
    { id: "request-response", title: "Augmented req and res", level: 4, weight: 2, goals: ["architecture", "contribute"], prerequisites: ["middleware-pipeline"] },
    { id: "mounting", title: "Composing apps with mounting", level: 4, weight: 2, goals: ["architecture", "contribute"], prerequisites: ["routing-layer"] },
    { id: "error-handling", title: "The error-handling flow", level: 4, weight: 3, goals: ["architecture", "contribute"], prerequisites: ["middleware-pipeline"] },
    { id: "http-boundary", title: "The boundary with Node's http server", level: 4, weight: 2, goals: ["architecture", "contribute"], prerequisites: [] },
    { id: "route-matching", title: "Path matching and params", level: 4, weight: 2, goals: ["architecture", "contribute"], prerequisites: ["routing-layer"] },
    { id: "vs-alternatives", title: "Design tradeoffs vs Koa and Fastify", level: 5, weight: 2, goals: ["architecture", "contribute"], prerequisites: ["routing-layer", "error-handling"] },
  ],
};

const lesson1Questions: Question[] = [
  {
    id: "e1-q1",
    kind: "mc",
    prompt: "Your app calls `app.use(logger)`. What has that added to every request's journey?",
    options: [
      { id: "a", label: "A checkpoint every request passes through before reaching its route handler" },
      { id: "b", label: "A route that answers requests made to the path \"/logger\"" },
      { id: "c", label: "A background job that runs after each response is sent" },
      { id: "d", label: "A replacement for Node's built-in HTTP server" },
    ],
    correctOptionId: "a",
  },
  {
    id: "e1-q2",
    kind: "mc",
    prompt: "Two middlewares are registered: `app.use(auth)` and then `app.use(logger)`. What determines which one runs first?",
    options: [
      { id: "a", label: "Express analyzes what each function does and orders them automatically" },
      { id: "b", label: "Registration order — auth runs first because it was added first" },
      { id: "c", label: "They run in parallel, so order doesn't matter" },
      { id: "d", label: "Alphabetical order of the function names" },
    ],
    correctOptionId: "b",
  },
  {
    id: "e1-q3",
    kind: "free",
    prompt: "In one sentence: besides passing a request along with next(), what else can a middleware do with it?",
    expectedKeywords: ["modify", "change", "respond", "end", "reject", "stop", "send", "attach", "short", "answer", "transform", "block"],
  },
];

export const expressLessons: Record<string, Lesson> = {
  "middleware-pipeline": {
    conceptId: "middleware-pipeline",
    title: "One pipeline, many small steps",
    kicker: "Level 1 · The mental model",
    paragraphs: [
      "Express is, at heart, two ideas wrapped around Node's built-in HTTP server: a router that decides which code should answer a request, and a middleware pipeline that lets many small functions each touch the request on its way there. Almost everything you'll meet later — body parsing, sessions, auth, error pages — is just a function sitting somewhere in that pipeline.",
      "Think of airport security. A request is a traveler; each middleware is a checkpoint. A checkpoint can wave the traveler through (call next()), stamp their passport (attach data to req), or turn them away entirely (send a response and stop the line). The route handler is simply the departure gate at the end — and it's a checkpoint too, just usually the last one.",
      "You can see the shape in the source: createApplication() builds `app` as a plain function that hands every incoming request to app.handle — the entrance to the pipeline — then mixes in the methods you know like use() and get().",
    ],
    excerpt: {
      path: "lib/express.js",
      startLine: 38,
      endLine: 59,
      code: `function createApplication() {
  var app = function(req, res, next) {
    app.handle(req, res, next);
  };

  mixin(app, EventEmitter.prototype, false);
  mixin(app, proto, false);

  // expose the prototype that will get set on requests
  app.request = Object.create(req, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
  })

  // expose the prototype that will get set on responses
  app.response = Object.create(res, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
  })

  app.init();
  return app;
}`,
    },
    questions: lesson1Questions,
  },

  "routing-layer": {
    conceptId: "routing-layer",
    title: "The router: choosing the gate",
    kicker: "Level 4 · Architecture",
    paragraphs: [
      "If middlewares are checkpoints, the router is the airport's departure board: it looks at where a request says it's going — method and path — and decides which gate (handler) it should reach. In Express the router isn't separate machinery; it's one more layer in the same pipeline, holding its own inner stack of routes.",
      "When a request enters router.handle, the router walks its stack in order, asking each layer \"does your path match?\". Non-matching layers are skipped; matching middleware runs; the first matching route ends the walk by sending a response. This is why order matters twice: once for middlewares, and again among routes.",
    ],
    excerpt: {
      path: "lib/router/index.js",
      startLine: 136,
      endLine: 152,
      code: `proto.handle = function handle(req, res, out) {
  var router = this;

  // ...

  var idx = 0;
  var stack = router.stack;

  function next(err) {
    // find the next matching layer
    while (match !== true && idx < stack.length) {
      layer = stack[idx++];
      match = matchLayer(layer, path);
      route = layer.route;
      // ...
    }
  }
}`,
    },
    questions: [
      {
        id: "e2a-q1",
        kind: "mc",
        prompt: "A request comes in for GET /users/42. How does the router find the code to run?",
        options: [
          { id: "a", label: "It looks up the path in a hash map for an instant match" },
          { id: "b", label: "It walks its stack in order, testing each layer's path pattern until one matches" },
          { id: "c", label: "It asks each route handler to vote on whether it wants the request" },
          { id: "d", label: "It compiles all routes into one regex at startup and matches once" },
        ],
        correctOptionId: "b",
      },
      {
        id: "e2a-q2",
        kind: "mc",
        prompt: "Architecturally, what IS the router to the rest of Express?",
        options: [
          { id: "a", label: "A separate server that Express forwards requests to" },
          { id: "b", label: "A compile step that rewrites your handlers" },
          { id: "c", label: "Just another layer in the middleware pipeline, with its own inner stack" },
          { id: "d", label: "A wrapper around Node's http.Server routing table" },
        ],
        correctOptionId: "c",
      },
    ],
  },

  "router-stack": {
    conceptId: "router-stack",
    title: "Where order lives: the layer stack",
    kicker: "Remediation · Opening the mechanism",
    paragraphs: [
      "Middleware order isn't a convention Express encourages — it's the data structure itself. Every app.use() pushes a Layer onto an array called stack. There is no scheduler, no dependency analysis, no reordering: the pipeline IS that array, walked front to back for every request.",
      "That's why `app.use(auth)` before `app.use(logger)` means auth always runs first, and why putting your error handler last isn't style advice — a layer can only see what flows past it after it was pushed. If a middleware sends a response and never calls next(), the walk simply stops; everything later in the array never knows the request existed.",
    ],
    excerpt: {
      path: "lib/router/index.js",
      startLine: 460,
      endLine: 473,
      code: `proto.use = function use(fn) {
  // ...
  var layer = new Layer(path, {
    sensitive: this.caseSensitive,
    strict: false,
    end: false
  }, fn);

  layer.route = undefined;

  this.stack.push(layer);
  return this;
};`,
    },
    questions: [
      {
        id: "e2b-q1",
        kind: "mc",
        prompt: "Given this code, what would it take to make logger run before auth, if auth was registered first?",
        options: [
          { id: "a", label: "Nothing — Express will notice logger has no dependencies and float it up" },
          { id: "b", label: "Pass a priority option to app.use(logger, { first: true })" },
          { id: "c", label: "You'd have to register logger first — order in the stack array is the only ordering there is" },
          { id: "d", label: "Call app.sort() after registering everything" },
        ],
        correctOptionId: "c",
      },
      {
        id: "e2b-q2",
        kind: "mc",
        prompt: "A middleware early in the stack sends a response and does NOT call next(). What happens to the layers after it?",
        options: [
          { id: "a", label: "They run anyway, but their responses are discarded" },
          { id: "b", label: "They never run — the walk through the stack stops right there" },
          { id: "c", label: "Express throws an error about an incomplete pipeline" },
          { id: "d", label: "They run in a background task after the response is sent" },
        ],
        correctOptionId: "b",
      },
    ],
  },
};

// Review question bank — fresh questions per concept, not reruns of the lesson quiz.
export const expressReviewBank: Record<string, Question[]> = {
  "middleware-pipeline": [
    {
      id: "er1-q1",
      kind: "mc",
      prompt: "A middleware calls res.send() and never calls next(). What happens?",
      options: [
        { id: "a", label: "The response is sent and the pipeline stops — later layers never run" },
        { id: "b", label: "Express warns that the pipeline was left incomplete" },
        { id: "c", label: "Later middlewares still run, they just can't change the response" },
        { id: "d", label: "The request is retried from the first middleware" },
      ],
      correctOptionId: "a",
    },
    {
      id: "er1-q2",
      kind: "mc",
      prompt: "Where does a route handler like `app.get('/users', fn)` sit relative to middlewares?",
      options: [
        { id: "a", label: "In a separate routing table consulted before the pipeline starts" },
        { id: "b", label: "It's a layer in the same pipeline — usually the last checkpoint a matching request reaches" },
        { id: "c", label: "It replaces the pipeline for matching paths" },
        { id: "d", label: "It runs before any middleware for its path" },
      ],
      correctOptionId: "b",
    },
  ],
  "routing-layer": [
    {
      id: "er2-q1",
      kind: "mc",
      prompt: "Two routes both match a request. Which one answers it?",
      options: [
        { id: "a", label: "The more specific pattern, as ranked by Express" },
        { id: "b", label: "The one registered first — the stack walk stops at the first match that responds" },
        { id: "c", label: "Both run, and the responses are merged" },
        { id: "d", label: "Express throws an ambiguous-route error at startup" },
      ],
      correctOptionId: "b",
    },
  ],
  "router-stack": [
    {
      id: "er3-q1",
      kind: "mc",
      prompt: "What data structure holds the pipeline's order, and what maintains it?",
      options: [
        { id: "a", label: "A priority queue, rebalanced when routes are added" },
        { id: "b", label: "A plain array of Layers; nothing maintains order except the sequence of use() calls" },
        { id: "c", label: "A dependency graph resolved at listen() time" },
        { id: "d", label: "A trie keyed by path segments" },
      ],
      correctOptionId: "b",
    },
  ],
};

export interface LessonOutcome {
  assessment: Assessment;
  adaptationMessage: string;
  nextConceptId: string | null;
  conceptStatus: "understood" | "partial" | "misconception";
}

// The scripted adaptive decision for lesson 1 — the demo's branch point.
// Phase 3 replaces this function with a real Claude next-step decision.
export function decideAfterLesson1(correct: Record<string, boolean>): LessonOutcome {
  const orderingWrong = correct["e1-q2"] === false;
  const useWrong = correct["e1-q1"] === false;

  if (orderingWrong) {
    return {
      conceptStatus: "misconception",
      nextConceptId: "router-stack",
      adaptationMessage:
        "Your answer suggests middleware order still feels automatic — as if Express figures out a sensible sequence for you. It doesn't, and that's the heart of the design: order is the whole contract. Before we go deeper into routing, let's open up the exact place where that order lives.",
      assessment: {
        mastery: 0.35,
        conceptsDemonstrated: useWrong ? [] : ["app.use adds a checkpoint to the pipeline"],
        misconceptions: ["believes Express orders middleware automatically"],
        missingPoints: ["registration order is the only ordering mechanism"],
        feedback:
          "You've got what a middleware is, but not yet what governs when it runs. Middleware ordering is purely registration order — there is no automatic sequencing.",
        recommendedAction: "remediate",
        confidence: 0.8,
      },
    };
  }

  if (useWrong) {
    return {
      conceptStatus: "partial",
      nextConceptId: "routing-layer",
      adaptationMessage:
        "You placed ordering exactly right — registration order is the only rule. app.use itself is still a little fuzzy, so as we climb into the router, watch for how use() and get() end up in the very same stack.",
      assessment: {
        mastery: 0.6,
        conceptsDemonstrated: ["registration order governs the pipeline"],
        misconceptions: [],
        missingPoints: ["app.use registers a pass-through checkpoint, not a route"],
        feedback:
          "Ordering is solid. The gap is what app.use() itself does: it adds a checkpoint every request passes through, not a route of its own.",
        recommendedAction: "reinforce",
        confidence: 0.7,
      },
    };
  }

  return {
    conceptStatus: "understood",
    nextConceptId: "routing-layer",
    adaptationMessage:
      "You've got the pipeline model — checkpoints in a fixed line, each choosing to pass, change, or answer. Since your goal is understanding the architecture, we'll climb one layer next: how the router decides which gate a request finally reaches.",
    assessment: {
      mastery: 0.9,
      conceptsDemonstrated: [
        "app.use adds a checkpoint to the pipeline",
        "registration order governs the pipeline",
        "middleware can modify, respond, or pass along",
      ],
      misconceptions: [],
      missingPoints: [],
      feedback: "Clean mental model: a fixed line of checkpoints, ordered by registration, each free to pass, stamp, or answer.",
      recommendedAction: "advance",
      confidence: 0.85,
    },
  };
}

// Generic scripted outcome for the level-4 lessons (2a / 2b).
export function decideAfterLevel4(
  conceptId: string,
  correct: Record<string, boolean>,
): LessonOutcome {
  const wrongCount = Object.values(correct).filter((v) => !v).length;
  const allRight = wrongCount === 0;
  const followUp: Record<string, string | null> = {
    "routing-layer": "request-response",
    "router-stack": "routing-layer",
  };

  return {
    conceptStatus: allRight ? "understood" : "partial",
    nextConceptId: followUp[conceptId] ?? null,
    adaptationMessage: allRight
      ? conceptId === "router-stack"
        ? "That's the mechanism: an array, walked in order, nothing more. With ordering grounded in the actual data structure, you're ready for the layer we postponed — how the router chooses which gate a request reaches."
        : "The router is placed: one more layer with an inner stack. Next we'll look at what Express does to req and res themselves — the other half of its surface area."
      : "Mostly there — one edge of the mechanism is still soft, so we'll fold a short check into the next step rather than moving past it.",
    assessment: {
      mastery: allRight ? 0.85 : 0.55,
      conceptsDemonstrated: allRight ? ["stack walk in registration order"] : [],
      misconceptions: [],
      missingPoints: allRight ? [] : ["how the stack walk terminates"],
      feedback: allRight
        ? "Solid — you traced the mechanism, not just the rule."
        : "Close: revisit how the walk through the stack starts and stops.",
      recommendedAction: allRight ? "advance" : "reinforce",
      confidence: 0.75,
    },
  };
}
