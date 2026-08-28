# Rozgar Sathi — Rules for Qoder AI

**Purpose:** This is the always-on constraint file. Every rule here applies for the entire 7-day build, not just the day it was first introduced. Attach this file to Qoder as project rules context (e.g. `.qoder/rules/architecture.md` or equivalent) so it is checked against on every generation, not just read once. When a task and a rule appear to conflict, the rule wins — flag the conflict instead of silently picking one side.

For the "why" behind these rules and the full narrative/technical context, see `Rozgar_Sathi_Qoder_Master_Context.md`. For what to build on which day, see `Rozgar_Sathi_Day_Wise_Prompts.md`.

---

## 0. Meta-Rule — How to Use This Document

- This document is a **direct instruction set, not a narrative plan**. Follow it literally.
- Do not improvise folder names, response shapes, or file placement. If a decision isn't covered here, default to the closest existing pattern in this document rather than inventing a new one.
- If a genuinely new decision is required (a new top-level folder, a new endpoint, a new schema field), **stop and flag it** rather than silently creating it.
- Treat every "Definition of Done" bullet in the day-wise plan as a test you run, not a description you skim.

---

## 1. Repository & Folder Structure Rules

- Build the exact repo layout (see Master Context, Section 5) on **Day 1** and **never restructure it** afterward.
- Do not rename folders.
- Do not flatten the structure.
- Do not introduce a different organizing pattern (e.g., feature-based folders instead of layer-based folders) partway through the build. Restructuring mid-week is the single most common way a multi-day agentic build breaks.
- Do not create new top-level folders under `src/` without updating the architecture document first.
- If a task seems to need a new folder, place the new file under the closest existing category (`services/`, `components/<mode>/`, etc.) instead of inventing one.

---

## 2. Environment & Configuration Rules

- Create `.env.example` at the repo root with exactly the documented keys. Every contributor copies it to `.env` locally.
- **Never commit the real `.env` file.**
- The server must **refuse to boot** — fail fast, with a clear console error — if `QWEN_API_KEY` or `MONGO_URI` is missing. Do not allow the server to start in a silently misconfigured state.
- Environment variables are read **only** inside `backend/src/config/env.js`. Do not scatter `process.env.X` calls across other files — every other module imports the already-validated config object from `env.js`.

---

## 3. Data Model Rules

- Create one Mongoose model file per collection under `backend/src/models/`.
- Use the field names and types exactly as specified in the architecture document — **verbatim**.
- Do not rename fields.
- Do not add undocumented fields without updating the architecture document's schema section in the same change.
- Keep field names consistent across question types wherever the concept overlaps (`difficulty`, `followUpPrompts`) so shared services can read Behavioral, Technical, and Coding questions without special-casing per mode.

---

## 4. API Contract Rules

- Build each endpoint in its named route file, delegating to its named controller file.
- Every controller function must return **exactly** the documented response shape and nothing else undocumented.
- If a field is added to a response during implementation, update the API contract table in the same change — the contract must never silently drift from the code.
- Route files stay **thin**: validate the request shape, then call the matching controller. Never put business logic directly inside a route file.
- Lock the full API surface (the 10 endpoints) on Day 1 to prevent frontend/backend drift mid-week.

---

## 5. Shared Services Rules (Non-Negotiable Architecture Boundaries)

