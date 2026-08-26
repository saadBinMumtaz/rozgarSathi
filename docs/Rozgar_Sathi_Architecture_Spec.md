# Rozgar Sathi — Architecture & File-Level Build Instructions (Qoder Edition)

This document is a direct instruction set, not a narrative plan. Attach it to Qoder as project context and follow it literally: build the exact folders and files named below, use the exact schemas and API shapes given, and treat every "Definition of Done" as a condition you must verify before moving to the next day. Do not improvise folder names, response shapes, or file placement — if something in a task seems to need a decision not covered here, default to the closest existing pattern in this document rather than inventing a new one.

Use this alongside the narrative 7-Day Hackathon Plan for product vision, scoring philosophy, and question strategy. This document is the **implementation contract**: it tells you what file does what, what shape data takes, and what "done" means at the file level.

---

# 1. Repo Structure — Build This Exact Layout on Day 1 and Never Restructure It

Create this folder and file layout before writing any feature logic. Every later instruction in this document assumes these exact paths exist. Do not rename folders, do not flatten the structure, and do not introduce a different pattern (for example, feature-based folders instead of layer-based folders) partway through the build — restructuring mid-week is the single most common way a multi-day agentic build breaks.

```text
rozgar-sathi/
├── .qoder/
│   └── rules/
│       └── architecture.md          # This document's core sections, pasted in
├── .env.example
├── package.json                     # root workspace scripts (if monorepo) or split repos
│
├── backend/
│   ├── src/
│   │   ├── server.js                 # Express app entrypoint, mounts all routers
│   │   ├── config/
│   │   │   ├── env.js                 # loads & validates env vars, fails fast if missing
│   │   │   └── db.js                  # MongoDB connection singleton
│   │   │
│   │   ├── models/                    # Mongoose schemas — one file per collection
│   │   │   ├── Session.model.js
│   │   │   ├── JDAnalysis.model.js
│   │   │   ├── ResumeAnalysis.model.js
│   │   │   ├── BehavioralQuestion.model.js
│   │   │   ├── TechnicalQuestion.model.js
│   │   │   ├── CodingQuestion.model.js
│   │   │   └── User.model.js          # even if auth is stubbed, keep userId consistent
│   │   │
│   │   ├── routes/                    # thin route files — validation + delegate to controllers
│   │   │   ├── jd.routes.js            # POST /api/jd/analyze
│   │   │   ├── resume.routes.js        # POST /api/resume/analyze
│   │   │   ├── session.routes.js       # POST/GET /api/sessions, /api/sessions/:id
│   │   │   ├── behavioral.routes.js    # POST /api/sessions/:id/answer (behavioral)
│   │   │   ├── technical.routes.js     # POST /api/sessions/:id/answer (technical)
│   │   │   ├── coding.routes.js        # /api/coding/questions, /run, /submit
│   │   │   ├── dashboard.routes.js     # GET /api/dashboard/:userId
│   │   │   └── health.routes.js        # GET /api/health
│   │   │
│   │   ├── controllers/               # business logic per route file, same naming
│   │   │   ├── jd.controller.js
│   │   │   ├── resume.controller.js
│   │   │   ├── session.controller.js
│   │   │   ├── behavioral.controller.js
│   │   │   ├── technical.controller.js
│   │   │   ├── coding.controller.js
│   │   │   └── dashboard.controller.js
│   │   │
│   │   ├── services/                  # SHARED logic — reused across all 3 modes
│   │   │   ├── ai.js                   # single Qwen API wrapper — ALL Qwen calls go through this
│   │   │   ├── scoring.js              # shared evidence→strength→gap→fix evaluator
│   │   │   ├── difficultyEngine.js     # adaptive difficulty step-up/step-down logic
│   │   │   ├── insightEngine.js        # cross-mode pattern synthesis (Day 5)
│   │   │   ├── codeExecutor.js         # sandboxed code execution client
│   │   │   ├── retrieval.js            # RAG/vector retrieval over question banks
│   │   │   └── bilingual.js            # language-preference-aware prompt shaping
│   │   │
│   │   ├── data/                      # curated static question banks (JSON, hand-reviewed)
│   │   │   ├── behavioral-questions.json
│   │   │   ├── technical-questions.json
│   │   │   └── coding-questions.json
│   │   │
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   ├── rateLimiter.js          # protects Qwen-calling + code-exec endpoints
│   │   │   └── validateRequest.js
│   │   │
│   │   └── utils/
│   │       ├── jsonSchemaValidate.js   # validates Qwen's structured output against schema
│   │       └── logger.js
│   │
│   └── tests/
│       ├── jd.test.js
│       ├── scoring.test.js
│       ├── difficultyEngine.test.js
│       └── coding.test.js
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                    # router root
│   │   │
│   │   ├── design-system/             # LOCKED on Day 1, imported everywhere after
│   │   │   ├── tokens.css              # color/spacing/typography CSS variables
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   ├── ScoreRing.jsx           # reused by all 3 results screens
│   │   │   ├── Skeleton.jsx
│   │   │   └── Toast.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── JDInput.jsx             # + résumé upload field
│   │   │   ├── ModeSelection.jsx
│   │   │   ├── BehavioralInterview.jsx
│   │   │   ├── TechnicalInterview.jsx
│   │   │   ├── CodingInterview.jsx
│   │   │   ├── Results.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── SessionHistory.jsx
│   │   │
│   │   ├── components/
│   │   │   ├── behavioral/
│   │   │   │   ├── MicRecorder.jsx      # waveform + permission handling
│   │   │   │   ├── TypedFallback.jsx
│   │   │   │   └── FollowUpBubble.jsx
│   │   │   ├── technical/
│   │   │   │   └── DifficultyIndicator.jsx
│   │   │   ├── coding/
│   │   │   │   ├── MonacoEditorPanel.jsx
│   │   │   │   ├── TestResultPanel.jsx  # per-test-case pass/fail
│   │   │   │   ├── InterviewerSidebar.jsx
│   │   │   │   └── LanguageSelector.jsx
│   │   │   └── shared/
│   │   │       ├── EvidenceCard.jsx     # score → evidence → strength → gap → fix
│   │   │       ├── ProgressTrendChart.jsx
│   │   │       └── ErrorBoundary.jsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useSession.js
│   │   │   ├── useSpeechToText.js
│   │   │   └── useCodeExecution.js
│   │   │
│   │   ├── api/
│   │   │   └── client.js               # single fetch wrapper, base URL from env
│   │   │
│   │   └── styles/
│   │       └── tailwind.config.js
│   │
│   └── tests/
│       └── (component tests, optional if time-constrained)
│
└── docs/
    ├── Rozgar_Sathi_7_Day_Hackathon_Plan_Enhanced.md   # product/day narrative plan
    └── Rozgar_Sathi_Architecture_Spec.md                # this file
```

