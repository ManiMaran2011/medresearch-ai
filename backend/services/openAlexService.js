const axios = require('axios');

async function fetchOpenAlex(query, max = 80) {
  const results = [];
  const perPage = 50;
  const pages = Math.ceil(max / perPage);

  for (let page = 1; page <= Math.min(pages, 3); page++) {
    try {
      const res = await axios.get('https://api.openalex.org/works', {
        params: {
          search: query,
          'per-page': perPage,
          page,
          sort: 'relevance_score:desc',
          filter: 'from_publication_date:2015-01-01'
        },
        headers: { 'User-Agent': 'MedResearch/1.0 (mailto:research@medresearch.app)' },
        timeout: 15000
      });

      const works = res.data?.results || [];
      if (!works.length) break;

      for (const w of works) {
        try {
          const title = w.title || w.display_name || '';
          if (!title) continue;

          const abstract = w.abstract_inverted_index
            ? rebuildAbstract(w.abstract_inverted_index)
            : '';

          const authors = (w.authorships || [])
            .slice(0, 6)
            .map(a => a.author?.display_name || '')
            .filter(Boolean);

          const year = String(w.publication_year || w.publication_date?.slice(0, 4) || 'N/A');
          const journal = w.primary_location?.source?.display_name || w.host_venue?.display_name || '';
          const doi = w.doi || '';
          const url = w.primary_location?.landing_page_url ||
            (doi ? `https://doi.org/${doi.replace('https://doi.org/', '')}` : '') ||
            w.id || '';

          results.push({
            id: `openalex_${w.id?.split('/').pop()}`,
            title,
            abstract: abstract.slice(0, 1200),
            authors,
            year,
            journal,
            source: 'OpenAlex',
            url,
            citedByCount: w.cited_by_count || 0,
            relevanceScore: 0,
            evidenceScore: null
          });
        } catch {}
      }

      if (results.length >= max) break;
      await sleep(250);
    } catch (e) {
      console.error(`OpenAlex page ${page} error:`, e.message);
      break;
    }
  }
  return results;
}

function rebuildAbstract(index) {
  try {
    const positions = [];
    for (const [word, pos] of Object.entries(index)) {
      for (const p of pos) positions.push({ word, p });
    }
    return positions.sort((a, b) => a.p - b.p).map(x => x.word).join(' ');
  } catch { return ''; }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
module.exports = { fetchOpenAlex };
