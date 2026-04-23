const router = require('express').Router();
const Session = require('../models/Session');

router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find({}, 'sessionId patientContext createdAt updatedAt messages')
      .sort({ updatedAt: -1 }).limit(20).lean();
    res.json(sessions.map(s => ({
      sessionId: s.sessionId,
      patientContext: s.patientContext,
      messageCount: s.messages?.length || 0,
      preview: s.messages?.[0]?.content?.slice(0, 70) || '',
      updatedAt: s.updatedAt
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Session.deleteOne({ sessionId: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