Do not create new top-level folders under `src/` without updating this document first. If a task seems to need a new folder, place the new file under the closest existing category (`services/`, `components/<mode>/`, etc.) instead of inventing one. If you genuinely believe a new top-level folder is required, stop and flag it rather than silently creating one.

---

# 2. Environment & Configuration — Set This Up Before Any Feature Code

Create `.env.example` at the repo root with exactly these keys, and require every contributor to copy it to `.env` locally. Never commit the real `.env` file.

```env
# Backend
PORT=5000
MONGO_URI=mongodb://localhost:27017/rozgar-sathi
QWEN_API_KEY=
QWEN_API_URL=
CODE_EXEC_URL=http://localhost:6000
CODE_EXEC_TIMEOUT_MS=5000
CODE_EXEC_MEMORY_MB=256
STT_PROVIDER_KEY=
JWT_SECRET=                    # even if auth is stubbed, reserve this
NODE_ENV=development

# Frontend
VITE_API_BASE_URL=http://localhost:5000/api
```

Implement `backend/src/config/env.js` so the server refuses to boot — fails fast, with a clear console error — if `QWEN_API_KEY` or `MONGO_URI` is missing. Do not let the server start in a silently misconfigured state; a server that starts without these values will fail unpredictably mid-demo instead of failing immediately and visibly during setup, which is far worse.

Read environment variables only inside `config/env.js`. Do not scatter `process.env.X` calls across other files — every other module should import the already-validated config object from `env.js`.

---

# 3. Data Models — Implement These Mongoose Schemas Exactly As Shown

Create one file per collection under `backend/src/models/`, using the field names and types below verbatim. Do not rename fields, and do not add undocumented fields without updating this section in the same change.

### `Session.model.js`

