import Session from '../models/Session.model.js';

export const createSession = async (req, res, next) => {
  try {
    const { mode, jdAnalysisId, userId } = req.body;
    if (!mode) {
      return res.status(400).json({ error: 'Session mode is required' });
    }
    const newSession = await Session.create({
      userId: userId || 'guest_' + Date.now(),
      mode,
      jdSnapshot: jdAnalysisId ? { jdAnalysisId } : {},
      status: 'in_progress',
      questions: [],
    });
    return res.status(201).json({ sessionId: newSession._id.toString() });
  } catch (err) {
    next(err);
  }
};

export const getSessionById = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.json(session);
  } catch (err) {
    next(err);
  }
};

export default { createSession, getSessionById };
