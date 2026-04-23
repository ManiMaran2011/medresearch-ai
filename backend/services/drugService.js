const axios = require('axios');

const KNOWN_DRUGS = ['levodopa','carbidopa','warfarin','aspirin','ibuprofen','metformin','insulin',
  'lisinopril','atorvastatin','omeprazole','amoxicillin','prednisone','sertraline','fluoxetine',
  'gabapentin','tramadol','morphine','acetaminophen','paracetamol','donepezil','memantine',
  'riluzole','baclofen','temozolomide','bevacizumab','pembrolizumab','nivolumab','erlotinib',
  'vitamin d','melatonin','imatinib','methotrexate','cyclophosphamide','tamoxifen','anastrozole'];

function extractDrugs(text) {
  const lower = text.toLowerCase();
  return [...new Set(KNOWN_DRUGS.filter(d => lower.includes(d)))];
}

async function checkDrugInteractions(drugs) {
  const results = [];
  for (const drug of drugs.slice(0, 4)) {
    try {
      const res = await axios.get('https://api.fda.gov/drug/event.json', {
        params: { search: `patient.drug.medicinalproduct:"${drug}"`, limit: 1, count: 'patient.reaction.reactionmeddrapt.exact' },
        timeout: 8000
      });
      const reactions = res.data?.results || [];
      if (reactions.length) {
        results.push({ drug, topReactions: reactions.slice(0, 5).map(r => ({ reaction: r.term, count: r.count })), source: 'OpenFDA' });
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  return results;
}

module.exports = { extractDrugs, checkDrugInteractions };