```js
{
  userId: String,
  mode: { type: String, enum: ["behavioral", "technical", "coding"] },
  jdSnapshot: Object,           // JD analysis JSON at time of session
  status: { type: String, enum: ["in_progress", "completed", "abandoned"] },
  questions: [{
    questionId: String,
    questionText: String,
    difficulty: String,
    transcript: String,
    followUps: [String],
    evaluation: {
      score: Number,
      dimensions: Object,
      evidence: [String],
      strength: String,
      missing: String,
      improvement: String,
      confidenceLevel: { type: String, enum: ["high", "medium", "low"] }
    }
  }],
  overallScore: Number,
  createdAt: Date,
  updatedAt: Date               // update on EVERY incremental save, not just completion
}
```

### `JDAnalysis.model.js`

```js
{
  rawText: String,
  role: String,
  skills: [String],
  experienceLevel: String,
  keywords: [String],
  behavioralFocus: [String],
  technicalFocus: [String],
  seniorityConfidence: { type: String, enum: ["high", "medium", "low"] },
  createdAt: Date
}
```

### `ResumeAnalysis.model.js` (build on Day 3 or later, optional if time-constrained)

```js
{
  claimedSkills: [String],
  yearsExperience: String,
  projectsSummary: String,
  jdAlignmentScore: Number,
  gapAreas: [String],
  linkedJDAnalysisId: String
}
```

### `CodingQuestion.model.js`

```js
{
  title: String,
  topic: String,
  difficulty: { type: String, enum: ["easy", "medium", "hard"] },
  statement: String,
  constraints: [String],
  examples: [Object],
  starterCode: String,
  publicTests: [Object],
  hiddenTests: [Object],
  expectedTimeComplexity: String,
  expectedSpaceComplexity: String,
  followUpPrompts: [String],
  interviewerProbes: [String]
}
```

Build `BehavioralQuestion.model.js` and `TechnicalQuestion.model.js` following the same pattern: `{ text, topic/skill, difficulty, rubric, followUpPrompts }`. Keep the field names consistent with the coding schema above wherever the concept overlaps (`difficulty`, `followUpPrompts`) so shared services can read all three question types without special-casing field names per mode.

---

# 4. API Contract — Implement Every Endpoint With This Exact Shape

Build each endpoint below in the named route file, delegating to the named controller file. Every controller function must return exactly the response shape shown and nothing else undocumented. If you add a field to a response during implementation, update this table in the same change so the contract never silently drifts from the code.

| Method | Path | Route File | Controller File | Request Shape | Response Shape |
|---|---|---|---|---|---|
| POST | `/api/jd/analyze` | `jd.routes.js` | `jd.controller.js` | `{ text }` | `JDAnalysis` object (Sec. 3) |
| POST | `/api/resume/analyze` | `resume.routes.js` | `resume.controller.js` | `{ file }` or `{ text }` | `ResumeAnalysis` object |
| POST | `/api/sessions` | `session.routes.js` | `session.controller.js` | `{ mode, jdAnalysisId }` | `{ sessionId }` |
| GET | `/api/sessions/:id` | `session.routes.js` | `session.controller.js` | — | full `Session` object |
| POST | `/api/sessions/:id/answer` | `behavioral.routes.js` / `technical.routes.js` | matching controller | `{ questionId, transcript }` | `{ evaluation, nextAction: "followup" \| "next_question" \| "complete", nextQuestion? }` |
| POST | `/api/coding/questions` | `coding.routes.js` | `coding.controller.js` | `{ topic?, difficulty? }` | `CodingQuestion` object |
| POST | `/api/coding/run` | `coding.routes.js` | `coding.controller.js` | `{ sessionId, code, language }` | `{ publicTestResults: [{input, expected, actual, passed}] }` |
| POST | `/api/coding/submit` | `coding.routes.js` | `coding.controller.js` | `{ sessionId, code, language }` | `{ hiddenTestResults, evaluation }` |
| GET | `/api/dashboard/:userId` | `dashboard.routes.js` | `dashboard.controller.js` | — | `{ overallReadiness, perMode, weakestCompetency, trend, crossModeInsight }` |
| GET | `/api/health` | `health.routes.js` | inline | — | `{ status: "ok", mongo: bool, qwen: bool }` |

Keep route files thin: validate the request shape, then call the matching controller. Do not put business logic directly inside a route file.

---

# 5. Shared Services — Build These Five Files First, Before Any Mode-Specific Logic

These five files are the backbone of the whole system. Every mode-specific controller must call into them. Do not let any of the three interview modes build its own copy of this logic — if you notice yourself writing evaluation logic, difficulty logic, or a Qwen call inside a mode-specific controller, stop and move it into the matching service file instead.

