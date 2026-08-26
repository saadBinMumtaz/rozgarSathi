const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiClient = {
  async getHealth() {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) {
      throw new Error(`Health check failed with status ${res.status}`);
    }
    return res.json();
  },

  async analyzeJD(text, sampleId) {
    const res = await fetch(`${API_BASE_URL}/jd/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, sampleId: sampleId || null }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to analyze JD' }));
      throw new Error(errorData.error || `Server error: ${res.status}`);
    }

    return res.json();
  },

  async createSession(mode, jdAnalysisId) {
    const res = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode, jdAnalysisId }),
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
      headers: {
        'Content-Type': 'application/json',
      },
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
      headers: {
        'Content-Type': 'application/json',
      },
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
};

export default apiClient;
