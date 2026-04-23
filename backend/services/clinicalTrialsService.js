const axios = require('axios');

async function fetchTrials(disease, intervention = '', max = 40) {
  const allTrials = [];
  const statuses = ['RECRUITING', 'ACTIVE_NOT_RECRUITING', 'COMPLETED'];
  const perStatus = Math.ceil(max / statuses.length);

  for (const status of statuses) {
    try {
      const res = await axios.get('https://clinicaltrials.gov/api/v2/studies', {
        params: {
          'query.cond': disease,
          'query.intr': intervention || undefined,
          'filter.overallStatus': status,
          pageSize: perStatus,
          format: 'json'
        },
        timeout: 15000
      });

      const studies = res.data?.studies || [];

      for (const study of studies) {
        try {
          const proto = study.protocolSection;
          const id = proto?.identificationModule?.nctId;
          if (!id) continue;

          const title = proto?.identificationModule?.briefTitle ||
                        proto?.identificationModule?.officialTitle || '';
          const recruitingStatus = proto?.statusModule?.overallStatus || status;
          const phase = proto?.designModule?.phases?.join(', ') || 'N/A';
          const summary = proto?.descriptionModule?.briefSummary || '';

          const elig = proto?.eligibilityModule || {};
          const eligibilityCriteria = elig.eligibilityCriteria || '';
          const minAge = elig.minimumAge || 'N/A';
          const maxAge = elig.maximumAge || 'N/A';
          const sex = elig.sex || 'All';

          const locMod = proto?.contactsLocationsModule || {};
          const locations = (locMod.locations || []).slice(0, 4).map(l => ({
            facility: l.facility || '',
            city: l.city || '',
            country: l.country || ''
          }));

          const contacts = (locMod.centralContacts || []).slice(0, 2).map(c => ({
            name: c.name || '',
            phone: c.phone || '',
            email: c.email || ''
          }));

          const startDate = proto?.statusModule?.startDateStruct?.date || '';
          const completionDate = proto?.statusModule?.completionDateStruct?.date || '';

          allTrials.push({
            id: `ct_${id}`,
            nctId: id,
            title,
            recruitingStatus,
            phase,
            summary: summary.slice(0, 800),
            eligibility: { criteria: eligibilityCriteria.slice(0, 600), minAge, maxAge, sex },
            locations,
            contacts,
            startDate,
            completionDate,
            url: `https://clinicaltrials.gov/study/${id}`,
            source: 'ClinicalTrials.gov',
            relevanceScore: 0
          });
        } catch {}
      }
    } catch (e) { console.error(`Trials ${status} error:`, e.message); }
    await sleep(300);
  }
  return allTrials;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
module.exports = { fetchTrials };