### `services/ai.js`
Build a single exported function: `callQwen({ systemPrompt, userPrompt, responseSchema })`.
- Enforce JSON-schema-locked prompting — always pass the exact rubric/schema in the system prompt so output is parseable every time.
- Validate the response against `responseSchema` using `utils/jsonSchemaValidate.js`.
- Retry once on malformed JSON. On a second failure, throw a typed error so the calling controller can fall back gracefully instead of crashing.
- No file other than `ai.js` may call the Qwen API directly. Every other module that needs an AI call must import `ai.js` or a higher-level service that wraps it (`scoring.js`, `insightEngine.js`).

### `services/scoring.js`
Build a single exported function: `evaluateAnswer({ question, transcript, rubric, mode })`.
- Call `ai.js` internally using the rubric-locked prompt pattern.
- Run deterministic floor checks before trusting the LLM's score: confirm the answer is non-empty, meets a minimum word count, and — for coding — that hidden tests actually passed. Never let a hallucinated high score override a failed test suite.
- Return exactly the `evaluation` shape defined in Section 3.
- This is the only place in the codebase where an `evaluation` object is constructed. Behavioral, Technical, and Coding controllers all call this function; none of them build their own version.

### `services/difficultyEngine.js`
Build a single exported function: `nextDifficulty({ currentDifficulty, lastScore, skillHistory })`.
- Keep this a pure function with no AI call inside it — deterministic step-up / flat / step-down logic, with the swing capped per step so one weak or strong answer can't cause a wild jump in difficulty.
- Use this function from both `technical.controller.js` and `coding.controller.js`.

### `services/insightEngine.js`
Build a single exported function: `generateCrossModeInsight({ behavioralEval, technicalEval, codingEval })`.
- Make one Qwen call over all three evaluation JSONs, looking for a repeated pattern across modes — not a numeric average.
- Only invoke this once all three modes have at least one completed session for that candidate. Keep it isolated in its own file so it can be tested independently of the three interview controllers — this is the Day 5 differentiator, and it must remain easy to reason about on its own.

### `services/codeExecutor.js`
Build a single exported function: `runCode({ code, language, tests, timeoutMs, memoryMb })`.
- Talk to the sandboxed execution service at `CODE_EXEC_URL`.
- Return per-test-case results to the caller. Never forward a raw stack trace to the frontend.

If a new mode-specific file starts duplicating logic that belongs in one of these five services, refactor it into the shared file immediately rather than letting the duplication persist.

---

# 6. Day-Wise Build Instructions

Follow these seven days in order. Each day states a **Goal** (what must be true by the end of the day), the exact **Files Touched** (build or modify only these unless you discover a genuine bug in an already-completed file), the **New API Endpoints** to implement, and a **Definition of Done** you must personally verify — treat each Definition of Done bullet as a test you run, not a description you skim.

## Day 1 — Foundation

**Goal:** Make it possible for a candidate to paste a JD and reach the mode-selection screen with real, persisted data. Lock the design system and folder structure so every later day builds on a fixed foundation instead of reworking basics.

**Files Touched:**
```
backend/src/server.js
backend/src/config/env.js
backend/src/config/db.js
backend/src/models/JDAnalysis.model.js
backend/src/routes/jd.routes.js
backend/src/controllers/jd.controller.js
backend/src/services/ai.js               (first version — JD extraction only)
backend/src/middleware/errorHandler.js
backend/src/routes/health.routes.js

frontend/src/design-system/*              (all files)
frontend/src/pages/Landing.jsx
frontend/src/pages/JDInput.jsx
frontend/src/pages/ModeSelection.jsx
frontend/src/api/client.js
```

**New API Endpoints:** `POST /api/jd/analyze`, `GET /api/health`

**Definition of Done — verify each of these before moving on:**
- Call `GET /api/health` and confirm it returns `{status:"ok", mongo:true, qwen:true}` against real, non-mocked connections.
- Paste a real JD into the frontend and confirm a `JDAnalysis` document is created in MongoDB matching the Section 3 schema exactly.
- Confirm all five design-system components (`Button`, `Card`, `Badge`, `ProgressBar`, `ScoreRing`) are actually used at least once in `Landing.jsx` or `JDInput.jsx` — not left unused.

---

## Day 2 — Behavioral Interview

**Goal:** Let a candidate complete a full behavioral session end-to-end, including at least one adaptive follow-up, with the transcript persisted incrementally so a page refresh never loses progress.