- Build the five shared services (`ai.js`, `scoring.js`, `difficultyEngine.js`, `insightEngine.js`, `codeExecutor.js`) **before** any mode-specific logic.
- **One Qwen entry point:** no file other than `backend/src/services/ai.js` may call the Qwen API directly. Every other module needing an AI call imports `ai.js` or a higher-level service that wraps it (`scoring.js`, `insightEngine.js`).
- **No duplicated evaluation logic:** `scoring.js` is the only place in the entire codebase where an `evaluation` object is constructed, across all three modes (Behavioral, Technical, Coding). No mode-specific controller may build its own version.
- **Controllers stay thin:** route files validate input and call a controller; controllers call services; services call `ai.js`, the database, or `codeExecutor.js`. Business logic never lives directly inside a route file.
- `difficultyEngine.js` must be a **pure function with no AI call inside it** — deterministic step-up / flat / step-down logic only, with the swing capped per step so a single weak or strong answer can't cause a wild difficulty jump.
- `insightEngine.js` makes exactly **one** Qwen call over all three evaluation JSONs, looking for a repeated pattern (multi-document pattern synthesis) — not a numeric average — and is only invoked once all three modes have at least one completed session for that candidate. It is called exactly once per dashboard load, not once per mode.
- `retrieval.js` ranks candidate questions by **cosine similarity** over embeddings of the JD against the question bank, with **BM25/TF-IDF** as a fallback ranking signal. Retrieval must be deterministic given the same JD + question-bank snapshot — never re-rank via a fresh LLM call per question.
- `difficultyEngine.js`'s step logic is an **Elo-inspired bounded rating adjustment**; the per-skill running score it reads should be maintained as an **exponential moving average (EMA)**, not just the last answer's score in isolation.
- `scoring.js`'s combination of an LLM score with deterministic floor checks is an **ensemble scoring** approach — the LLM score never overrides a failed deterministic check (e.g. a failed hidden-test suite).
- `codeExecutor.js` should be implemented against **Judge0** (self-hosted or hosted) unless the deploy target rules it out, since it already provides sandboxing, timeout enforcement, and memory caps out of the box. It must **never forward a raw stack trace to the frontend** — map execution status to exactly three UI-facing states: passed, failed (with diff), error (syntax/runtime/timeout).
- If a new mode-specific file starts duplicating logic that belongs in one of the five shared services, refactor it into the shared file immediately rather than letting the duplication persist.
- If you notice yourself writing evaluation logic, difficulty logic, or a Qwen call inside a mode-specific controller: **stop** and move it into the matching service file instead.

---

## 6. Scoring & Evaluation Rules

