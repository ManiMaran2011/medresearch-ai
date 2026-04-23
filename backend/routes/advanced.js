const router = require('express').Router();
const { runDebate } = require('../services/debateService');
const { checkEligibility } = require('../services/eligibilityService');
const {
  findContradictions, findResearchGaps, simplifyResponse, scoreConfidence,
  getSecondOpinion, getProgressionTimeline, getBiomarkers, explainPaper,
  suggestStudyDesign, compareTreatments, getTreatmentHistory
} = require('../services/advancedLLMService');
const { buildResearcherLeaderboard, buildCitationNetwork, buildGlobalHeatmap, getMedicalNewsFeed } = require('../services/analyticsService');

// AI vs AI Debate
router.post('/debate', async (req, res) => {
  try {
    const result = await runDebate(req.body);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Trial eligibility checker
router.post('/eligibility', async (req, res) => {
  try {
    const { patientContext, trials } = req.body;
    const results = await checkEligibility(patientContext, trials);
    res.json({ results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Contradiction finder
router.post('/contradictions', async (req, res) => {
  try {
    const { publications } = req.body;
    const results = await findContradictions(publications);
    res.json({ contradictions: results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Research gap finder
router.post('/gaps', async (req, res) => {
  try {
    const { publications, disease, query } = req.body;
    const gaps = await findResearchGaps(publications, disease, query);
    const studyDesign = gaps.length ? await suggestStudyDesign(disease, gaps) : null;
    res.json({ gaps, studyDesign });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Jargon simplifier
router.post('/simplify', async (req, res) => {
  try {
    const { response } = req.body;
    const simplified = await simplifyResponse(response);
    res.json({ simplified });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Confidence scoring
router.post('/confidence', async (req, res) => {
  try {
    const { response, publications } = req.body;
    const scores = await scoreConfidence(response, publications);
    res.json({ scores });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Second opinion
router.post('/second-opinion', async (req, res) => {
  try {
    const { recommendation, publications, clinicalTrials, disease } = req.body;
    const opinion = await getSecondOpinion(recommendation, publications, clinicalTrials, disease);
    res.json({ opinion });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Disease progression timeline
router.post('/progression', async (req, res) => {
  try {
    const { disease } = req.body;
    const timeline = await getProgressionTimeline(disease);
    res.json({ timeline });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Biomarkers
router.post('/biomarkers', async (req, res) => {
  try {
    const { disease } = req.body;
    const biomarkers = await getBiomarkers(disease);
    res.json({ biomarkers });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Explain paper
router.post('/explain-paper', async (req, res) => {
  try {
    const { paper } = req.body;
    const explanation = await explainPaper(paper);
    res.json({ explanation });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Treatment comparison
router.post('/compare', async (req, res) => {
  try {
    const { treatment1, treatment2, disease, publications } = req.body;
    const comparison = await compareTreatments(treatment1, treatment2, disease, publications);
    res.json({ comparison });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Treatment history
router.post('/history', async (req, res) => {
  try {
    const { disease } = req.body;
    const history = await getTreatmentHistory(disease);
    res.json({ history });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Analytics - leaderboard, citation network, heatmap, news
router.post('/analytics', async (req, res) => {
  try {
    const { publications, disease } = req.body;
    const leaderboard = buildResearcherLeaderboard(publications || []);
    const citationNetwork = buildCitationNetwork(publications || []);
    const heatmap = buildGlobalHeatmap(publications || []);
    const news = getMedicalNewsFeed(disease || 'medical research');
    res.json({ leaderboard, citationNetwork, heatmap, news });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