**Files Touched:**
```
backend/src/models/Session.model.js
backend/src/models/BehavioralQuestion.model.js
backend/src/data/behavioral-questions.json      (15-20 curated questions)
backend/src/routes/behavioral.routes.js
backend/src/controllers/behavioral.controller.js
backend/src/services/scoring.js                  (first version)
backend/src/services/retrieval.js                 (behavioral retrieval only)

frontend/src/pages/BehavioralInterview.jsx
frontend/src/components/behavioral/MicRecorder.jsx
frontend/src/components/behavioral/TypedFallback.jsx
frontend/src/components/behavioral/FollowUpBubble.jsx
frontend/src/hooks/useSpeechToText.js
frontend/src/hooks/useSession.js
```

**New API Endpoints:** `POST /api/sessions`, `GET /api/sessions/:id`, `POST /api/sessions/:id/answer` (behavioral)

**Definition of Done — verify each of these before moving on:**
- Confirm the session document in MongoDB updates after every single answer (`updatedAt` changes), not only when the session ends.
- Deny microphone permission in the browser and confirm `TypedFallback.jsx` renders automatically within the same screen, with no page reload required.
- Run at least one live session and confirm you see `nextAction: "followup"` returned from the API and rendered via `FollowUpBubble.jsx`.

---

## Day 3 — Technical Q&A + Scoring Engine

**Goal:** Ship the second interview mode, and prove the shared-service architecture holds by making `services/scoring.js` the one evaluator that both Behavioral and Technical call.

**Files Touched:**
```
backend/src/models/TechnicalQuestion.model.js
backend/src/data/technical-questions.json
backend/src/routes/technical.routes.js
backend/src/controllers/technical.controller.js
backend/src/services/difficultyEngine.js
backend/src/services/bilingual.js
backend/src/services/scoring.js                  (refactor: confirm Behavioral now also calls this, remove any duplicate logic from behavioral.controller.js)
backend/src/utils/jsonSchemaValidate.js

frontend/src/pages/TechnicalInterview.jsx
frontend/src/components/technical/DifficultyIndicator.jsx
frontend/src/components/shared/EvidenceCard.jsx
```

**New API Endpoints:** `POST /api/sessions/:id/answer` (technical variant)

**Definition of Done — verify each of these before moving on:**
- Grep the repo and confirm both `behavioral.controller.js` and `technical.controller.js` import from the same `services/scoring.js`, with no second copy of evaluation logic anywhere.
- Run a session with 3+ answers and confirm visible difficulty movement — `DifficultyIndicator.jsx` changes state, driven by `difficultyEngine.js` output.
- Toggle the language preference and confirm feedback phrasing changes without a second full evaluation call — check the network tab for exactly one Qwen call per answer, not two.

---

## Day 4 — Live Coding Interview

**Goal:** Build a real, sandboxed coding judge — not a mock editor — with per-test-case feedback and clean, readable failure handling for empty code, syntax errors, and timeouts.

**Files Touched:**
```
backend/src/models/CodingQuestion.model.js
backend/src/data/coding-questions.json            (12 questions: 3 easy / 6 medium / 3 hard)
backend/src/routes/coding.routes.js
backend/src/controllers/coding.controller.js
backend/src/services/codeExecutor.js
backend/src/middleware/rateLimiter.js              (apply to /run and /submit)

frontend/src/pages/CodingInterview.jsx
frontend/src/components/coding/MonacoEditorPanel.jsx
frontend/src/components/coding/TestResultPanel.jsx
frontend/src/components/coding/LanguageSelector.jsx
frontend/src/hooks/useCodeExecution.js
```

**New API Endpoints:** `POST /api/coding/questions`, `POST /api/coding/run`, `POST /api/coding/submit`

**Definition of Done — verify each of these before moving on:**
- Confirm `TestResultPanel.jsx` renders each public test individually (input / expected / actual / pass-fail), not a single aggregate count.
- Submit empty code, code with a syntax error, and an infinite loop, one at a time, and confirm each produces a distinct, readable error state in the UI — none of the three should produce a raw stack trace or a hung request.
- Confirm `codeExecutor.js` enforces `CODE_EXEC_TIMEOUT_MS` and `CODE_EXEC_MEMORY_MB` from env by submitting an infinite-loop solution and checking it is killed within the configured timeout.

---

## Day 5 — Coding Intelligence + Cross-Mode Insight Engine

