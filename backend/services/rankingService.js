const STOP_WORDS = new Set(['the','a','an','and','or','in','on','at','to','for','of','with','is','are','was','were','be','been','this','that','from','by','as','it','its']);

function tokenize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^\w]/g, '').slice(0, 60);
}

function dedup(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = normalizeTitle(item.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rankPublications(pubs, query, disease) {
  const terms = tokenize(`${query} ${disease}`);
  const diseaseTerms = tokenize(disease || '');
  const now = new Date().getFullYear();

  return pubs.map(pub => {
    let score = 0;
    const titleLow = pub.title.toLowerCase();
    const abstractLow = (pub.abstract || '').toLowerCase();

    // Term frequency scoring
    for (const term of terms) {
      const inTitle = (titleLow.match(new RegExp(term, 'g')) || []).length;
      const inAbstract = (abstractLow.match(new RegExp(term, 'g')) || []).length;
      score += inTitle * 4 + inAbstract * 1;
    }

    // Disease boost
    for (const dt of diseaseTerms) {
      if (titleLow.includes(dt)) score += 5;
    }

    // Recency bonus
    const age = now - (parseInt(pub.year) || 2015);
    score += Math.max(0, 12 - age * 1.0);

    // Citation count (OpenAlex)
    if (pub.citedByCount) score += Math.log10(pub.citedByCount + 1) * 2;

    // Abstract quality
    if (pub.abstract?.length > 200) score += 2;

    return { ...pub, relevanceScore: Math.round(score * 10) / 10 };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function rankTrials(trials, query, disease) {
  const terms = tokenize(`${query} ${disease}`);
  const diseaseTerms = tokenize(disease || '');
  const statusWeight = { RECRUITING: 10, ACTIVE_NOT_RECRUITING: 7, COMPLETED: 5 };

  return trials.map(trial => {
    let score = statusWeight[trial.recruitingStatus] || 3;
    const text = `${trial.title} ${trial.summary}`.toLowerCase();

    for (const term of terms) {
      score += (text.match(new RegExp(term, 'g')) || []).length * 2;
    }
    for (const dt of diseaseTerms) {
      if (trial.title.toLowerCase().includes(dt)) score += 5;
    }

    const phase = trial.phase || '';
    if (phase.includes('3') || phase.includes('4')) score += 4;
    else if (phase.includes('2')) score += 2;

    if (trial.contacts?.length) score += 3;
    if (trial.locations?.length) score += 2;

    return { ...trial, relevanceScore: Math.round(score * 10) / 10 };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// Evidence scoring based on study type
function scoreEvidence(pub) {
  const text = `${pub.title} ${pub.abstract}`.toLowerCase();
  const now = new Date().getFullYear();
  const year = parseInt(pub.year) || 2015;
  const age = now - year;

  let confidence = 'Emerging';
  let color = 'red';
  let reasons = [];

  const highTerms = ['randomized controlled trial','rct','meta-analysis','systematic review','double-blind','phase 3','phase 4','placebo-controlled'];
  const modTerms = ['cohort study','prospective','retrospective','observational','controlled study','phase 2','longitudinal'];

  for (const t of highTerms) {
    if (text.includes(t)) { confidence = 'High'; color = 'green'; reasons.push(t); break; }
  }
  if (confidence === 'Emerging') {
    for (const t of modTerms) {
      if (text.includes(t)) { confidence = 'Moderate'; color = 'amber'; reasons.push(t); break; }
    }
  }

  if (age <= 2) reasons.push('recent (≤2yr)');
  else if (age <= 5) reasons.push('recent (≤5yr)');

  const cites = pub.citedByCount || 0;
  if (cites > 100) reasons.push(`${cites} citations`);
  else if (cites > 20) reasons.push(`${cites} citations`);

  return { confidence, color, description: confidence === 'High' ? 'Strong clinical evidence' : confidence === 'Moderate' ? 'Observational evidence' : 'Preliminary findings', reasons: reasons.slice(0, 3) };
}

function expandQuery(query, disease, ctx) {
  const parts = [];
  if (disease) parts.push(disease);
  if (query && query.toLowerCase() !== (disease || '').toLowerCase()) parts.push(query);
  if (ctx?.medications) parts.push(ctx.medications);
  return parts.filter(Boolean).join(' AND ') || query;
}

module.exports = { dedup, rankPublications, rankTrials, scoreEvidence, expandQuery, tokenize };
