const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'rozgar-sathi-auth-token';

// Get auth token from localStorage
const getAuthToken = () => localStorage.getItem(TOKEN_KEY);

// Build headers with optional auth token
const authHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

// Request deduplication cache — prevents duplicate in-flight requests
const pendingRequests = new Map();

const deduplicateRequest = (key, fn) => {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  const promise = fn().finally(() => {
    pendingRequests.delete(key);
  });
  pendingRequests.set(key, promise);
  return promise;
};

export const apiClient = {
  async getHealth() {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) {
      throw new Error(`Health check failed with status ${res.status}`);
    }
    return res.json();
  },

  // --- Authentication -------------------------------------------------------

  async signup(username, email, password, guestId) {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, guestId: guestId || null }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Signup failed' }));
      throw new Error(errorData.error || `Signup failed: ${res.status}`);
    }
    const data = await res.json();
    // Store token immediately so subsequent requests are authenticated
    localStorage.setItem(TOKEN_KEY, data.token);
    return data;
  },

  async signin(username, password) {
    const res = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Sign in failed' }));
      throw new Error(errorData.error || `Sign in failed: ${res.status}`);
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      throw new Error('Not authenticated');
    }
    return res.json();
  },

  async migrateGuestSessions(guestId) {
    const res = await fetch(`${API_BASE_URL}/auth/migrate-guest`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ guestId }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Migration failed' }));
      throw new Error(errorData.error || `Migration failed: ${res.status}`);
    }
    return res.json();
  },

  async googleVerify(idToken, guestId) {
    const res = await fetch(`${API_BASE_URL}/auth/google/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, guestId: guestId || null }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Google sign-in failed' }));
      throw new Error(errorData.error || `Google sign-in failed: ${res.status}`);
    }
    const data = await res.json();
    // Store token immediately so subsequent requests are authenticated
    localStorage.setItem(TOKEN_KEY, data.token);
    return data;
  },

  async setPassword(password) {
    const res = await fetch(`${API_BASE_URL}/auth/set-password`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to set password' }));
      throw new Error(errorData.error || `Failed to set password: ${res.status}`);
    }
    const data = await res.json();
    // Update token in case it was refreshed
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }
    return data;
  },

  async analyzeJD(text, sampleId) {
    const res = await fetch(`${API_BASE_URL}/jd/analyze`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ text, sampleId: sampleId || null }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to analyze JD' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }

    return res.json();
  },

  async createSession(mode, jdAnalysisId, userId) {
    const res = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ mode, jdAnalysisId, userId }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to create session' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }

    return res.json();
  },

  async getSession(sessionId) {
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to get session' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }

    return res.json();
  },

  async answerBehavioral(sessionId, questionId, transcript, language = 'english') {
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/answer`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ questionId, transcript, language }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to submit answer' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }

    return res.json();
  },

  async answerTechnical(sessionId, questionId, transcript, language = 'english') {
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/answer`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ questionId, transcript, language }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to submit answer' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }

    return res.json();
  },

  async translateEvaluation(evaluation, targetLanguage = 'urdu') {
    const res = await fetch(`${API_BASE_URL}/sessions/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ evaluation, targetLanguage }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to translate evaluation' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }

    return res.json();
  },

  async translateQuestion(questionText, followUpPrompts = [], targetLanguage = 'urdu') {
    const res = await fetch(`${API_BASE_URL}/sessions/translate-question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ questionText, followUpPrompts, targetLanguage }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to translate question' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }

    return res.json();
  },

  // Cloud Urdu TTS (Azure) — used by the frontend when no local Urdu voice exists.
  async synthesizeUrduSpeech(text, language = 'urdu') {
    const res = await fetch(`${API_BASE_URL}/sessions/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, language }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const err = new Error(errorData.error || `Server error: ${res.status}`);
      err.status = res.status;
      err.code = errorData.code;
      throw err;
    }

    return res.json();
  },

  // Google Translate TTS (free Urdu fallback) — proxy through backend to avoid CORS.
  async synthesizeUrduSpeechGoogle(text) {
    const res = await fetch(`${API_BASE_URL}/sessions/tts-google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const err = new Error(errorData.error || `Server error: ${res.status}`);
      err.status = res.status;
      throw err;
    }

    return res.json();
  },

  // --- Coding interview (Day 4) -------------------------------------------------

  async getCodingQuestion({ topic, difficulty, questionId, sessionId } = {}) {
    const key = `coding-question-${sessionId || 'default'}`;
    return deduplicateRequest(key, async () => {
      const res = await fetch(`${API_BASE_URL}/coding/questions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ topic, difficulty, questionId, sessionId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to fetch coding question' }));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      return res.json();
    });
  },

  async runCodingTests({ sessionId, code, language = 'javascript' }) {
    const res = await fetch(`${API_BASE_URL}/coding/run`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ sessionId, code, language }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to run tests' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }

    return res.json();
  },

  async submitCodingSolution({ sessionId, code, language = 'javascript' }) {
    const res = await fetch(`${API_BASE_URL}/coding/submit`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ sessionId, code, language }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to submit solution' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }

    return res.json();
  },

  async analyzeResume(file, linkedJDAnalysisId) {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    if (linkedJDAnalysisId) {
      formData.append('linkedJDAnalysisId', linkedJDAnalysisId);
    }

    const res = await fetch(`${API_BASE_URL}/resume/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to analyze résumé' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }

    return res.json();
  },

  async tailorResume(file, jobDescription) {
    const formData = new FormData();
    if (file) {
      formData.append('resume', file);
    }
    if (jobDescription) {
      formData.append('jobDescription', jobDescription);
    }

    const res = await fetch(`${API_BASE_URL}/resume/tailor`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to tailor resume' }));
      throw new Error(errorData.message || errorData.error || `Server error: ${res.status}`);
    }

    return res.json();
  },

  // --- Dashboard (Day 5) -------------------------------------------------

  async getDashboardData(userId) {
    const res = await fetch(`${API_BASE_URL}/dashboard/${userId}`, {
      headers: authHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to fetch dashboard data' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }

    return res.json();
  },

  // --- Coding probes (Day 5) ---------------------------------------------

  async getCodingProbes({ sessionId, persona = 'friendly' }) {
    const res = await fetch(`${API_BASE_URL}/coding/probes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, persona }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to fetch coding probes' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }

    return res.json();
  },

  async evaluateProbeAnswer({ sessionId, probeText, answer, questionTitle, language }) {
    const res = await fetch(`${API_BASE_URL}/coding/probes/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, probeText, answer, questionTitle, language }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to evaluate probe answer' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }

    return res.json();
  },

  // --- Day 6: Session History + Trend ----------------------------------------

  async getSessionHistory(userId) {
    const res = await fetch(`${API_BASE_URL}/dashboard/${userId}/history`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to fetch session history' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }
    return res.json();
  },

  async getSessionTrend(userId) {
    const res = await fetch(`${API_BASE_URL}/dashboard/${userId}/trend`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to fetch session trend' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }
    return res.json();
  },

  async getStreak(userId) {
    const res = await fetch(`${API_BASE_URL}/dashboard/${userId}/streak`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to fetch streak' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }
    return res.json();
  },

  // --- Shareable Reports (§15.6 / §22) ---------------------------------

  async generateShareToken(sessionId) {
    const res = await fetch(`${API_BASE_URL}/reports/share`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to generate share link' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }
    return res.json();
  },

  async getSharedReport(shareToken) {
    const res = await fetch(`${API_BASE_URL}/reports/shared/${shareToken}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to fetch shared report' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }
    return res.json();
  },

  // --- Job Discovery ---------------------------------------------------

  async searchJobs({ q, location, remote, page = 1, limit = 20 }) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (location) params.set('location', location);
    if (remote) params.set('remote', 'true');
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));

    const res = await fetch(`${API_BASE_URL}/jobs/search?${params.toString()}`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Job search failed' }));
      throw new Error(errorData.message || errorData.error || `Server error: ${res.status}`);
    }
    return res.json();
  },
};

export default apiClient;