**Goal:** Give the coding mode a real interviewer persona, and make the standalone `insightEngine.js` produce one genuine cross-mode pattern for a candidate who has completed all three modes.

**Files Touched:**
```
backend/src/services/insightEngine.js
backend/src/controllers/coding.controller.js      (add interviewerProbes usage + final report)
backend/src/controllers/dashboard.controller.js
backend/src/routes/dashboard.routes.js

frontend/src/components/coding/InterviewerSidebar.jsx
frontend/src/pages/Results.jsx
```

**New API Endpoints:** `GET /api/dashboard/:userId`

**Definition of Done — verify each of these before moving on:**
- Start an active coding session and confirm `InterviewerSidebar.jsx` displays at least one probe pulled from that question's `interviewerProbes` array, read from `data/coding-questions.json` — not freshly generated by the LLM mid-session.
- Complete all three modes for one test user, then call `GET /api/dashboard/:userId` and confirm it returns a non-empty `crossModeInsight` string that references specifics from at least two different modes — not a generic "keep practicing" message.
- Confirm `insightEngine.js` is called exactly once per dashboard load, not once per mode, via a log line or test.

---

## Day 6 — Full Integration + UI Polish

**Goal:** Make the product read as one coherent system, and explicitly handle every reliability edge case below rather than leaving any of them to accidentally work or accidentally break.

**Files Touched:**
```
frontend/src/pages/Dashboard.jsx
frontend/src/pages/SessionHistory.jsx
frontend/src/components/shared/ProgressTrendChart.jsx
frontend/src/components/shared/ErrorBoundary.jsx
backend/src/controllers/dashboard.controller.js    (add session history + trend aggregation)
```

**Reliability checklist — manually trigger each one and confirm a visible, non-crashing UI state:**
- Mic permission denied
- Empty answer submitted
- Qwen API call fails/times out
- Code execution service unreachable
- No hidden-test result returned
- Page refresh mid-session
- Two browser tabs open on the same session

**Definition of Done — verify each of these before moving on:**
- Confirm each of the 7 checklist items above has been manually triggered and produces a handled UI state — not a blank screen, and not an error visible only in the console.
- Confirm `Dashboard.jsx` renders `ProgressTrendChart.jsx` using at least 2 real historical sessions pulled from MongoDB, not mock data.
- Confirm `ErrorBoundary.jsx` wraps all three interview mode pages inside `App.jsx`.

---

## Day 7 — Testing, Deployment, Demo

**Goal:** Confirm the deployed build — not localhost — survives the exact scripted demo flow, and have a backup video ready in case something breaks live.

**Files Touched:**
```
backend/src/middleware/rateLimiter.js              (confirm applied to all Qwen + code-exec routes)
.env.example                                        (confirm every var documented)
docs/deployment-notes.md                            (new — record deployed URLs, known issues)
```

**Deployment checklist — complete each item in order:**
- Set every env var on the hosting platform, not just in the local `.env` file.
- Configure CORS for the deployed frontend origin only.
- Confirm rate limiting is active on `/api/jd/analyze`, `/api/sessions/:id/answer`, `/api/coding/run`, and `/api/coding/submit`.
- Check `/api/health` immediately before the live demo.
- Confirm code execution works against the deployed `CODE_EXEC_URL`, not `localhost`.

**Definition of Done — verify each of these before the demo:**
- Run the full scripted demo flow (JD → mode select → Behavioral → Technical → Coding → Dashboard) three consecutive times against the deployed URL and confirm it succeeds every time.
- Record a screen-captured backup demo filmed against the deployed build, and confirm it plays back correctly.

---

# 7. Rules That Apply Across All Seven Days

Keep these constraints in force for the entire build, not just on the day they were first introduced:

- **One Qwen entry point.** No file other than `services/ai.js` may call the Qwen API directly.
- **No duplicated evaluation logic.** `scoring.js` is the only place an `evaluation` object is constructed, across all three modes.
- **Controllers stay thin.** Route files validate input and call a controller; controllers call services; services call `ai.js`, the database, or `codeExecutor.js`. Never put business logic directly inside a route file.
- **Every new frontend screen imports from `design-system/`** for buttons, cards, badges, and progress indicators — do not build one-off inline-styled equivalents.
- **Every schema or endpoint change updates Section 3 and Section 4 of this document in the same commit or session** — the API contract and the Mongoose schemas must never silently drift apart from the code.
- **Environment variables are read only inside `config/env.js`.**
