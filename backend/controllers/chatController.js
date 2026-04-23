const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');
const { fetchPubMed } = require('../services/pubmedService');
const { fetchOpenAlex } = require('../services/openAlexService');
const { fetchTrials } = require('../services/clinicalTrialsService');
const { dedup, rankPublications, rankTrials, scoreEvidence, expandQuery } = require('../services/rankingService');
const { generateResponse, expandQueryLLM, generateFollowUps } = require('../services/llmService');
const { extractDrugs, checkDrugInteractions } = require('../services/drugService');
const { generateReport } = require('../services/reportService');

// In-memory fallback when MongoDB is offline
const memStore = {};

async function chat(req, res) {
  const start = Date.now();

  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const emit = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { message, sessionId, patientContext = {} } = req.body;
    if (!message?.trim()) { emit('error', { message: 'Message is required' }); return res.end(); }

    const sid = sessionId || uuidv4();
    emit('session', { sessionId: sid });

    // Load session
    let session = memStore[sid] || { sessionId: sid, patientContext: {}, messages: [] };
    try {
      const db = await Session.findOne({ sessionId: sid });
      if (db) session = db.toObject();
    } catch {}

    // Merge context
    if (Object.keys(patientContext).length) {
      session.patientContext = { ...session.patientContext, ...patientContext };
    }

    const disease = session.patientContext?.disease || '';
    const history = session.messages || [];

    // ── Step 1: Query Expansion ───────────────────────────────────────
    emit('pipeline', { step: 'expand', label: 'Expanding query with Llama 3.3...', progress: 8 });
    let expanded;
    try {
      const result = await expandQueryLLM(message, disease, session.patientContext);
      expanded = result.expandedQuery;
    } catch {
      expanded = expandQuery(message, disease, session.patientContext);
    }
    emit('pipeline', { step: 'expand_done', label: `Query: "${expanded.slice(0, 65)}..."`, progress: 16 });

    // ── Step 2: Parallel Retrieval ────────────────────────────────────
    emit('pipeline', { step: 'fetch', label: 'Fetching from PubMed + OpenAlex + ClinicalTrials...', progress: 24 });

    const [pubmedRes, openAlexRes, trialsRes] = await Promise.allSettled([
      fetchPubMed(expanded, 60),
      fetchOpenAlex(expanded, 80),
      fetchTrials(disease || message, message, 40)
    ]);

    const rawPubs = [
      ...(pubmedRes.status === 'fulfilled' ? pubmedRes.value : []),
      ...(openAlexRes.status === 'fulfilled' ? openAlexRes.value : [])
    ];
    const rawTrials = trialsRes.status === 'fulfilled' ? trialsRes.value : [];

    emit('pipeline', {
      step: 'fetch_done',
      label: `Retrieved ${rawPubs.length} papers + ${rawTrials.length} trials`,
      progress: 46
    });

    // ── Step 3: Rank + Score ──────────────────────────────────────────
    emit('pipeline', { step: 'rank', label: 'Ranking by relevance, recency & citations...', progress: 54 });

    const dedupedPubs = dedup(rawPubs);
    const rankedPubs = rankPublications(dedupedPubs, message, disease);
    const topPubs = rankedPubs.slice(0, 8).map(p => ({ ...p, evidenceScore: scoreEvidence(p) }));

    const dedupedTrials = dedup(rawTrials);
    const topTrials = rankTrials(dedupedTrials, message, disease).slice(0, 6);

    emit('pipeline', { step: 'rank_done', label: `Top ${topPubs.length} papers · ${topTrials.length} trials selected`, progress: 62 });

    // ── Step 4: Drug Check ────────────────────────────────────────────
    emit('pipeline', { step: 'drug', label: 'Checking drug safety via OpenFDA...', progress: 68 });
    const drugs = extractDrugs(`${message} ${disease} ${session.patientContext?.medications || ''}`);
    let drugInteractions = [];
    if (drugs.length) {
      try { drugInteractions = await checkDrugInteractions(drugs); } catch {}
    }

    // ── Step 5: LLM Reasoning ─────────────────────────────────────────
    emit('pipeline', { step: 'llm', label: 'Llama 3.3 70B reasoning over evidence...', progress: 76 });

    const aiResponse = await generateResponse({
      query: message,
      disease,
      patientContext: session.patientContext,
      publications: topPubs,
      clinicalTrials: topTrials,
      conversationHistory: history.slice(-4).map(m => ({ role: m.role, content: m.content })),
      expandedQuery: expanded,
      drugInteractions
    });

    // ── Step 6: Follow-up suggestions ────────────────────────────────
    emit('pipeline', { step: 'followup', label: 'Generating smart follow-up questions...', progress: 90 });
    let followUps = [];
    try { followUps = await generateFollowUps(message, disease, aiResponse); } catch {}

    emit('pipeline', { step: 'done', label: 'Complete!', progress: 100 });

    const processingTime = Date.now() - start;

    // ── Save session ──────────────────────────────────────────────────
    const userMsg = { role: 'user', content: message, timestamp: new Date() };
    const assistantMsg = {
      role: 'assistant', content: aiResponse, timestamp: new Date(),
      metadata: { publications: topPubs, clinicalTrials: topTrials, drugInteractions, followUps, expandedQuery: expanded, processingTime, totalFetched: rawPubs.length, totalTrialsFetched: rawTrials.length }
    };
    session.messages.push(userMsg, assistantMsg);
    memStore[sid] = session;

    try {
      await Session.findOneAndUpdate(
        { sessionId: sid },
        { messages: session.messages, patientContext: session.patientContext, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    } catch {}

    // ── Send result ───────────────────────────────────────────────────
    emit('result', {
      sessionId: sid,
      response: aiResponse,
      publications: topPubs,
      clinicalTrials: topTrials,
      drugInteractions,
      followUps,
      metadata: { processingTime, totalFetched: rawPubs.length, totalTrialsFetched: rawTrials.length, expandedQuery: expanded }
    });

    res.end();
  } catch (err) {
    console.error('Chat error:', err.message);
    emit('error', { message: err.message || 'Something went wrong' });
    res.end();
  }
}

async function report(req, res) {
  try {
    res.setHeader('Content-Type', 'text/html');
    res.send(generateReport(req.body));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { chat, report };
