# Day 1 Handoff Notes — Architectural Decisions & Workarounds

This document records factual judgment calls, workarounds, and library choices made during the Day 1 foundation build that are not explicitly detailed in `Rozgar_Sathi_Rules.md` or `Rozgar_Sathi_Qoder_Master_Context.md`.

- **AI Model Identifier & Endpoint Protocol:** Interfaced `backend/src/services/ai.js` with `https://dashscope.aliyuncs.com/compatible-mode/v1` using model ID `nemotron-3-ultra-550b-a55b:free` for OpenAI-compatible completions.
- **AI Response Formatting Clean-Up:** Added regex preprocessing (`rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()`) in `callQwen()` prior to `JSON.parse` to handle markdown code block wrappers emitted by the LLM.
- **Qwen API Single-Retry Logic:** Wrapped `callQwen()` calls in a 2-attempt try/catch loop to retry once on malformed JSON or HTTP errors before failing over to fallback mechanisms.
- **Deterministic JD Extraction Fallback:** Added `fallbackExtractJD()` in `backend/src/services/ai.js` to parse role, skills, experience level, and focus areas heuristically when the Qwen API is unreachable, ensuring `/api/jd/analyze` functions offline.
- **Root-Level `.env` Resolution:** Configured `backend/src/config/env.js` using `path.resolve(__dirname, '../../../.env')` to load environment variables from the workspace root `.env` file.
- **Fail-Fast Server Boot Validation:** Enforced process termination (`process.exit(1)`) in `env.js` if `QWEN_API_KEY` or `MONGO_URI` are missing at backend launch.
- **Frontend API Client Default Base URL:** Configured `frontend/src/api/client.js` with `import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'` for development environment fallback.
- **Complete Section 8 Route & Controller Scaffolding:** Scaffolded and mounted handlers for all Section 8 endpoints (`session`, `resume`, `behavioral`, `technical`, `coding`, `dashboard`) returning valid schema/contract shapes so that the entire API surface specified in Section 8 exists on Day 1.
