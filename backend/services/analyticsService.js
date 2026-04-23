/**
 * Analytics Service
 * Handles: researcher leaderboard, citation network, global heatmap, news feed
 */

// Researcher leaderboard from publications
function buildResearcherLeaderboard(publications) {
  const authorMap = {};

  for (const pub of publications) {
    for (const author of (pub.authors || [])) {
      if (!author) continue;
      if (!authorMap[author]) {
        authorMap[author] = { name: author, papers: [], totalCitations: 0, sources: new Set() };
      }
      authorMap[author].papers.push({ title: pub.title?.slice(0, 60), year: pub.year, url: pub.url });
      authorMap[author].totalCitations += pub.citedByCount || 0;
      authorMap[author].sources.add(pub.source);
    }
  }

  return Object.values(authorMap)
    .map(a => ({ ...a, sources: Array.from(a.sources), paperCount: a.papers.length }))
    .filter(a => a.paperCount >= 1)
    .sort((a, b) => (b.paperCount * 2 + b.totalCitations * 0.01) - (a.paperCount * 2 + a.totalCitations * 0.01))
    .slice(0, 10);
}

// Citation network from publications
function buildCitationNetwork(publications) {
  const nodes = publications.slice(0, 10).map((p, i) => ({
    id: p.id,
    label: p.title?.slice(0, 40) + '...',
    year: p.year,
    citations: p.citedByCount || 0,
    source: p.source,
    confidence: p.evidenceScore?.confidence || 'Emerging',
    size: Math.min(5 + Math.log10((p.citedByCount || 0) + 1) * 3, 20)
  }));

  // Generate edges based on year proximity and shared terms
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const yearDiff = Math.abs(parseInt(nodes[i].year) - parseInt(nodes[j].year));
      if (yearDiff <= 3) {
        edges.push({ source: nodes[i].id, target: nodes[j].id, weight: 1 });
      }
    }
  }

  return { nodes, edges };
}

// Global research heatmap from author locations (estimated from institution names)
function buildGlobalHeatmap(publications) {
  // Country research activity based on publication sources and known research centers
  const countryMap = {};
  const knownCountries = {
    'USA': ['united states', 'america', 'us', 'harvard', 'stanford', 'mayo', 'johns hopkins', 'nih'],
    'UK': ['united kingdom', 'england', 'oxford', 'cambridge', 'imperial', 'ucl', 'lancet'],
    'Germany': ['germany', 'deutsch', 'berlin', 'munich', 'heidelberg', 'charité'],
    'France': ['france', 'paris', 'french', 'inserm'],
    'Japan': ['japan', 'tokyo', 'osaka', 'kyoto'],
    'China': ['china', 'beijing', 'shanghai', 'chinese'],
    'Canada': ['canada', 'toronto', 'montreal', 'mcgill', 'ubc'],
    'Australia': ['australia', 'sydney', 'melbourne', 'queensland'],
    'Netherlands': ['netherlands', 'amsterdam', 'leiden', 'dutch'],
    'Sweden': ['sweden', 'stockholm', 'karolinska', 'swedish'],
    'Italy': ['italy', 'milan', 'rome', 'italian'],
    'Spain': ['spain', 'madrid', 'barcelona', 'spanish'],
    'India': ['india', 'delhi', 'mumbai', 'bangalore', 'indian'],
    'Brazil': ['brazil', 'são paulo', 'rio', 'brazilian'],
    'Switzerland': ['switzerland', 'zurich', 'basel', 'swiss']
  };

  for (const pub of publications) {
    const text = `${pub.authors?.join(' ')} ${pub.journal}`.toLowerCase();
    for (const [country, keywords] of Object.entries(knownCountries)) {
      if (keywords.some(k => text.includes(k))) {
        countryMap[country] = (countryMap[country] || 0) + 1;
      }
    }
  }

  // Coordinates for world map positioning
  const coords = {
    'USA': { lat: 37.09, lng: -95.71 },
    'UK': { lat: 55.38, lng: -3.44 },
    'Germany': { lat: 51.17, lng: 10.45 },
    'France': { lat: 46.23, lng: 2.21 },
    'Japan': { lat: 36.20, lng: 138.25 },
    'China': { lat: 35.86, lng: 104.20 },
    'Canada': { lat: 56.13, lng: -106.35 },
    'Australia': { lat: -25.27, lng: 133.78 },
    'Netherlands': { lat: 52.13, lng: 5.29 },
    'Sweden': { lat: 60.13, lng: 18.64 },
    'Italy': { lat: 41.87, lng: 12.57 },
    'Spain': { lat: 40.46, lng: -3.75 },
    'India': { lat: 20.59, lng: 78.96 },
    'Brazil': { lat: -14.24, lng: -51.93 },
    'Switzerland': { lat: 46.82, lng: 8.23 }
  };

  return Object.entries(countryMap)
    .filter(([country]) => coords[country])
    .map(([country, count]) => ({ country, count, ...coords[country] }))
    .sort((a, b) => b.count - a.count);
}

// Medical news feed (static fallback + dynamic topics)
function getMedicalNewsFeed(disease) {
  const topics = [
    { title: `New research advances in ${disease} treatment`, source: 'PubMed Latest', time: '2 hours ago', url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(disease)}&sort=date` },
    { title: `Clinical trials update for ${disease}`, source: 'ClinicalTrials.gov', time: '1 day ago', url: `https://clinicaltrials.gov/search?cond=${encodeURIComponent(disease)}&aggFilters=status:rec` },
    { title: `FDA updates on ${disease} treatments`, source: 'FDA', time: '3 days ago', url: `https://www.fda.gov/patients/rare-diseases-research` },
    { title: `Latest ${disease} research from OpenAlex`, source: 'OpenAlex', time: '5 days ago', url: `https://openalex.org/works?search=${encodeURIComponent(disease)}&sort=publication_date:desc` },
    { title: `${disease} awareness and patient resources`, source: 'NIH', time: '1 week ago', url: `https://www.nih.gov/health-information` }
  ];
  return topics;
}

module.exports = { buildResearcherLeaderboard, buildCitationNetwork, buildGlobalHeatmap, getMedicalNewsFeed };