- Every evaluation object returned must match the exact shape: `score, dimensions, evidence, strength, missing, improvement, confidenceLevel`.
- Every AI-generated score must be explainable in this order: **Score → Evidence from answer/code → What was good → What was missing → How to improve.** Never present a bare numeric score alone.
- Attach a `confidenceLevel: high | medium | low` to every evaluation (low when the answer was very short, off-topic, or the model's own reasoning was thin).
- Run **deterministic floor checks** before trusting the LLM's score: confirm the answer is non-empty, meets a minimum word count, and — for coding — that hidden tests actually passed. **Never let a hallucinated high score override a failed test suite.**
- Do not pretend AI-generated scores are perfectly objective.
- Always pass the exact rubric dimensions and a JSON schema in the system prompt so Qwen's output is parseable every time; validate the response and retry once on malformed JSON before falling back gracefully. On a second failure, throw a typed error rather than crash.

---

## 7. Bilingual & Coaching Tone Rules

- Support English, Urdu, and Roman Urdu/mixed responses.
- Feedback must be constructive, never a language-shaming exercise. Never say something like "Your English is poor" — instead identify the specific gap and give a concrete practice suggestion.
- Let the candidate set a response language preference (English / Urdu / Mixed) up front; this changes how the AI phrases feedback, not just what language it accepts.
- A "Show in Urdu" toggle reuses the same evaluation JSON, translated only at render/prompt time. **Do not re-run the whole evaluation twice** — this must remain exactly one Qwen call per answer regardless of language toggling.
- **Never penalize code-switching itself in the score** — only note it as a coaching observation. Code-switching is normal, fluent professional communication in Pakistan.

---

## 8. Question Bank Rules

- Do **not** depend on LeetCode scraping.
- Build a small, curated bank of **original** interview problems.
- Use Qwen only during development to help draft original questions; manually review and save every question before the demo.
- **Never generate a new coding problem live during an interview session** — retrieval from a validated, pre-reviewed bank only.
- Coding questions: target 20–25 total across the documented topic distribution; ship at least 12 (3 easy / 6 medium / 3 hard) by Day 4.
- Every coding question object must include an `interviewerProbes` array of 3–5 scripted probing questions — the live-coding interviewer pulls from this array and must never freestyle a probe under demo pressure.
- Behavioral bank: 15–20 curated questions covering Teamwork, Conflict, Leadership, Failure, Problem solving, Pressure, Learning, Communication.
- Technical bank: organized in per-skill clusters (3–5 questions per common JD skill), not improvised live by the LLM.

---

## 9. Sandbox & Code Execution Rules

- Prefer **Judge0** (self-hosted or hosted) as the execution backend behind `codeExecutor.js` — it enforces timeouts and memory caps natively and supports JavaScript out of the box. Only build a custom Docker-based sandbox if Judge0 cannot be deployed in the target environment.
- Enforce a hard timeout per execution (e.g., 5s) to kill infinite loops.
- Enforce a memory cap per execution (e.g., 128–256MB).
- No filesystem or network access from inside the sandbox.
- Strip `process`, `require`, and `eval`-style escapes in the JS runtime (applies whether using Judge0 or a custom sandbox).
- Queue and rate-limit executions per session to prevent quota abuse, especially during a live demo.
- Support **one coding language first: JavaScript.** Add Python second only if time remains, then C++ third. Do not build multi-language support beyond this order inside the 7-day window.
- Handle these three failure modes explicitly and distinctly (never a raw stack trace, never a hung request): empty code submitted, code with a syntax error, code that times out (report "Time Limit Exceeded" like a real judge).
- Optional stretch only, never at the cost of core scope: an **AST-based static check** (`acorn`/`esprima`) may supplement, but never replace, the LLM's code-quality evaluation.

## 9a. AI/Retrieval/Voice API Choices

- **Speech-to-text (candidate → text):** default to the browser-native **Web Speech API** (free, zero backend infrastructure). Upgrade to the **Whisper API** only as a stretch goal, specifically because it handles code-switched Urdu-English audio better — do not swap STT providers mid-week without a clear reason.
- **Text-to-speech (AI → spoken question/follow-up/probe):** default to the browser-native **Web Speech API `SpeechSynthesis`** — this is now MUST-WORK core scope, not a stretch feature. **English** remains the always-available local baseline. **Urdu TTS is now core scope**: when Urdu mode is active and the device has a local Urdu voice, use it; when it does not, fall back to **cloud Neural TTS (Azure)** so the candidate hears Urdu audio on every device. Cloud TTS is only a fallback for Urdu — never for English. If cloud TTS is unconfigured or fails, degrade to local English TTS (never block the interview). Because Urdu voice availability is inconsistent across browsers, do not require a local Urdu voice; the cloud fallback guarantees Urdu audio.
- Every piece of AI-spoken text (question, follow-up, probe, nudge) must **also render as visible text/captions at the same time** it's spoken — voice is additive, never the only channel carrying the information.
- TTS playback must be **skippable/interruptible** by the candidate at any time; never force the candidate to wait for audio to finish before they can respond.
- TTS and the candidate's microphone must never listen and speak simultaneously — gate mic listening until AI speech finishes or is skipped.
- If `SpeechSynthesis` is unsupported, blocked, or fails, fall back to text-only silently — no error interrupting the interview flow, exactly like the existing mic-permission-denied fallback.
- **Embeddings:** use a single embeddings call per session against the JD (and, for résumé gap analysis, the résumé) rather than embedding on every retrieval call. Cache embeddings for the static question bank at build/seed time, not per-request.
- **Similarity scoring:** use **cosine similarity** for all embedding-based comparisons (question retrieval, résumé-JD alignment). Do not invent a different similarity metric per feature.

---

## 10. Frontend & UI Rules

- Every new frontend screen must import from `design-system/` for buttons, cards, badges, and progress indicators. Do not build one-off inline-styled equivalents.
- Lock the design system on Day 1 — color tokens, typography scale (max 4 sizes), 4/8px spacing grid — and never rework the basics later.
- Do not build ugly functionality first and plan to redesign everything later; build polished screens alongside functional milestones.
- Use skeleton loading states, not spinners only.
- Keep the UI to exactly the 9 documented core screens — do not add screens outside this list. No avatar/visual-character screen or overlay is required — voice interaction stands on its own.
  - **This constraint governs the Core Build (Days 1–7) only.** Days 8–12 are a separate Phase 2 that intentionally adds Login/Auth, an avatar layer, and an engagement panel on top of the frozen core — see Sections 16–20. Do not backport Phase 2 UI into a Core Build day, and do not use Phase 2's looser screen count as license to add ad-hoc screens during Days 1–7.
- Design direction to hold: professional, calm, modern, enterprise-quality, minimal, interview-focused.
- Avoid: too many gradients, excessive animations, too many cards on one screen, hackathon-looking dashboards, tiny unreadable metrics.
- Keyboard-navigable interview flow — a candidate must be able to Tab/Enter through an entire session without a mouse.
- Sufficient color contrast on score badges — never rely on red/green alone; add icons or labels for colorblind users.
- All loading and error states must show visible text, never just a spinner.
- `ErrorBoundary.jsx` must wrap all three interview mode pages inside `App.jsx`.
- Typed fallback must appear automatically (no manual toggle, no reload) if mic permission is denied or STT fails.
- **One shared voice component, not three:** `VoiceQuestionPlayer.jsx` + `useTextToSpeech.js`, built once on Day 2, is reused as-is by Behavioral, Technical, and Coding (`InterviewerSidebar.jsx`). If a mode-specific page starts writing its own speech-synthesis logic, stop and reuse the shared component instead.
- A visible "AI is speaking" / "listening" state indicator must be present during voice interaction so the candidate always knows whose turn it is to talk.

---

## 11. Reliability Rules (Verify Every One, Not Just the Happy Path)

The following situations must each produce a visible, non-crashing, clearly-stated UI state — never a blank screen and never an error visible only in the console:

- Mic permission denied
- Empty answer submitted
- Qwen API call fails or times out
- Code execution service unreachable
- No hidden-test result returned
- Page refresh mid-session (session state must not be lost — persist incrementally)
- Two browser tabs open on the same session simultaneously (session state must not corrupt)
- **Speech synthesis unsupported, blocked, or failing mid-playback** (session must continue in text-only mode)

Session documents must update in MongoDB (`updatedAt` changes) after **every single answer**, not only at session completion — this is what makes refresh-safety possible.

---

## 12. Deployment Rules

- Set every environment variable on the hosting platform itself — not only in the local `.env` file.
- Configure CORS for the deployed frontend origin only.
- Rate limiting must be active on: `/api/jd/analyze`, `/api/sessions/:id/answer`, `/api/coding/run`, `/api/coding/submit`.
- Check `/api/health` immediately before any live demo.
- Confirm code execution works against the deployed `CODE_EXEC_URL`, never against `localhost` — sandboxes are the most common thing that works locally and breaks in production.
- Run the full scripted demo flow (JD → mode select → Behavioral → Technical → Coding → Dashboard) three consecutive times against the deployed URL before considering deployment done.
- Always record a screen-captured backup demo against the deployed build (not localhost) as insurance against a live failure.

---

## 13. Documentation & Drift-Prevention Rules

- Every schema or endpoint change updates the API Contract and Data Model sections of the architecture document **in the same commit or session** — the contract and the code must never silently drift apart.
- If a task seems to need a decision not covered by these documents, default to the closest existing pattern rather than inventing a new one, and flag it for the documents to be updated.

---

## 14. Scope Discipline Rules

- Do not build: a fine-tuned/custom LLM, a full model-training pipeline, large-scale user analytics, complex retraining, a huge question bank, multi-language code execution beyond JS → Python → C++, or real-time multiplayer/mock-panel-of-humans features.
- Build only the files listed for the current day unless a genuine bug is discovered in an already-completed file.
- Do not spend an entire day only on UI design — allocate roughly 55% core functionality, 20% integration/debugging, 15% UI, 5% reliability, 5% documentation/demo, per day.
- On Day 7, do not add major features — freeze the codebase once stable.

**This cut order governs the Core Build, Days 1–7.** Days 8–12 (auth, avatar, landing page 2.0, camera engagement) have their own, separate cut order — see Section 20. Avatar and Camera analysis appear below only because in the Core Build they are optional nice-to-haves layered on top of a working voice interview; once Phase 2 is reached they become that phase's actual deliverables and are no longer "first to cut."

### If behind schedule, cut in this exact order (first to go, first):

1. Advanced animations
2. Avatar (visual character layer only — voice interaction itself is protected, see Never Cut below)
3. Camera analysis
4. Interviewer persona toggle
5. PDF export
6. Résumé upload/gap analysis
7. Streaks/badges
8. Large question bank
9. Advanced analytics / progress trend chart
10. Complex progress charts

### Never cut, under any time pressure:

- Three interview modes
- Working interview flow
- **Voice round-trip** — AI speaks questions/follow-ups/probes aloud, listens to spoken answers; degrade individual voice quality (e.g. drop Urdu TTS to English TTS, or English TTS to text-only) before cutting voice entirely
- Coding execution
- Explainable evaluation
- JD personalization
- Cross-Mode Insight Engine (once built on Day 5 — it is the single best differentiator relative to effort)
- Final polished results
- Deployment / backup demo

---

## 15. The One Rule That Overrides Feature Enthusiasm

> A flawless, focused three-mode interview product that connects its own insights across modes will beat a feature-heavy system with a custom LLM that fails during the demo. **Build the product system. Do not build a model.**

---

## 16. Phase 2 Meta-Rule — How Days 8–12 Relate to the Core Build

- Days 8–12 are an **additive phase**, not a rewrite. They sit on top of the frozen Day 1–7 codebase. Do not use Phase 2 as an excuse to restructure `backend/src/` or `frontend/src/pages/` — new capability goes into new files under the existing folders (`models/`, `services/`, `components/<area>/`, `pages/`), following the exact same layer-based pattern as Section 1.
- Before starting Day 8, the Day 1–7 codebase must already satisfy every Definition of Done from Days 1–7. If it does not, fix Day 1–7 first — do not build Phase 2 on top of a known-broken core.
- Every new Phase 2 route, model field, or component follows the same rules as the Core Build: routes stay thin, `ai.js` is still the only Qwen entry point, `scoring.js` is still the only place an `evaluation` object is built, and `env.js` is still the only file reading `process.env.X`.
- If a Phase 2 feature would require changing an existing Day 1–7 file's contract (e.g. changing what `Session.userId` actually contains), that change must be **backward-compatible** — existing pre-auth sessions must keep working, not be silently orphaned. See Section 17 for the specific migration rule.

---

## 17. Authentication & User Account Rules (Day 8)

- Use **Google OAuth 2.0** as the only login method for the Extended Build. Do not build a separate email/password system alongside it — one auth method, kept simple, is more demo-proof than two half-finished ones.
- Implement Google sign-in with a standard library (`google-auth-library` or `passport-google-oauth20` on the backend) rather than hand-rolling OAuth token verification.
- On successful Google sign-in, the backend issues its own **JWT** (using the already-reserved `JWT_SECRET` env var) stored in an httpOnly cookie or returned to the frontend for an `Authorization: Bearer` header — never store the raw Google ID token as the app's session credential.
- `User.model.js` (already reserved as a placeholder in Section 5 of the Master Context) becomes real on Day 8: `{ googleId, email, name, avatarUrl, createdAt }`. Do not add fields beyond this without updating the architecture document.
- **Guest-to-user migration is mandatory, not optional.** Every session created before Day 8 (and every session created by a not-yet-logged-in visitor after Day 8) is tagged with a client-generated anonymous `guestId` (stored in `localStorage`), which is exactly what `Session.userId` already holds today. On login, the backend must re-associate any sessions matching the candidate's current `guestId` to their real authenticated `userId` — do not discard pre-auth session history.
- `authMiddleware.js` protects `/api/dashboard/:userId` and session-history routes so a user can only ever read their own sessions/dashboard, regardless of what `:userId` is passed in the URL — derive the authorized identity from the verified JWT, never trust the URL param alone.
- The product must remain usable **without** logging in — a guest can still complete a full interview end-to-end using their `guestId`. Login unlocks persistence across devices/browsers and the auth-aware dashboard; it does not gate the core interview flow. This mirrors the "never cut voice" priority: never cut guest access to interviews for the sake of forcing login.
- Never log or persist the raw Google ID token, refresh token, or `JWT_SECRET` value to console output, error messages, or any file under `docs/`.

---

## 18. Landing Page 2.0 Rules (Day 9)

- The Day 1 `Landing.jsx` is not thrown away — it is **extended**, reusing the same `design-system/` tokens locked on Day 1. Do not introduce a second, parallel color/typography system for the new landing page.
- The revamped landing page must still route into the exact same JD-input flow (`JDInput.jsx`) — do not change the entry point contract established on Day 1.
- Content sections to add, in order: hero with a one-line value prop and a single primary CTA, a "how it works" 3-step strip (Paste JD → Pick a mode → Get an evidence-backed report), a technical credibility section naming the real techniques already listed in Master Context Section 4 (RAG + cosine similarity, adaptive difficulty, ensemble scoring, sandboxed code execution) instead of vague marketing language, a 3-mode showcase (Behavioral/Technical/Coding) with one concrete example question per mode, and a footer with the Google sign-in entry point from Day 8.
- Do not fabricate statistics, user counts, testimonials, or logos that don't exist. If a "trusted by" or metrics section is wanted, use honest, verifiable framing (e.g. "Built for Pakistani job seekers" rather than an invented "10,000+ users").
- Keep the same design direction as Section 10 of Rules.md: professional, calm, modern, minimal. More technical detail is allowed and encouraged in copy; more gradients/animation is not.
- Any animation added to the landing page must degrade gracefully — no animation may block the primary CTA button from being clickable/tabbable immediately on page load.

---

## 19. AI Interviewer Avatar Rules (Day 10)

- The avatar is a **visual layer synced to the existing voice pipeline**, not a new audio pathway. It must consume the same `isSpeaking` state already exposed by `useTextToSpeech.js` (built Day 2) — do not write a second speech-detection mechanism.
- Keep the avatar simple and demo-safe: a stylized static character/shape with a small number of discrete visual states (idle, speaking, listening, thinking) driven by CSS/SVG state changes — not a full 3D model, not real per-phoneme lip-sync, and not a video/GIF pipeline. If mouth movement is included, a simple open/closed or amplitude-driven pulse tied to `isSpeaking` is sufficient; do not attempt true viseme-accurate lip-sync inside this build window.
- `components/avatar/InterviewerAvatar.jsx` is the **one** avatar component, reused by Behavioral, Technical, and Coding — exactly the same reuse pattern already enforced for `VoiceQuestionPlayer.jsx` in Section 10. Do not build a separate avatar per mode.
- The avatar renders **next to** `VoiceQuestionPlayer.jsx`'s caption text, never instead of it — captions stay visible at all times regardless of avatar state, for accessibility and for the case where the avatar itself fails to render.
- If the avatar component throws or fails to load, the interview must continue in voice/text-only mode exactly as it already does when TTS is unsupported (Section 9/11) — the avatar is a progressive enhancement, never a blocking dependency of the interview flow.
- Do not add camera-driven or MediaPipe-driven behavior to the avatar in this same day — engagement analysis is a separate concern built on Day 11 and communicates through its own hook, not through the avatar component directly.

---

## 20. MediaPipe Camera Engagement Analysis Rules (Day 11)

- Camera access is **strictly opt-in**, per session, with a visible on/off toggle. Interviews must remain fully functional with the camera off — this is the same "must degrade gracefully" pattern already required for mic/TTS in Sections 9 and 11.
- Use a client-side MediaPipe solution (Face Landmarker / Face Mesh via `@mediapipe/tasks-vision` or the CDN build) running **entirely in the browser**. Do not send raw video frames, snapshots, or recordings to the backend at any point.
- Only **derived numeric signals** may ever leave the browser: e.g. a rolling eye-contact percentage, a posture/facing-camera boolean, a blink-rate-derived attentiveness estimate. Define the exact signal shape once in `EngagementSnapshot` and reuse it — do not invent a new ad-hoc shape per mode.
- `services/mediapipeEngagement.js` (frontend) owns all MediaPipe setup/teardown and signal computation behind one hook, `useEngagementTracking.js`. No other component talks to MediaPipe directly.
- Engagement signals are **coaching context, not a score input.** They must never silently modify `evaluation.score` inside `scoring.js` — Section 5/6's rule that `scoring.js` is the only place an evaluation is constructed, and that scores stay explainable, still applies. Engagement data may only appear as a separate, clearly-labeled observation (e.g. "You looked away from the camera during 40% of this answer — practice maintaining eye contact with the camera lens."), never blended into the numeric score without the candidate being told why.
- Explicitly handle: camera permission denied, no face detected, multiple faces detected, and MediaPipe failing to load — each must degrade to "engagement tracking unavailable this session" with the interview continuing normally, never a blocking error.
- Stop and release the camera stream (`getUserMedia` track) immediately when a session ends, when the candidate toggles the camera off, or when the component unmounts — never leave a hot camera indicator on after the interview is over.
- Store only session-level aggregate engagement (e.g. average eye-contact %) on the `Session` document, never a frame-by-frame log — this keeps MongoDB documents small and avoids storing anything resembling biometric video data.

---

## 21. Phase 2 Deployment & Scope-Cut Rules (Day 12)

- Google OAuth requires real redirect URIs — add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` to `.env.example`, and register the **deployed** frontend/backend URLs (not `localhost`) in the Google Cloud Console OAuth consent screen before the final demo.
- CORS must be updated to allow the deployed frontend origin to complete the OAuth redirect round-trip, in addition to the existing API CORS rule from Section 12.
- MediaPipe assets (model files) must be confirmed to load correctly from the deployed origin, not just localhost — CDN or bundled model files can silently 404 behind a different CSP/hosting config in production.

### If behind schedule on Days 8–12, cut in this exact order:

1. Interviewer persona-linked avatar expressions (keep the avatar to a single idle/speaking state only)
2. MediaPipe engagement analysis (camera toggle can simply be removed/hidden for the demo)
3. Landing Page 2.0 extra sections (keep the Day 1 landing page as-is)
4. Guest-to-session migration polish (keep guest and logged-in history separate rather than merged, and say so plainly in the UI)
5. Google Auth itself, only as an absolute last resort — if cut, the product reverts to guest-only mode exactly as it already works after Day 1

### Never cut from Phase 2, once started:

- The Day 1–7 core product remaining fully functional and undisturbed
- Guest access to interviews without requiring login

---

## 22. Flex High-ROI Addition Rules (Section 15 of Master Context)

- These seven additions are **slack-time work, not a scheduled day.** None of them may be started until the day they're paired with (per Master Context Section 15) has already met its own Definition of Done. Core scope always wins over a flex feature.
- Every flex addition reuses an existing schema, service, or component rather than introducing a new one:
  - JD-to-Question Traceability extends `retrieval.js`'s existing return shape — it does not add a second retrieval path.
  - Weighted Readiness Transparency exposes weights `dashboard.controller.js` already computes — it does not introduce a new scoring formula.
  - Streaks read existing `Session.createdAt` timestamps — no new write path, no new field beyond what's needed for the badge computation itself.
  - Résumé–JD Gap Analysis activates the already-specified `ResumeAnalysis.model.js` from Section 7 — do not redesign its schema or scoring approach.
- **Sample JD content lives in one fixture file** (`frontend/src/data/sampleJD.js`), never scattered as inline strings across components — this keeps it easy to update and keeps `JDInput.jsx`/`Landing.jsx` free of hardcoded content.
- **The Shareable Read-Only Report Link is public and unauthenticated by design** — this makes it a strict exception to the "protect user data" posture in Section 17. The exposed route must return only the fields already visible on `Results.jsx` (scores, evidence, evaluation) and must never include the candidate's email, name, `userId`, or `googleId`, even if the underlying session document has them. Treat `shareToken` as a capability token: anyone holding it can view that one report, and nothing else.
- **PDF Export must stay client-side.** Do not stand up a new backend PDF-rendering service for this — it adds a new deploy dependency for a feature that's supposed to be near-zero-risk. Render from the DOM/data already on `Results.jsx`.
- If a flex addition would require changing the API Contract table (Section 8 of Master Context) or a Data Model schema, that change must be made in the same commit/session as the code — same drift-prevention discipline as Section 13, not a special exception for being "just a small feature."
- If, once started, a flex addition turns out to need more than a few hours or starts touching files outside the ones listed for it in Master Context Section 15, stop and treat it as out of scope for that day rather than letting it expand — reschedule it for a later slack window instead.

---

## 23. High-Risk Day Hardening Rules

Sections 1–22 already cover correctness. This section exists because correctness and demo-safety are not the same thing — some days can pass every Definition of Done and still fail live for a reason the Definition of Done never tested. The days below are ranked by combined risk (new external infra, security-sensitive surface, silent-failure potential, or deployment-boundary exposure) and each gets a mandatory hardening pass beyond its normal Verification Prompt.

**General rule for all days flagged below:** the hardening pass is not optional and is not satisfied by re-reading code. It requires actually triggering the failure condition and observing real behavior — a report that says "this should handle it correctly" without having run it does not count as passing.

### Day 2 & 3 — Voice Foundation Hardening
- Test with `SpeechSynthesis`/`SpeechRecognition` genuinely unavailable (not just theoretically unsupported) — use a browser/profile where it's actually absent, not just assumed absent.
- Test an answer given in heavy code-switched Roman Urdu and confirm `scoring.js` does not silently misfire or produce a `confidenceLevel` that doesn't reflect genuine uncertainty.
- Before Day 3's `scoring.js` refactor is considered done, re-run at least one full Day 2 Behavioral session end-to-end to confirm the refactor didn't regress Behavioral scoring — a shared-file refactor is only safe if the thing that already depended on it still works, not just the new thing that motivated the refactor.

### Day 4 — Coding Sandbox Hardening (highest technical risk in the Core Build)
- Submit code containing an intentional infinite loop, a fork-bomb-style pattern, and an attempt to access `process`/`require`/`eval`-style escapes — confirm each is killed/blocked and none of them hang the request, crash the server, or leak a raw stack trace.
- Confirm the timeout and memory cap are enforced by the sandbox itself (Judge0 or equivalent), not by a client-side `setTimeout` that merely stops *displaying* a result while the server-side process keeps running unbounded.
- Confirm concurrent submissions from two different sessions don't share or leak state, and that a queued/rate-limited submission fails with a clear UI message rather than silently hanging.
- Do not consider Day 4 done until all three adversarial inputs above have been triggered and observed, not just the three documented reliability cases (empty code, syntax error, timeout) from the original Definition of Done.

### Day 5 — Insight Engine Data-Integrity Hardening
- Before building `insightEngine.js`, spot-check 3–5 real `evaluation` objects already stored from Days 2–4 and confirm their `evidence`/`strength`/`missing` fields contain genuinely specific, non-generic content — if upstream evaluations are vague, the insight engine will produce a vague synthesis and nothing in Day 5 itself will surface that as a bug.
- After building it, deliberately test with a candidate who performed consistently (no real cross-mode pattern) and confirm the output doesn't fabricate a false pattern just to have something to say — a false-positive "insight" is worse than an honest "no strong pattern detected yet."
- Confirm `insightEngine.js`'s single Qwen call actually fails gracefully (typed error, not a crash) if the JSON schema validation fails twice in a row, exactly as `ai.js`'s retry-once contract requires.

### Day 7 & 12 — Deployment Hardening (both Core and Phase 2)
- Never trust a `localhost` pass as evidence a deployed pass will happen. Re-run every adversarial Day 4 sandbox test (infinite loop, escape attempt) against the **deployed** `CODE_EXEC_URL` specifically, not just the deployed frontend/backend — this is the single most common gap between a working local demo and a broken live one.
- For Day 12 specifically: register the deployed frontend and backend URLs in the Google Cloud Console OAuth consent screen and authorized redirect URIs **before** attempting a deployed login test, not as a reaction to it failing. Confirm the redirect URI registered matches the deployed callback URL exactly, including protocol (`https://`) and trailing slashes — this exact-match requirement is the most common source of a working-locally, broken-live OAuth failure.
- Run the full scripted demo flow at least once from a device/network that is NOT the one used for development all week (e.g. phone hotspot, different browser profile with no cached dev-only cookies/localStorage) — cached local state can hide bugs a fresh session would immediately hit.

### Day 8 — Auth Hardening
- Test login, logout, and re-login in sequence and confirm no duplicate `User` documents are created for the same `googleId`.
- Test the guest-to-user merge with **two different guestId sessions** merging into the same account (e.g. candidate practiced on two different browsers before logging in) and confirm both merge correctly with no data loss or duplication.
- Confirm a JWT from a logged-out/revoked session is actually rejected by `authMiddleware.js`, not just that the frontend stops sending it.

### Day 11 — MediaPipe Hardening
- Test with the camera physically covered/blocked (not just permission-denied) and confirm "no face detected" degrades cleanly rather than reporting a stale or default engagement value.
- Test with two people visible in frame and confirm the "multiple faces detected" case is handled explicitly rather than silently averaging or picking one arbitrarily.
- Confirm the camera stream is released even when the browser tab is closed or refreshed mid-session, not just on a clean "end session" click.

### General Buffer Guidance
Days 4, 5, 7, and 12 are the days most likely to convert "ran out of time" into "demo breaks," per the risk ranking discussed with the candidate. If the schedule is tight, protect buffer time on these four specifically before protecting it on any other day — cutting scope elsewhere (per the existing Section 14/21 cut orders) is preferable to compressing the hardening pass on these four.
