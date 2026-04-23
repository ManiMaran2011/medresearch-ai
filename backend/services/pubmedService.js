const axios = require('axios');
const xml2js = require('xml2js');

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

async function fetchPubMed(query, max = 60) {
  try {
    // Step 1: Search for IDs
    const searchRes = await axios.get(`${BASE}/esearch.fcgi`, {
      params: { db: 'pubmed', term: query, retmax: max, sort: 'pub date', retmode: 'json' },
      timeout: 15000
    });
    const ids = searchRes.data?.esearchresult?.idlist || [];
    if (!ids.length) return [];

    // Step 2: Fetch details in batches of 50
    const results = [];
    for (let i = 0; i < Math.min(ids.length, max); i += 50) {
      const batch = ids.slice(i, i + 50);
      try {
        const fetchRes = await axios.get(`${BASE}/efetch.fcgi`, {
          params: { db: 'pubmed', id: batch.join(','), retmode: 'xml' },
          timeout: 20000
        });
        const parsed = await xml2js.parseStringPromise(fetchRes.data, { explicitArray: false });
        const articles = parsed?.PubmedArticleSet?.PubmedArticle;
        if (!articles) continue;
        const arr = Array.isArray(articles) ? articles : [articles];

        for (const article of arr) {
          try {
            const med = article?.MedlineCitation;
            const art = med?.Article;
            const pmid = med?.PMID?._ || med?.PMID;
            const title = art?.ArticleTitle?._ || art?.ArticleTitle || '';
            if (!title) continue;

            // Abstract
            let abstract = '';
            const ab = art?.Abstract?.AbstractText;
            if (typeof ab === 'string') abstract = ab;
            else if (Array.isArray(ab)) abstract = ab.map(a => a?._ || a).join(' ');
            else if (ab?._) abstract = ab._;

            // Authors
            const authList = art?.AuthorList?.Author;
            const authors = authList
              ? (Array.isArray(authList) ? authList : [authList])
                  .slice(0, 6)
                  .map(a => [a.LastName, a.ForeName || a.Initials].filter(Boolean).join(' '))
                  .filter(Boolean)
              : [];

            // Year
            const pubDate = art?.Journal?.JournalIssue?.PubDate;
            const year = pubDate?.Year || pubDate?.MedlineDate?.slice(0, 4) || 'N/A';

            const journal = art?.Journal?.Title || art?.Journal?.ISOAbbreviation || '';

            if (abstract) {
              results.push({
                id: `pubmed_${pmid}`,
                title: String(title),
                abstract: abstract.slice(0, 1200),
                authors,
                year: String(year),
                journal,
                source: 'PubMed',
                url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
                pmid: String(pmid),
                relevanceScore: 0,
                evidenceScore: null
              });
            }
          } catch {}
        }
      } catch (e) { console.error('PubMed batch error:', e.message); }
      await sleep(300);
    }
    return results;
  } catch (e) {
    console.error('PubMed error:', e.message);
    return [];
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
module.exports = { fetchPubMed };
