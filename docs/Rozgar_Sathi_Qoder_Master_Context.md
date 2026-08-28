# Rozgar Sathi — Master Build Context for Qoder AI

**How to read this document:** Sections 1–4 answer "what are we building and why." Sections 5–9 answer "exactly how is it structured, file by file." Section 10 answers "what happens each day, and what proves it's done." Treat every "Definition of Done" as a test to run, not a description to skim.

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [What Makes This Different](#2-what-makes-this-different)
3. [Final MVP Scope](#3-final-mvp-scope)
4. [System Architecture](#4-system-architecture)
5. [Repo Structure (Exact Layout)](#5-repo-structure-exact-layout)
6. [Environment & Configuration](#6-environment--configuration)
7. [Data Models (Mongoose Schemas)](#7-data-models-mongoose-schemas)
8. [API Contract](#8-api-contract)
9. [Shared Services (The Backbone)](#9-shared-services-the-backbone)
10. [Question Strategy & Scoring Model](#10-question-strategy--scoring-model)
11. [Day-Wise Build Plan (Narrative + Implementation Contract Merged)](#11-day-wise-build-plan)
12. [Demo Script, Priorities & Scope-Cut Order](#12-demo-script-priorities--scope-cut-order)
13. [Final Success Definition (Core Build, Days 1–7)](#13-final-success-definition-core-build-days-17)
14. [Phase 2 — Extended Build (Days 8–12): Auth, Landing Page 2.0, Avatar, MediaPipe](#14-phase-2--extended-build-days-812-auth-landing-page-20-avatar-mediapipe)
15. [Flex High-ROI Additions (Fold Into Slack Time, Any Day)](#15-flex-high-roi-additions-fold-into-slack-time-any-day)

---

## 1. Product Vision

Rozgar Sathi is an **AI Interview Twin** for Pakistani job seekers. A candidate pastes a Job Description (and, optionally, a résumé), and the system builds a personalized, evidence-backed picture of exactly where they stand across three realistic interview modes — then tells them precisely what to fix before the real interview.

> **Core principle:** In 7 days, do not build a custom LLM. Build a strong *product system* around existing models: RAG + Qwen + deterministic scoring + a curated original question bank + sandboxed code execution + a tight, opinionated UX.

### The three interview modes

| Mode | What it tests | Key mechanic |
|---|---|---|
| 🎤 **Behavioral Interview** | Communication, self-awareness, structure | Fully voice-driven — the AI interviewer *asks questions aloud* via text-to-speech and *listens to spoken answers* via speech-to-text; adaptive follow-ups, STAR-structure coaching, tone/pace feedback |
| 💻 **Technical Q&A** | Knowledge depth, JD-fit | Role-specific questions derived from the JD's tech stack + seniority, asked aloud by the AI interviewer; difficulty adapts live to performance |
| 🧩 **Live Coding Interview** | Problem-solving under pressure | LeetCode-style sandbox; AI plays interviewer, speaking its probes aloud (approach/complexity/edge cases) in real time while the candidate codes; evaluates code, reasoning, correctness, complexity |

### The Cross-Mode Intelligence Layer (the core differentiator)

A layer that sits *above* all three modes and does what most interview-prep tools never do: it **connects the dots** across sessions. Example: it notices a candidate freezes under follow-up pressure in *both* Behavioral and Live Coding, or that their Technical Q&A vocabulary doesn't match what they claimed on their résumé — and surfaces that as **one prioritized insight**, not three disconnected scores.

### End-to-end product flow

```text
Landing Page
    ↓
Paste Job Description (+ optional Résumé upload)
    ↓
AI extracts role + skills + seniority + interview context
    ↓
AI reconciles JD vs Résumé → highlights gaps/overlaps
    ↓
Choose Interview Mode
    ├── 🎤 Behavioral
    ├── 💻 Technical Q&A
    └── 🧩 Live Coding
    ↓
Personalized Interview Session (adaptive difficulty engine active)
    ↓
Adaptive Questions / Follow-ups / Evaluation
    ↓
Explainable Feedback (score → evidence → strength → gap → fix)
    ↓
Readiness Dashboard + Weak Areas + Next Steps + Streaks
    ↓
Session History + Progress Trend Over Time
```

---

## 2. What Makes This Different

Do **not** present this project as "another AI interview chatbot." Twelve concrete differentiators, in order of how they should be pitched:

1. **Three interview modes in one product** — communication, knowledge, and execution, not just one.
2. **Fully voice-driven interviewer, not a chat box** — the AI asks its questions and follow-ups out loud via speech synthesis and listens to spoken answers via speech-to-text, so the session feels like a real spoken interview instead of typing into a form.
3. **JD-aware questions instead of generic questions** — every question traces back to a line in the JD.
4. **Résumé-aware personalization** — the AI cross-checks claimed experience against the JD and probes precisely there.
5. **Bilingual coaching** — English + Urdu + Roman Urdu/code-switching; feedback is constructive, never a language-shaming exercise.
6. **Adaptive follow-up questions** — the interviewer behaves like a real one: it digs deeper when an answer is shallow.
7. **Adaptive difficulty engine** — question difficulty rises or falls in real time based on performance, like a real panel escalating or easing off.
8. **Explainable scores with evidence** — every number is backed by quoted evidence from the answer/code, never a black-box digit.
9. **Live coding evaluation with a real AI interviewer persona** — not just pass/fail tests, genuine interviewer-style probing, spoken aloud.
10. **Interview readiness profile across all three modes** — one unified competency picture instead of three silos.
11. **Actionable next-session recommendations** — tells the candidate exactly what to do next, not just what went wrong.
12. **Progress over time** — returning candidates see a trend line, not just a snapshot.
13. **Shareable/exportable report** — a downloadable PDF summary a candidate could genuinely bring into their own prep routine.

### The pitch line to keep repeating

> "Most AI interview tools either ask generic questions or evaluate only what you say. Rozgar Sathi creates a personalized interview twin that evaluates how you communicate, how deeply you understand your technical skills, and how you solve problems under coding-interview conditions — then tells you, with evidence, exactly what to fix before the real interview."

---

## 3. Final MVP Scope

### MUST WORK (never cut without a very good reason)

- Job Description input
- JD skill/role/seniority extraction
- Optional résumé upload + JD-résumé gap analysis (cut first if behind)
- Question/rubric retrieval
- 🎤 Behavioral mode
- 💻 Technical Q&A mode
- 🧩 Live Coding mode
- **Full voice round-trip: AI asks questions/follow-ups/probes aloud (text-to-speech) AND listens to spoken answers (speech-to-text)** — with a typed/text-only fallback if either direction fails or is unsupported in the browser
- AI adaptive follow-up
- Adaptive difficulty adjustment within a session
- Structured scoring
- Bilingual feedback
- Coding editor
- Code execution against tests
- Final interview report with evidence-backed explainability
- Session history
- Cross-session progress trend (light version: last 3 sessions is enough)
- Polished responsive UI
- Deployed demo
- Backup demo video

### NICE ONLY IF AHEAD

- Camera/eye-contact analysis
- **Visual interviewer avatar** (voice interaction itself is now MUST WORK above — this is only the visual character/animation layer on top of it)
- Interviewer "persona" selection (friendly / strict / panel of two)
- Exportable PDF report
- Streaks / gamified consistency badges
- Advanced animations
- Complex analytics
- Leaderboards
- Custom ML model

### DO NOT BUILD (out of scope for a 7-day hackathon, period)

- Fine-tuned/custom LLM
- Full model training pipeline
- Large-scale user analytics
- Complex retraining
- Huge question bank
- Multi-language code execution for many languages
- Real-time multiplayer/mock-panel-of-humans features

---

## 4. System Architecture

### High-level system diagram

```text
                    FRONTEND
                React + Vite + Tailwind
                         |
                         v
                    BACKEND API
                       Express
                         |
        -----------------------------------------------
        |               |               |             |
        v               v               v             v
      Qwen            MongoDB         RAG/Vector    Résumé Parser
   Interviewer        Sessions       Question Bank   (Enhanced)
        |
        v
  Structured JSON
  Evaluation
        |
        v
     Scoring
        |
        v
  Cross-Mode Insight Engine (Enhanced)
```

### Live coding architecture

```text
Monaco Editor
      |
      v
Submit Code
      |
      v
Code Execution Service (sandboxed, resource-limited)
      |
      +---- Public Tests → instant feedback
      |
      +---- Hidden Tests → evaluation
      |
      v
Correctness Metrics
      |
      v
AI Reasoning Evaluation (interviewer-persona probing)
      |
      v
Final Coding Score
```

### Locked tech stack

```text
Frontend:             React + Vite + Tailwind
Backend:               Express + Node.js
Database:              MongoDB
AI:                    Qwen API (JSON-schema-locked / structured-output prompting)
RAG:                   Small curated corpus + vector embeddings + cosine similarity search
                       (BM25 as a cheap sparse-retrieval fallback/complement)
Editor:                Monaco Editor
Code Execution:        Judge0 (self-hosted or hosted API) — sandboxed, resource-limited,
                       gives timeout/memory enforcement out of the box; fall back to a
                       custom Docker-based sandbox only if Judge0 doesn't fit the deploy target
Speech (Input):        Web Speech API (browser-native, zero backend cost) as the default STT;
                       Whisper API as a stretch upgrade for noisy/code-switched Urdu-English audio
Speech (Output):       Web Speech API SpeechSynthesis (browser-native, zero backend cost) as the
                       default TTS for the AI interviewer's questions/follow-ups/probes — MUST WORK,
                       this is now core scope, not a stretch feature
Résumé Parsing:        Lightweight PDF/text extraction → same Qwen JSON-extraction pattern used for JD (optional)
                       Gap scoring via cosine similarity over skill embeddings (not raw string match)
PDF Export:            Simple HTML-to-PDF export on the Results screen (optional)
```

**Known risk on voice output — plan for it, don't discover it live:** browser `SpeechSynthesis` voice availability and quality for Urdu/Roman Urdu is inconsistent across browsers/OSes, unlike English which is reliably supported everywhere. Default to **English TTS output** for AI-spoken questions regardless of the candidate's answer-language preference, and treat Urdu TTS output as a stretch enhancement, not a Day 2 requirement. The candidate's spoken *answers* can still be Urdu/mixed (that's STT + evaluation, a separate, already-solved concern) — only the AI's own spoken voice defaults to English for reliability.

**Named techniques used across the system (for pitch/demo language — these are real implementation choices, not just "AI"):**

| Technique | Where it's used |
|---|---|
| Structured/constrained decoding (JSON-schema-locked prompting) | `services/ai.js` — every Qwen call |
| Vector embeddings + cosine similarity search (RAG) | `services/retrieval.js` — question bank retrieval |
| BM25 (sparse retrieval) | `services/retrieval.js` — fallback/complement to embeddings |
| Elo-inspired bounded adjustment | `services/difficultyEngine.js` |
| Exponential moving average (EMA) | per-skill running score inside `difficultyEngine.js` |
| Deterministic floor checks / ensemble scoring | `services/scoring.js` |
| Confidence calibration | `confidenceLevel` field on every evaluation |
| Sandboxed/containerized code execution | `services/codeExecutor.js` (Judge0) |
| Cross-document pattern synthesis | `services/insightEngine.js` |
| Weighted composite scoring | `dashboard.controller.js` — overall readiness |

Language for live coding: **support one language first — JavaScript** (fastest integration with the current stack). Add Python second if time remains, then C++ third. Do not attempt multi-language support inside the 7-day window beyond this order.

### Sandbox hardening checklist (non-negotiable, build alongside Day 4, not after)

- Hard timeout per execution (e.g., 5s) to kill infinite loops
- Memory cap per execution (e.g., 128–256MB)
- No filesystem/network access from inside the sandbox
- Strip `process`, `require`, `eval`-style escapes in the JS runtime
- Queue + rate-limit executions per session to prevent abuse during the demo

---

## 5. Repo Structure (Exact Layout)

Build this exact folder and file layout on **Day 1** and never restructure it. Every later instruction in this document assumes these exact paths exist. Do not rename folders, do not flatten the structure, and do not introduce a different pattern (e.g. feature-based folders instead of layer-based folders) partway through the build — restructuring mid-week is the single most common way a multi-day agentic build breaks.

```text
rozgar-sathi/
├── .qoder/
│   └── rules/
│       └── architecture.md          # Core sections of this document, pasted in
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
│   │   │       ├── ErrorBoundary.jsx
│   │   │       └── VoiceQuestionPlayer.jsx  # speaks the current question/follow-up/probe
│   │   │                                     # aloud via useTextToSpeech; shows a visible
│   │   │                                     # "speaking..." state + captions; reused by
│   │   │                                     # Behavioral, Technical, and Coding (sidebar)
│   │   │
│   │   ├── hooks/
│   │   │   ├── useSession.js
│   │   │   ├── useSpeechToText.js
│   │   │   ├── useTextToSpeech.js      # wraps window.speechSynthesis; exposes speak(text),
│   │   │   │                            # cancel(), isSpeaking, isSupported; auto-falls back
│   │   │   │                            # to text-only when unsupported/blocked
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
    ├── Rozgar_Sathi_7_Day_Hackathon_Plan_Enhanced.md   # product/day narrative plan (source)
    ├── Rozgar_Sathi_Architecture_Spec.md                # implementation contract (source)
    ├── Rozgar_Sathi_Qoder_Master_Context.md             # this merged document
    ├── Rozgar_Sathi_Rules.md                             # extracted global rules
    └── Rozgar_Sathi_Day_Wise_Prompts.md                  # ready-to-paste Qoder prompts
```

Do not create new top-level folders under `src/` without updating this document first. If a task seems to need a new folder, place the new file under the closest existing category (`services/`, `components/<mode>/`, etc.) instead of inventing one. If a new top-level folder genuinely seems required, stop and flag it rather than silently creating one.

---

## 6. Environment & Configuration

Create `.env.example` at the repo root with exactly these keys, and require every contributor to copy it to `.env` locally. **Never commit the real `.env` file.**

```env
# Backend
PORT=5000
MONGO_URI=mongodb://localhost:27017/rozgar-sathi preferably be a mongodb cluster cloud account
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

Implement `backend/src/config/env.js` so the server **refuses to boot** — fails fast, with a clear console error — if `QWEN_API_KEY` or `MONGO_URI` is missing. A server that starts in a silently misconfigured state will fail unpredictably mid-demo instead of failing immediately and visibly during setup, which is far worse.

Read environment variables **only** inside `config/env.js`. Do not scatter `process.env.X` calls across other files — every other module imports the already-validated config object from `env.js`.

---

## 7. Data Models (Mongoose Schemas)

Create one file per collection under `backend/src/models/`, using the field names and types below **verbatim**. Do not rename fields, and do not add undocumented fields without updating this section in the same change.

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

**Why `seniorityConfidence` exists:** many real JDs are ambiguous about level. Surfacing this lets the UI ask a single clarifying question ("Junior or Mid-level?") instead of silently guessing wrong and derailing the whole session.

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

**How `jdAlignmentScore` should be computed:** embed `claimedSkills` and the JD's `skills`/`keywords` fields, then take the **cosine similarity** between the two skill vectors as the base alignment score, with `gapAreas` populated from JD skills that have no close match above a similarity threshold. This is more defensible (and demoable) than a raw keyword-overlap count, and gives you a concrete number to point at during the pitch.

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
  interviewerProbes: [String]     // 3–5 scripted probes, see Section 10
}
```

Build `BehavioralQuestion.model.js` and `TechnicalQuestion.model.js` following the same pattern: `{ text, topic/skill, difficulty, rubric, followUpPrompts }`. Keep field names consistent with the coding schema wherever the concept overlaps (`difficulty`, `followUpPrompts`) so shared services can read all three question types without special-casing field names per mode.

---

## 8. API Contract

Build each endpoint below in the named route file, delegating to the named controller file. Every controller function must return **exactly** the response shape shown and nothing else undocumented. If a field is added to a response during implementation, update this table in the same change so the contract never silently drifts from the code.

| Method | Path | Route File | Controller File | Request Shape | Response Shape |
|---|---|---|---|---|---|
| POST | `/api/jd/analyze` | `jd.routes.js` | `jd.controller.js` | `{ text }` | `JDAnalysis` object (Sec. 7) |
| POST | `/api/resume/analyze` | `resume.routes.js` | `resume.controller.js` | `{ file }` or `{ text }` | `ResumeAnalysis` object |
| POST | `/api/sessions` | `session.routes.js` | `session.controller.js` | `{ mode, jdAnalysisId }` | `{ sessionId }` |
| GET | `/api/sessions/:id` | `session.routes.js` | `session.controller.js` | — | full `Session` object |
| POST | `/api/sessions/:id/answer` | `behavioral.routes.js` / `technical.routes.js` | matching controller | `{ questionId, transcript }` | `{ evaluation, nextAction: "followup" \| "next_question" \| "complete", nextQuestion? }` |
| POST | `/api/coding/questions` | `coding.routes.js` | `coding.controller.js` | `{ topic?, difficulty?, questionId?, sessionId? }` | `CodingQuestion` object (linked to session when `sessionId` given) |
| POST | `/api/coding/run` | `coding.routes.js` | `coding.controller.js` | `{ sessionId, code, language }` | `{ publicTestResults: [{input, expected, actual, passed}], executionError: { type, message } \| null }` |
| POST | `/api/coding/submit` | `coding.routes.js` | `coding.controller.js` | `{ sessionId, code, language }` | `{ hiddenTestResults, evaluation, executionError: { type, message } \| null }` |
| GET | `/api/dashboard/:userId` | `dashboard.routes.js` | `dashboard.controller.js` | — | `{ overallReadiness, perMode, weakestCompetency, trend, crossModeInsight }` |
| GET | `/api/health` | `health.routes.js` | inline | — | `{ status: "ok", mongo: bool, qwen: bool }` |

Keep route files thin: validate the request shape, then call the matching controller. Do not put business logic directly inside a route file.

**Lock this API surface on Day 1** — this exact list — to prevent frontend/backend drift mid-week.

---

## 9. Shared Services (The Backbone)

Build these five files **first, before any mode-specific logic**. They are the backbone of the whole system, and every mode-specific controller must call into them. Do not let any of the three interview modes build its own copy of this logic — if evaluation logic, difficulty logic, or a Qwen call starts appearing inside a mode-specific controller, stop and move it into the matching service file instead.

### `services/ai.js`
Single exported function: `callQwen({ systemPrompt, userPrompt, responseSchema })`.
- Enforce JSON-schema-locked prompting — always pass the exact rubric/schema in the system prompt so output is parseable every time.
- Validate the response against `responseSchema` using `utils/jsonSchemaValidate.js`.
- Retry once on malformed JSON. On a second failure, throw a typed error so the calling controller can fall back gracefully instead of crashing.
- **No file other than `ai.js` may call the Qwen API directly.** Every other module needing an AI call imports `ai.js` or a higher-level service that wraps it (`scoring.js`, `insightEngine.js`).

### `services/scoring.js`
Single exported function: `evaluateAnswer({ question, transcript, rubric, mode })`.
- Calls `ai.js` internally using the rubric-locked prompt pattern (structured/constrained decoding — the schema is passed in the system prompt so output is parseable every time).
- Runs deterministic floor checks before trusting the LLM's score: confirm the answer is non-empty, meets a minimum word count, and — for coding — that hidden tests actually passed. Never let a hallucinated high score override a failed test suite. This LLM-score-plus-rule-based-checks combination is an **ensemble scoring** approach — name it as such rather than "we just used AI to score."
- Attach the `confidenceLevel` field as a lightweight **confidence-calibration** signal (low when the answer was short/off-topic or the model's reasoning was thin) rather than presenting every score as equally certain.
- Returns exactly the `evaluation` shape defined in Section 7.
- **This is the only place in the codebase where an `evaluation` object is constructed.** Behavioral, Technical, and Coding controllers all call this function; none build their own version.

### `services/difficultyEngine.js`
Single exported function: `nextDifficulty({ currentDifficulty, lastScore, skillHistory })`.
- Keep this a **pure function with no AI call inside it** — deterministic step-up / flat / step-down logic, with the swing capped per step so one weak or strong answer can't cause a wild jump in difficulty. This is effectively an **Elo-inspired bounded rating adjustment** — worth naming as such in the pitch, since it's a real, well-known pattern from competitive-rating systems, not an arbitrary if/else ladder.
- Maintain the per-skill running score as an **exponential moving average (EMA)** across answers rather than just looking at the last answer in isolation — this smooths out one lucky/unlucky answer while still reacting faster than a flat average.
- Used by both `technical.controller.js` and `coding.controller.js`.

### `services/insightEngine.js`
Single exported function: `generateCrossModeInsight({ behavioralEval, technicalEval, codingEval })`.
- Makes **one** Qwen call over all three evaluation JSONs, looking for a repeated pattern across modes — not a numeric average. This is **multi-document pattern synthesis** — a more precise and pitch-worthy term than "AI insight."
- Only invoked once all three modes have at least one completed session for that candidate. Kept isolated in its own file so it can be tested independently — this is the Day 5 differentiator and must remain easy to reason about on its own.

### `services/codeExecutor.js`
Single exported function: `runCode({ code, language, tests, timeoutMs, memoryMb })`.
- Talks to the sandboxed execution service at `CODE_EXEC_URL`. **Recommended implementation: Judge0** (open-source, self-hostable code execution/judge API) — it already enforces per-submission timeouts and memory caps, supports JavaScript out of the box, and returns structured stdout/stderr/status per submission, which removes the need to hand-roll sandbox hardening from scratch. Only build a custom Docker-based sandbox if Judge0 can't be deployed in your hosting environment.
- Returns per-test-case results to the caller. **Never** forwards a raw stack trace to the frontend — map Judge0's (or your custom sandbox's) status codes to the three UI-facing states: passed, failed (with diff), and error (syntax/runtime/timeout), never the raw trace itself.
- Optional stretch: run a lightweight **AST-based static check** (via `acorn`/`esprima` for JavaScript) alongside test execution to flag obvious code-quality signals (e.g. unnecessary nested loops) without relying on the LLM for that dimension.

### `services/retrieval.js`
Single exported function: `retrieveQuestions({ jdAnalysis, mode, topic?, difficulty?, excludeIds? })`.
- Embed the JD's `skills`/`keywords`/`behavioralFocus` fields and the question bank's `topic`/`text` fields using a single embedding call per session (not per question); rank candidates by **cosine similarity** and return the top-k.
- Use **BM25** (or a simple TF-IDF ranking) as a cheap, explainable fallback when embeddings are unavailable or when you want a second signal to break ties — this also gives you a non-LLM path to fall back on if the embeddings API is slow/down mid-demo.
- Keep this deterministic given the same JD + question bank snapshot — no live re-ranking via an LLM call; retrieval must never depend on a fresh Qwen call per question.

If a new mode-specific file starts duplicating logic that belongs in one of these five services, refactor it into the shared file immediately rather than letting the duplication persist.

---

## 10. Question Strategy & Scoring Model

### Do NOT depend on LeetCode scraping

Build a small, curated bank of **original** interview problems. Use Qwen during development to help generate original questions, then manually review and save them before the demo. **Do not generate a new coding problem live during the interview** — retrieval from a validated bank is safer and demo-proof.

### DSA question bank (target 20–25 strong questions)

| Topic | Count |
|---|---:|
| Arrays / Hashing | 4 |
| Two Pointers / Sliding Window | 3 |
| Stack / Queue | 2 |
| Linked Lists | 3 |
| Trees | 3 |
| Graphs | 3 |
| Binary Search | 2 |
| Backtracking | 2 |
| Dynamic Programming | 3 |

Each problem must contain (matches `CodingQuestion.model.js` exactly):

```json
{
  "title": "",
  "topic": "",
  "difficulty": "",
  "statement": "",
  "constraints": [],
  "examples": [],
  "starterCode": "",
  "publicTests": [],
  "hiddenTests": [],
  "expectedTimeComplexity": "",
  "expectedSpaceComplexity": "",
  "followUpPrompts": [],
  "interviewerProbes": []
}
```

**`interviewerProbes` (key differentiator field):** 3–5 scripted probing questions the AI can pull from mid-solve, e.g.:
- "What happens if the array is empty?"
- "Can you avoid the extra space here?"
- "What approach are you considering?"
- "What is the complexity of this approach?"
- "Why did you choose this data structure?"

This ensures the live-coding interviewer never has to freestyle a probe under demo pressure.

### Behavioral & Technical bank structure

Apply the same discipline: Behavioral needs 15–20 questions covering Teamwork, Conflict, Leadership, Failure, Problem solving, Pressure, Learning, Communication. Technical needs per-skill clusters (3–5 questions per common JD skill: React, Node, MongoDB, REST, SQL, System Design basics, etc.) so retrieval is fast and reliable instead of improvised live by the LLM — improvisation is where demos break.

### Scoring dimensions per mode

**Behavioral:** Relevance · STAR structure · Communication · Confidence · Specificity · Conciseness

**Technical Q&A:** Technical correctness · Depth · Practical understanding · Relevance to JD · Communication · Reasoning

**Live Coding:** Correctness · Public tests passed · Hidden tests passed · Time complexity · Space complexity · Code quality · Explanation/reasoning

### Explainability is the product, not a nice-to-have

Never present a bare score. Every AI-generated evaluation must show:

```text
Score → Evidence from answer/code → What was good → What was missing → How to improve
```

That explainability is far more impressive on stage than showing "7.8/10."

### Confidence & consistency guardrails

- **Score confidence tag** — attach `confidenceLevel: high | medium | low` to each evaluation (low when the answer was very short, off-topic, or the model's own reasoning was thin). This builds trust instead of pretending every score is equally certain.
- **Deterministic floor checks** — run cheap deterministic checks before trusting the LLM's score (did hidden tests actually pass? is the answer non-empty? does the transcript contain at least N words?). Never let a hallucinated high score override a failed test suite.
- **Rubric-locking prompt pattern** — always pass the exact rubric dimensions and a JSON schema in the system prompt so Qwen's output is parseable every time; validate and retry once on malformed JSON before falling back gracefully.

### Bilingual coaching rules

Support English, Urdu, and Roman Urdu/mixed responses. Coaching must be constructive:

- **Bad:** "Your English is poor."
- **Better:** "Your technical explanation was correct, but you switched languages when explaining the implementation. Practice this explanation using shorter English sentences."

Implementation details:
- Let the candidate set a **response language preference** (English / Urdu / Mixed) up front — this changes how the AI phrases feedback, not just what language it accepts.
- Feedback can be offered bilingually on request via a "Show in Urdu" toggle, reusing the same evaluation JSON, translated only at render/prompt time — **do not re-run the whole evaluation twice.**
- Never penalize code-switching itself in the score; only note it as a coaching observation — code-switching is normal, fluent professional communication in Pakistan.

---

## 11. Day-Wise Build Plan

Each day below merges the **narrative goal** (what it should feel like at the end of the day) with the **implementation contract** (exact files touched, endpoints, and Definition of Done). Follow the seven days in order. Build or modify only the files listed for that day unless a genuine bug is discovered in an already-completed file. Treat each Definition of Done bullet as a test you personally run, not a description you skim.

### Day 1 — Foundation + Product Skeleton

**Goal:** Make it possible for a candidate to paste a JD and reach the mode-selection screen with real, persisted data. Lock the design system and folder structure so every later day builds on a fixed foundation instead of reworking basics.

**Suggested hour-by-hour shape (adjust to team size):**
| Hours | Focus |
|---|---|
| 0–1 | Repo setup, environment variables, branch strategy, Qwen key wired end-to-end with a "hello world" call |
| 1–3 | Design system: color tokens, typography scale, spacing scale, component primitives |
| 3–5 | Landing page + JD input screen (with résumé upload input, even if parsing comes later) |
| 5–7 | Backend: Express skeleton, MongoDB connection, JD analysis endpoint, structured JSON contract |
| 7–8 | Mode selection screen + interview layout shell + results layout shell |
| 8–9 | Wire JD input → JD analysis → mode selection end-to-end; smoke test |

**Files touched:**
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

**New API endpoints:** `POST /api/jd/analyze`, `GET /api/health`

**JD pipeline:** Input is raw pasted JD text. Output must match the `JDAnalysis` schema exactly (Section 7), including `seniorityConfidence`.

**Résumé pipeline stub** (wire fully on Day 3 if time allows) — output shape must match `ResumeAnalysis` (Section 7).

**Design system to lock today:** dark/light visual direction (pick one primary), 4/8px spacing grid, max-4-size typography hierarchy, cards, a reusable `ScoreRing`/`ScoreBar`, progress bars, buttons (primary/secondary/ghost/destructive), status badges, and skeleton loading states (not just spinners — feels far more polished on stage). Do not build ugly functionality first and plan to redesign everything later.

**Definition of Done:**
- `GET /api/health` returns `{status:"ok", mongo:true, qwen:true}` against real, non-mocked connections.
- Pasting a real JD creates a `JDAnalysis` document in MongoDB matching the Section 7 schema exactly.
- All five design-system components (`Button`, `Card`, `Badge`, `ProgressBar`, `ScoreRing`) are actually used at least once in `Landing.jsx` or `JDInput.jsx` — not left unused.

---

### Day 2 — 🎤 Behavioral Interview

**Goal:** Let a candidate complete a full behavioral session end-to-end, including at least one adaptive follow-up, with the transcript persisted incrementally so a page refresh never loses progress — and with the AI interviewer's questions and follow-ups **spoken aloud**, not just displayed as text.

**Interview flow:**
```text
JD (+ résumé context if available)
↓
Retrieve behavioral question (weighted by JD's behavioralFocus)
↓
AI SPEAKS the question aloud (text-to-speech) + shows it as text/captions
↓
Candidate answers → Speech-to-text or typed fallback
↓
Qwen evaluates answer (rubric-locked JSON)
↓
Qwen decides: follow-up OR next question
↓
AI SPEAKS the follow-up/next question aloud, cycle repeats
↓
Save session incrementally (not only at the end)
```

**Files touched:**
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
frontend/src/components/shared/VoiceQuestionPlayer.jsx  (first version — built here, reused Day 4/5)
frontend/src/hooks/useSpeechToText.js
frontend/src/hooks/useTextToSpeech.js             (first version — built here, reused everywhere after)
frontend/src/hooks/useSession.js
```

**New API endpoints:** `POST /api/sessions`, `GET /api/sessions/:id`, `POST /api/sessions/:id/answer` (behavioral)

**Features to build:**
- **Voice-out:** every question, follow-up, and nudge from the AI is spoken aloud automatically via `useTextToSpeech.js` (browser `SpeechSynthesis`, English voice by default — see Section 4's voice-output risk note) the moment it arrives from the API, with the same text always visible as a caption underneath — never audio-only, so a candidate in a quiet/no-audio environment is never blocked.
- The candidate must be able to **skip/interrupt the AI's speech** (a visible "skip" affordance) and start answering immediately without waiting for the full question to finish playing — this matters for demo pacing as much as for real usability.
- Browser microphone with a visible waveform/level indicator — signals "I'm listening" far better than a static mic icon. The mic should only actively listen after the AI's question finishes speaking (or is skipped), so the two audio streams never overlap.
- Speech-to-text, with a typed fallback that appears **automatically** if mic permission is denied or STT fails — never let the candidate hit a dead end. The same automatic-fallback principle applies to TTS: if `useTextToSpeech.js` reports `isSupported: false` or playback fails, silently fall back to text-only display with no error interrupting the flow.
- Soft timer (a gentle color shift, not a harsh countdown buzzer) and question progress ("Question 3 of 5").
- Adaptive follow-up questions.
- **Silence/short-answer detection:** if an answer is under ~10 words, the interviewer gently nudges — "Could you expand on that with a specific example?" — spoken aloud like any other interviewer line — before scoring, rather than scoring a thin answer harshly and silently.
- Live-auto-saved transcript so a refresh never loses the interview.
- **STAR-structure live coaching:** detect whether Situation/Task/Action/Result are present in the transcript and, only in the follow-up, nudge toward the missing piece rather than lecturing about STAR theory. This reads as a genuinely smart interviewer instead of a rubric-quoting bot.

**Definition of Done:**
- The session document in MongoDB updates after every single answer (`updatedAt` changes), not only when the session ends.
- Denying microphone permission in the browser causes `TypedFallback.jsx` to render automatically within the same screen, with no page reload required.
- At least one live session returns `nextAction: "followup"` from the API, rendered via `FollowUpBubble.jsx`.
- A new question arriving from the API is audibly spoken via `VoiceQuestionPlayer.jsx`/`useTextToSpeech.js` without any manual "play" click, AND the same text is visible as a caption at the same time.
- Disabling/blocking speech synthesis in the browser (or testing in an unsupported browser) causes the flow to continue in text-only mode with no crash and no dead end.
- Clicking "skip" during AI speech immediately stops playback and enables the mic/typed input right away.

---

### Day 3 — 💻 Technical Q&A + Scoring Engine

**Goal:** Ship the second interview mode, and prove the shared-service architecture holds by making `services/scoring.js` the one evaluator that both Behavioral and Technical call.

**Question selection inputs:** Role + JD Skills + Candidate-selected difficulty + Previous answers (adaptive difficulty engine) + Résumé claims (if available).

Example:
```text
Junior MERN Developer → React + Node + MongoDB + REST → relevant technical questions
Candidate answered React strongly, Node weakly
→ Next question escalates React depth, keeps Node at foundational level
```

**Files touched:**
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
frontend/src/components/shared/VoiceQuestionPlayer.jsx   (reused, no changes needed — wire it
                                                             into TechnicalInterview.jsx same as Day 2)
```

**New API endpoints:** `POST /api/sessions/:id/answer` (technical variant)

**Adaptive difficulty engine:** maintain a lightweight per-skill running score during the session; after each answer, step the next question's difficulty up one notch (strong answer), keep flat (adequate), or step down one notch (weak answer) — capped so it never swings wildly from one data point.

**Voice reuse, not a rebuild:** technical questions are spoken aloud through the exact same `VoiceQuestionPlayer.jsx` + `useTextToSpeech.js` built on Day 2 — there is no new voice code to write today, only wiring it into the Technical page.

**Definition of Done:**
- Grep the repo and confirm both `behavioral.controller.js` and `technical.controller.js` import from the same `services/scoring.js`, with no second copy of evaluation logic anywhere.
- Running a session with 3+ answers shows visible difficulty movement — `DifficultyIndicator.jsx` changes state, driven by `difficultyEngine.js` output.
- Toggling the language preference changes feedback phrasing without a second full evaluation call — check the network tab for exactly one Qwen call per answer, not two.
- Technical questions are audibly spoken on arrival via the same `VoiceQuestionPlayer.jsx` used in Behavioral — confirm no second/duplicate TTS implementation was written for this page.

---

### Day 4 — 🧩 Live Coding Interview

**Goal:** Build a real, sandboxed coding judge — not a mock editor — with per-test-case feedback and clean, readable failure handling for empty code, syntax errors, and timeouts.

**Coding screen elements:** Monaco Editor, language selector (JavaScript first), question panel with constraints/examples, Run button, Submit button, timer, and a slim **interviewer chat sidebar** so the screen visually communicates "you are being interviewed," not just "you are coding."

**Evaluation flow:**
```text
Retrieve Coding Question → Candidate codes → Run public tests
→ Show pass/fail inline, per test case → Submit
→ Run hidden tests → Collect result → AI evaluates approach → Generate feedback
```

Show each public test individually — input, expected output, actual output, pass/fail — rather than a single aggregate "3/5 passed." This small UI investment makes the coding mode feel dramatically more like a real judge platform.

**Files touched:**
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

**New API endpoints:** `POST /api/coding/questions`, `POST /api/coding/run`, `POST /api/coding/submit`

**Reliability work to finish today, not on Day 6:** empty code submission, syntax errors (show a clean, readable error, never a raw stack trace), execution timeouts (kill it, report "Time Limit Exceeded" like a real judge).

**Definition of Done:**
- `TestResultPanel.jsx` renders each public test individually (input / expected / actual / pass-fail), not a single aggregate count.
- Submitting empty code, code with a syntax error, and an infinite loop — one at a time — each produces a distinct, readable error state in the UI; none of the three produces a raw stack trace or a hung request.
- `codeExecutor.js` enforces `CODE_EXEC_TIMEOUT_MS` and `CODE_EXEC_MEMORY_MB` from env — submit an infinite-loop solution and confirm it is killed within the configured timeout.

---

### Day 5 — Coding Intelligence + Cross-Mode Insight Engine

**Goal:** Give the coding mode a real interviewer persona, and make the standalone `insightEngine.js` produce one genuine cross-mode pattern for a candidate who has completed all three modes.

**AI interviewer behavior during coding:** never reveal the answer; probe using that question's `interviewerProbes` — "What approach are you considering?", "What is the complexity of this approach?", "Can this be optimized?", "What happens with an empty input?", "Why did you choose this data structure?" — **each probe is spoken aloud** via the same `VoiceQuestionPlayer.jsx`/`useTextToSpeech.js` used since Day 2, at the moment it's triggered, while remaining visible as text in `InterviewerSidebar.jsx` at the same time. Voice must not block or pause the editor — the candidate keeps typing while the probe plays.

**Interviewer persona toggle** (nice-only-if-ahead): 1–2 lightweight personas — **Friendly Mentor** (encouraging, more hints) vs **Strict Panel** (terser, less forgiving) — implemented as nothing more than a different system-prompt tone, and optionally a different TTS voice/rate if two distinct system voices are available. Cheap to build, strong demo moment.

**Coding evaluation report shape:**
```text
Correctness: 8/10   Complexity: 7/10   Code Quality: 8/10   Reasoning: 6/10

Evidence:
- Passed 8/10 hidden tests
- Explained HashMap usage correctly
- Did not identify O(n) optimization initially

Next improvement: Practice identifying time complexity before implementation.
```

**Cross-mode readiness example:**
```text
Behavioral: 72%   Technical: 64%   Coding: 58%   Overall Interview Readiness: 65%
```

Compute `overallReadiness` as a **weighted composite**, not a flat average, of the three mode scores (e.g. weight Coding and Technical slightly higher than Behavioral for a technical role, driven by the JD's `technicalFocus`/`behavioralFocus` split) — this is a small, cheap implementation choice that's still worth naming explicitly rather than defaulting to `(a+b+c)/3`.

**Cross-Mode Insight Engine (the single highest-leverage "wow" feature relative to build cost):** after all three modes have at least one completed session, run one lightweight synthesis pass over the three evaluation JSONs looking for a **repeated pattern**, not just a low average:

```text
Pattern detected across modes:
You give strong first answers but struggle to expand under follow-up
questions in both Behavioral and Live Coding.

Suggested focus: practice explaining your reasoning out loud, one level
deeper than your first instinct — in both interviews and code walkthroughs.
```

**Files touched:**
```
backend/src/services/insightEngine.js
backend/src/controllers/coding.controller.js      (add interviewerProbes usage + final report)
backend/src/controllers/dashboard.controller.js
backend/src/routes/dashboard.routes.js

frontend/src/components/coding/InterviewerSidebar.jsx  (wire in VoiceQuestionPlayer.jsx for probes)
frontend/src/pages/Results.jsx
```

**New API endpoints:** `GET /api/dashboard/:userId`

**Definition of Done:**
- An active coding session shows `InterviewerSidebar.jsx` displaying at least one probe pulled from that question's `interviewerProbes` array (read from `data/coding-questions.json`) — not freshly generated by the LLM mid-session.
- That same probe is audibly spoken aloud at the moment it triggers, without pausing or blocking the code editor.
- Completing all three modes for one test user and calling `GET /api/dashboard/:userId` returns a non-empty `crossModeInsight` string that references specifics from at least two different modes — not a generic "keep practicing" message.
- `insightEngine.js` is called exactly once per dashboard load, not once per mode (verify via a log line or test).

---

### Day 6 — Full Product Integration + UI Polish

**Goal:** Make the product read as one coherent system, and explicitly handle every reliability edge case below rather than leaving any of them to accidentally work or accidentally break.

**Dashboard should show:** overall readiness, latest session, behavioral/technical/coding scores, weakest competency, recommended next interview, a **progress trend** sparkline/line chart across the last 2–3 sessions, and optionally a streak/consistency badge derived purely from session timestamps already in MongoDB.

**Session history should store per session:** mode, JD/role, date, score, transcript, questions, feedback, and a cross-mode insight snapshot at that point in time (lets a candidate see how the "connected insight" evolved, not just raw scores).

**Export & share (nice-only-if-ahead):** a "Download report as PDF" button on the Results screen — a clean one-pager with overall score, per-mode breakdown, and the top 2 action items.

**Results screen hierarchy:**
```text
Overall Result → Mode Breakdown → Evidence → Weak Areas → Cross-Mode Insight → Action Plan
```

**Accessibility & resilience:** keyboard-navigable interview flow (Tab/Enter through the entire session, no mouse required); sufficient color contrast on score badges (don't rely on red/green alone — add icons/labels); all loading and error states have visible text, not just a spinner.

**Files touched:**
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

**Definition of Done:**
- Each of the 7 reliability checklist items above has been manually triggered and produces a handled UI state — not a blank screen, and not an error visible only in the console.
- `Dashboard.jsx` renders `ProgressTrendChart.jsx` using at least 2 real historical sessions pulled from MongoDB, not mock data.
- `ErrorBoundary.jsx` wraps all three interview mode pages inside `App.jsx`.

---

### Day 7 — Testing, Deployment, Demo

**Goal:** Confirm the deployed build — not localhost — survives the exact scripted demo flow, and have a backup video ready in case something breaks live.

**Morning — stability:** do not add major features. Run 3 Behavioral interviews, 3 Technical interviews, 5 Coding submissions. Fix only real failures. Freeze the codebase once stable — resist the urge to "just add one more thing."

**Deployment order:** Frontend → Backend → MongoDB → Question/RAG storage → AI services.

**Files touched:**
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
- Confirm code execution works against the deployed `CODE_EXEC_URL`, not `localhost` (sandboxes are the most common thing that works locally and breaks in production).

**Definition of Done:**
- The full scripted demo flow (JD → mode select → Behavioral → Technical → Coding → Dashboard) succeeds three consecutive times against the deployed URL.
- A screen-captured backup demo, filmed against the deployed build, is recorded and confirmed to play back correctly.

---

## 12. Demo Script, Priorities & Scope-Cut Order

### Demo flow (afternoon of Day 7)

1. **Hook:** "Preparing for an interview is difficult because candidates usually practice communication, technical knowledge, and coding separately. Rozgar Sathi brings all three into one personalized AI interview twin — with a real voice interviewer that asks and listens like a human panel — and unlike other tools, it connects what it learns about you across all three."
2. **JD (+ résumé if built):** Paste a real JD. If résumé upload made it in, show the JD-résumé gap callout — a strong, fast visual.
3. **Mode Selection:** Show 🎤 Behavioral, 💻 Technical Q&A, 🧩 Live Coding.
4. **Behavioral:** Let the AI **speak the first question aloud** — this is the single strongest "wow, it actually talks" moment, let it play in full once. Answer one question, show adaptive follow-up (also spoken), and — time permitting — a short-answer nudge on a second, riskier take.
5. **Technical:** Show a JD-specific technical question spoken aloud, one visible difficulty escalation, and explainable evaluation.
6. **Live Coding:** Show the question, Monaco editor, code run with per-test-case feedback, an AI interviewer probe spoken aloud ("Can this be optimized?"), and the final coding evaluation.
7. **Dashboard:** Show combined readiness (`Behavioral: 72% / Technical: 64% / Coding: 58% / Overall: 65%`), recommended focus, and the cross-mode insight.
8. **Close:** "Rozgar Sathi does not just simulate an interview. It identifies exactly where a candidate is weak across communication, technical knowledge, and problem solving — connects the pattern across all three — and tells them precisely what to practice next."

**Final insurance:** record a complete backup demo video, ideally the exact scripted flow above, filmed against the deployed build, not localhost. Test the video's audio specifically — a voice-interviewer demo with no audible sound in the backup video defeats its own purpose.

### Daily time allocation

| Area | Time |
|---|---:|
| Core functionality | 55% |
| Integration/debugging | 20% |
| UI | 15% |
| Reliability/edge cases | 5% |
| Documentation/demo | 5% |

Do not spend an entire day only designing UI — build polished screens alongside functional milestones.

### UI screen list & design direction

Nine core screens only: Landing, JD Input (+ résumé upload), Interview Mode Selection, Behavioral Interview, Technical Q&A Interview, Live Coding Interview, Results, Dashboard, Session History.

**Aim for:** professional, calm, modern, enterprise-quality, minimal, interview-focused.
**Avoid:** too many gradients, excessive animations, too many cards on one screen, hackathon-looking dashboards, tiny unreadable metrics. The product should feel like a tool someone could actually use before a real job interview.

### If behind schedule, cut in this order

1. Advanced animations
2. Avatar (visual character layer — voice interaction itself is protected, see Never Cut below)
3. Camera analysis
4. Interviewer persona toggle
5. PDF export
6. Résumé upload/gap analysis
7. Streaks/badges
8. Large question bank
9. Advanced analytics / progress trend chart
10. Complex progress charts

### Never cut

- Three modes
- Working interview flow
- **Voice round-trip (AI speaks questions/follow-ups/probes aloud, listens to spoken answers)** — this is now core scope, not a stretch feature; if a specific voice degrades (e.g. Urdu TTS), fall back to English TTS or text-only rather than cutting voice output entirely
- Coding execution
- Explainable evaluation
- JD personalization
- Cross-Mode Insight Engine (once built on Day 5, protect it — it is the single best differentiator relative to effort)
- Final polished results
- Deployment/backup demo

### Build priority order

```text
FIRST:  Working core
THEN:   Reliable evaluation
THEN:   Live coding execution
THEN:   Cross-Mode Insight Engine
THEN:   Beautiful UI
THEN:   Dashboard/progress
THEN:   Extra wow features (persona toggle, PDF export, résumé gap analysis, streaks)
```

> **One sentence to remember:** A flawless, focused three-mode interview product that connects its own insights across modes will beat a feature-heavy system with a custom LLM that fails during the demo. Build the product system. Do not build a model.

---

## 13. Final Success Definition (Core Build, Days 1–7)

At the end of 7 days, a user should be able to:

1. Paste a Job Description (and optionally upload a résumé).
2. Have the system understand the role, skills, and reconcile it against their résumé.
3. Choose Behavioral, Technical Q&A, or Live Coding.
4. **Hear the AI interviewer ask its questions and follow-ups aloud**, and answer back by speaking — a genuine spoken conversation, not a chat box — with automatic text fallback if voice isn't available.
5. Complete a personalized interview with difficulty that adapts to their performance.
6. Receive adaptive questions/follow-ups, including graceful handling of weak or short answers.
7. Answer in English, Urdu, or mixed language, and receive feedback in their preferred language.
8. Write and submit real code in a live coding environment, with a real AI interviewer probing their approach — aloud.
9. See test results per test case, not just an aggregate.
10. Receive explainable AI feedback with evidence, confidence level, strengths, gaps, and fixes.
11. See strengths and weaknesses across all three dimensions.
12. See a single connected insight that spans all three modes, not three disconnected scores.
13. Get a recommended next practice session.
14. Return later and see session history, a progress trend, and optionally export a PDF report.


---

## 14. Phase 2 — Extended Build (Days 8–12): Auth, Landing Page 2.0, Avatar, MediaPipe

**Read this section only after Days 1–7 are complete and stable.** Phase 2 does not replace or restructure anything in Sections 5–9 — it adds new files under the same folders and activates two placeholders (`User.model.js`, `JWT_SECRET`) that were deliberately reserved back in Day 1 for exactly this moment. Total build window: 12 days.

### 14.1 Why these four, in this order

| Day | Adds | Why this order |
|---|---|---|
| 8 | Google Auth + persistent user accounts | Everything after this benefits from knowing *who* the candidate is; build it before the marketing page needs a real "Sign in" button |
| 9 | Landing Page 2.0 | Now that login exists, the landing page can actually sell it — and this is the page a recruiter/judge sees first |
| 10 | AI Interviewer Avatar | Purely additive visual layer on the already-working voice pipeline — safest feature to build once the core is frozen |
| 11 | MediaPipe camera engagement analysis | The most technically novel addition; kept last among features so a failure here can never jeopardize auth/landing/avatar |
| 12 | Full re-integration, deploy, demo | Same discipline as the original Day 7 — freeze, verify against the deployed URL, record backup video |

### 14.2 Repo structure additions (Phase 2 only — append to, do not replace, Section 5)

```text
backend/
  src/
    config/
      passport.js                  # (if using passport-google-oauth20) Google strategy config
    models/
      User.model.js                 # now implemented for real, see 14.3
    routes/
      auth.routes.js                 # GET /api/auth/google, GET /api/auth/google/callback, POST /api/auth/logout, GET /api/auth/me
    controllers/
      auth.controller.js
    services/
      googleAuth.js                  # verifies Google tokens / wraps passport strategy
      userMerge.js                   # guestId → userId session re-association (Rules.md Sec. 17)
    middleware/
      authMiddleware.js              # verifies JWT, attaches req.user, protects dashboard/session-history routes

frontend/
  src/
    pages/
      Landing.jsx                    # extended in place, not replaced — see 14.4
    components/
      auth/
        GoogleSignInButton.jsx
        AuthProvider.jsx              # React context holding the current user + JWT
      avatar/
        InterviewerAvatar.jsx         # the ONE avatar component, reused by all 3 modes
      engagement/
        CameraToggle.jsx
        EngagementSummaryCard.jsx     # post-session engagement observation, shown alongside evidence card
    hooks/
      useAuth.js
      useEngagementTracking.js        # owns MediaPipe lifecycle via services/mediapipeEngagement.js
    services/
      mediapipeEngagement.js          # frontend-only: MediaPipe setup/teardown + signal computation
```

Do not create any top-level folder beyond what's listed here without flagging it first, per the Section 0 meta-rule.

### 14.3 Data model additions

**`User.model.js` (activated for real on Day 8):**
```js
{
  googleId: String,
  email: String,
  name: String,
  avatarUrl: String,          // Google profile photo, NOT the interviewer avatar from Day 10
  createdAt: Date,
  lastLoginAt: Date
}
```

**`Session.model.js` — additive fields only, existing fields untouched:**
```js
{
  // ...all Day-1-defined fields unchanged...
  userId: String,             // UNCHANGED shape — now may hold either a guestId or a real Mongo userId
  authenticated: Boolean,     // NEW — true once this session belongs to a logged-in user
  engagementSummary: {        // NEW — Day 11, aggregate only, never frame-by-frame
    avgEyeContactPct: Number,
    cameraUsed: Boolean,
    note: String              // one human-readable coaching observation, never a hidden penalty
  }
}
```

**`EngagementSnapshot` — frontend-only shape, never persisted frame-by-frame, only its session aggregate is saved:**
```js
{
  timestampMs: Number,
  facingCamera: Boolean,
  eyeContact: Boolean,
  faceCount: Number
}
```

### 14.4 API contract additions (append to Section 8's table)

| Method | Path | Route File | Controller File | Request Shape | Response Shape |
|---|---|---|---|---|---|
| GET | `/api/auth/google` | `auth.routes.js` | `auth.controller.js` | — | redirects to Google consent screen |
| GET | `/api/auth/google/callback` | `auth.routes.js` | `auth.controller.js` | Google OAuth code (query) | sets JWT cookie/header, redirects to frontend |
| GET | `/api/auth/me` | `auth.routes.js` | `auth.controller.js` | (JWT) | `{ user }` or `{ user: null }` |
| POST | `/api/auth/logout` | `auth.routes.js` | `auth.controller.js` | — | `{ success: true }` |
| POST | `/api/auth/merge-guest` | `auth.routes.js` | `auth.controller.js` | `{ guestId }` (JWT required) | `{ mergedSessionCount }` |

`GET /api/dashboard/:userId` (existing, Section 8) is now wrapped by `authMiddleware.js`: the `:userId` in the URL is ignored for authorization purposes once a JWT is present — the authenticated identity from the token is the source of truth. Guests (no JWT) continue to use their `guestId` exactly as before Day 8.

### 14.5 Day 8 — Google Authentication + Persistent User Accounts

**Goal:** A candidate can sign in with Google, their pre-login guest sessions become permanently theirs, and the dashboard/session-history become identity-protected — without breaking guest-mode usage for anyone who skips login entirely.

**Files touched:** `backend/src/models/User.model.js`, `backend/src/config/passport.js` (if used), `backend/src/routes/auth.routes.js`, `backend/src/controllers/auth.controller.js`, `backend/src/services/googleAuth.js`, `backend/src/services/userMerge.js`, `backend/src/middleware/authMiddleware.js`, `frontend/src/hooks/useAuth.js`, `frontend/src/components/auth/AuthProvider.jsx`, `frontend/src/components/auth/GoogleSignInButton.jsx`, `.env.example` (add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`).

**Definition of Done:**
- A real Google sign-in completes end-to-end and a `User` document is created/updated in MongoDB with the exact schema in 14.3.
- A candidate who completed a session as a guest, then logs in, has that guest session's `userId` re-associated to their real account — confirm by querying MongoDB directly, not just trusting the UI.
- `GET /api/dashboard/:userId` returns 401/403 (not someone else's data) when called with a different user's ID while authenticated as someone else.
- A brand-new visitor who never logs in can still complete a full Behavioral session — guest mode is unbroken.

### 14.6 Day 9 — Landing Page 2.0

**Goal:** Replace the Day 1 placeholder landing page with a conversion-focused, technically credible marketing page that still funnels into the same JD-input flow, and surfaces the new Google sign-in.

**Files touched:** `frontend/src/pages/Landing.jsx` (extended, not replaced), any new subcomponents under `frontend/src/components/landing/` (e.g. `HeroSection.jsx`, `HowItWorks.jsx`, `TechCredibility.jsx`, `ModeShowcase.jsx`), `frontend/src/components/auth/GoogleSignInButton.jsx` (wired in).

**Definition of Done:**
- The landing page renders the hero, how-it-works, technical-credibility, and mode-showcase sections, all using `design-system/` components — no inline-styled one-offs.
- The primary CTA still routes to `JDInput.jsx` exactly as it did on Day 1.
- `GoogleSignInButton.jsx` is present and functional from the landing page.
- No fabricated statistics, testimonials, or logos appear anywhere on the page.

### 14.7 Day 10 — AI Interviewer Avatar

**Goal:** Give the voice interviewer a visual presence synced to the existing `isSpeaking` state, reused identically across all three modes, without introducing any new audio pathway or blocking dependency.

**Files touched:** `frontend/src/components/avatar/InterviewerAvatar.jsx`, wired into `VoiceQuestionPlayer.jsx`'s render (or placed adjacent to it) in `BehavioralInterview.jsx`, `TechnicalInterview.jsx`, and `InterviewerSidebar.jsx` (Coding).

**Definition of Done:**
- `InterviewerAvatar.jsx` visibly changes state (idle → speaking → idle) in sync with `useTextToSpeech.js`'s `isSpeaking` boolean, verified in all three modes using the same component instance/import, not three separate implementations.
- Captions from `VoiceQuestionPlayer.jsx` remain visible regardless of avatar state.
- Simulating a TTS failure (unsupported/blocked `SpeechSynthesis`) still allows the interview to continue in text-only mode with the avatar either hidden or shown in a neutral idle state — never a crash.

### 14.8 Day 11 — MediaPipe Camera Engagement Analysis

**Goal:** Add an opt-in, privacy-respecting engagement signal (eye contact / facing-camera) computed entirely client-side via MediaPipe, surfaced as a coaching observation — never as a hidden score modifier.

**Files touched:** `frontend/src/services/mediapipeEngagement.js`, `frontend/src/hooks/useEngagementTracking.js`, `frontend/src/components/engagement/CameraToggle.jsx`, `frontend/src/components/engagement/EngagementSummaryCard.jsx`, `backend/src/models/Session.model.js` (add `engagementSummary`, additive only), `backend/src/controllers/session.controller.js` (accept and persist the aggregate on session completion).

**Definition of Done:**
- With the camera toggle off (default), a full interview session completes identically to before Day 11 — no engagement UI, no camera prompt.
- With the camera toggle on, `EngagementSummaryCard.jsx` shows an aggregate eye-contact percentage sourced from real MediaPipe output for that session, and this aggregate is persisted on the `Session` document (verify in MongoDB).
- Denying camera permission, or MediaPipe failing to load, degrades to "engagement tracking unavailable this session" with the interview continuing normally — confirmed by manually triggering both cases.
- `evaluateAnswer()` in `scoring.js` is unchanged by this feature — engagement data never enters the `evaluation` object or influences `score`. Confirm by grep: `scoring.js` has no reference to engagement/camera fields.
- The camera stream is confirmed released (no active camera indicator) immediately after ending a session or toggling the camera off.

### 14.9 Day 12 — Full Re-Integration, Deployment, Demo

**Goal:** Same discipline as the original Day 7, re-run against the now-larger surface area: freeze the codebase, verify the deployed build (not localhost) survives the full scripted flow including login and the two new opt-in layers, and record an updated backup demo.

**Morning — stability:** Run the full flow twice as a guest and twice while logged in via Google. Run it once with the camera engagement toggle on and once with it off. Fix only genuine failures; no new scope.

**Deployment additions on top of the original Day 7 checklist:**
- Register the deployed frontend/backend URLs in the Google Cloud Console OAuth consent screen and authorized redirect URIs — a login that works on `localhost` but 404s/mismatches on the deployed URL is the single most common Day 12 failure.
- Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` to the hosting platform's environment variables (not only `.env` locally).
- Confirm CORS allows the OAuth redirect round-trip from the deployed frontend origin.
- Confirm MediaPipe model assets actually load from the deployed origin (check the network tab for 404s — CDN/CSP issues are common here and easy to miss until the live demo).

**Definition of Done:**
- The full scripted demo flow — Landing → Google Sign-in → JD paste → mode select → Behavioral (avatar + optional camera) → Technical → Coding → Dashboard — succeeds three consecutive times against the deployed URL.
- A second, updated backup demo video is recorded against the deployed build, showing the login flow and the avatar, with audio confirmed audible.
- The original Day 7 core flow (guest mode, no camera) still passes all of its original checks unchanged — Phase 2 has not regressed the Core Build.

### 14.10 Final Success Definition (Extended Build, Days 1–12)

Everything in Section 13 still holds, plus:

15. Sign in with Google and have prior guest-session history follow them into their account.
16. See a visually distinct, professional landing page that explains the real techniques behind the product before ever pasting a JD.
17. See the AI interviewer represented by a simple synced avatar during voice playback, in all three modes.
18. Optionally enable camera-based engagement tracking and receive one honest, non-scoring coaching observation about eye contact/attentiveness per session.
19. Do all of the above (or none of it) without it ever being required to complete a full interview — guest mode, no camera, no avatar dependency, still works end to end.

---

## 15. Flex High-ROI Additions (Fold Into Slack Time, Any Day)

**These are not a Day 13+.** Each item below is small enough (hours, not a day) to fold into whichever day already has slack — most naturally the day whose files it touches, per the "Best paired with" note on each. None of them may delay that day's own Definition of Done; if a day is running behind, skip its flex item entirely and come back to it once the core is stable, or leave it for Day 12's/Day 7's stability pass.

None of these introduce a new external service, a new redirect flow, or a new top-level folder — that's what keeps them low-risk. All of them reuse data or logic that already exists somewhere else in the system.

### 15.1 Sample JD Button
**Best paired with:** Day 1 (already built — this is a fast-follow) or Day 9 (Landing Page 2.0).
**What it is:** A "Try a sample JD" button on `Landing.jsx` / `JDInput.jsx` that pre-fills the JD textarea with one hardcoded, realistic job description and immediately triggers the existing `POST /api/jd/analyze` flow.
**Why it's cheap:** Zero backend work. One new frontend fixture file, one button, one existing API call already wired.
**Files touched:** `frontend/src/data/sampleJD.js` (2–3 hardcoded JD strings covering different seniority/tech stacks), one button in `JDInput.jsx` (and optionally `Landing.jsx`).
**Why it's high ROI:** removes the single most common live-demo stumble — fumbling to find/type a JD under pressure — with almost no build cost.

### 15.2 JD-to-Question Traceability
**Best paired with:** Day 2 or Day 3, once `retrieval.js` is producing ranked questions from real JD skills/keywords.
**What it is:** A small badge/tooltip on each question in `BehavioralInterview.jsx` / `TechnicalInterview.jsx` showing which JD skill(s)/keyword(s) it was retrieved for — e.g. "Asked because your JD mentions: distributed systems, Kafka."
**Why it's cheap:** `retrieval.js` already ranks by similarity against JD `skills`/`keywords`/`behavioralFocus`. This only requires returning the matched term(s) alongside the ranked question, not new retrieval logic.
**Files touched:** `backend/src/services/retrieval.js` (return `matchedTerms: [String]` alongside each retrieved question — additive to its existing return shape), one small `QuestionTraceBadge.jsx` component under `design-system/` or `components/shared/`.
**Why it's high ROI:** this is the single clearest "not a generic question bank" proof point you can show a judge in under 5 seconds — stronger evidence of JD-awareness than the pitch line alone.

### 15.3 Weighted Readiness Transparency
**Best paired with:** Day 5, right after `overallReadiness` is implemented as a weighted composite in `dashboard.controller.js`.
**What it is:** Surface the actual weights used (e.g. "Coding weighted 40%, Technical 35%, Behavioral 25% — because this JD skews technical") next to the readiness score on `Results.jsx`/`Dashboard.jsx`, instead of only showing the final number.
**Why it's cheap:** The weights already exist inside `dashboard.controller.js`'s composite calculation — this only requires returning them in the response and rendering one extra line of text.
**Files touched:** `backend/src/controllers/dashboard.controller.js` (add a `weights` object to the existing `GET /api/dashboard/:userId` response — update the API Contract table in Section 8 in the same change), a small text block in `Results.jsx`/`Dashboard.jsx`.
**Why it's high ROI:** directly reinforces "explainable, never a black box," which is one of the strongest, most judge-legible claims in Section 2's differentiator list — for the cost of one extra JSON field.

### 15.4 PDF Export of the Final Report
**Best paired with:** Day 6 (already scoped there as "nice only if ahead" — treat this section as the concrete spec for it).
**What it is:** A "Download report as PDF" button on `Results.jsx` producing a clean one-pager: overall score, per-mode breakdown, top 2 action items.
**Why it's cheap:** Simple HTML-to-PDF export of content already rendered on `Results.jsx` — no new backend service, no new data.
**Files touched:** one new `frontend/src/components/shared/ExportReportButton.jsx`, using a lightweight client-side HTML-to-PDF approach (e.g. rendering the existing results markup and exporting it) so there's no new backend dependency to deploy or break.
**Why it's high ROI:** gives judges something to hold onto after your demo slot ends, at very low build/deploy risk since it never leaves the browser.

### 15.5 Streaks / Consistency Badge
**Best paired with:** Day 6 (`Dashboard.jsx` — already scoped there as an optional badge; this section makes it concrete).
**What it is:** A simple "3-day practice streak" or "5 sessions this week" badge derived purely from existing `Session.createdAt` timestamps in MongoDB.
**Why it's cheap:** No new writes, no new schema field — a pure derived read over data that already exists.
**Files touched:** small aggregation added to `dashboard.controller.js`, one `StreakBadge.jsx` using `design-system/Badge`.
**Why it's high ROI:** cheap gamification that reinforces "returning candidate" framing (Section 2, differentiator #12 — progress over time) without any new infrastructure.

### 15.6 Shareable Read-Only Report Link
**Best paired with:** Day 6, right after `SessionHistory.jsx`/`Results.jsx` exist, or as a Day 12 stability-day addition if there's spare time.
**What it is:** A "Share this report" action on `Results.jsx` that generates a random opaque token tied to that session, servable at a **public, read-only** route requiring no login — so a judge can open it on their own device instead of watching your screen.
**Why it's cheap:** One new field, one new unauthenticated GET route returning a sanitized, read-only version of an existing session's report — no new external service.
**Files touched:** `Session.model.js` (add `shareToken: String`, additive only), one new route e.g. `GET /api/reports/shared/:shareToken` (update the API Contract table in Section 8), a minimal read-only report view reusing existing `Results.jsx` components.
**Why it's high ROI:** genuinely rare among competing submissions, works well in a live judging round, and costs one new route rather than a new feature area.
**Guardrail:** the shared view must never expose the candidate's email/identity or any other session's data — return only the report fields already shown on `Results.jsx`.

### 15.7 Résumé–JD Gap Analysis
**Best paired with:** Day 3, since `ResumeAnalysis.model.js` and its cosine-similarity `jdAlignmentScore` approach are already fully specified in Section 7 — this activates a placeholder rather than designing something new.
**What it is:** Résumé upload → JD-alignment scoring → gap callout, exactly as scoped in Section 3 ("MUST WORK, cut first if behind") and Section 7.
**Why it's cheap relative to its payoff:** the schema and scoring approach are already designed; what's missing is wiring: `resume.routes.js`, `resume.controller.js`, and the résumé upload field already stubbed in `JDInput.jsx` since Day 1.
**Files touched:** `backend/src/routes/resume.routes.js`, `backend/src/controllers/resume.controller.js`, `backend/src/models/ResumeAnalysis.model.js` (already specified), résumé parsing wired into the existing upload field in `JDInput.jsx`.
**Why it's high ROI:** it's one of the twelve named differentiators (Section 2, #4) and directly strengthens the "personalized, not generic" pitch — more substantive than the avatar, for comparable effort.

### 15.8 Flex Feature Priority Order (if only some fit)

If time only allows a subset, build in this order — ranked by ROI-per-hour, cheapest/safest first:

1. Sample JD Button (15.1)
2. JD-to-Question Traceability (15.2)
3. Weighted Readiness Transparency (15.3)
4. PDF Export (15.4)
5. Shareable Read-Only Report Link (15.6)
6. Streaks/Consistency Badge (15.5)
7. Résumé–JD Gap Analysis (15.7)
