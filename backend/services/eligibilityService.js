const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function checkEligibility(patientContext, trials) {
  if (!trials?.length || !patientContext?.disease) return [];

  const results = [];

  for (const trial of trials.slice(0, 6)) {
    try {
      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 300,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: `You are a clinical trial eligibility assessor. Given a patient profile and trial eligibility criteria, determine if the patient is eligible.

Patient Profile:
- Name: ${patientContext.name || 'Unknown'}
- Age: ${patientContext.age || 'Not specified'}
- Gender: ${patientContext.gender || 'Not specified'}
- Condition: ${patientContext.disease}
- Location: ${patientContext.location || 'Unknown'}
- Medications: ${patientContext.medications || 'None listed'}

Trial: ${trial.title}
Status: ${trial.recruitingStatus}
Phase: ${trial.phase}
Eligibility Criteria: ${trial.eligibility?.criteria?.slice(0, 500) || 'Not specified'}
Age Range: ${trial.eligibility?.minAge || 'N/A'} - ${trial.eligibility?.maxAge || 'N/A'}
Sex: ${trial.eligibility?.sex || 'All'}
Locations: ${trial.locations?.map(l => [l.city, l.country].filter(Boolean).join(', ')).join(' | ') || 'Not specified'}

Respond with ONLY a JSON object:
{
  "eligible": "yes" | "partial" | "no" | "unknown",
  "score": 0-100,
  "checks": [
    {"criterion": "condition match", "status": "pass"|"fail"|"unknown", "note": "brief note"},
    {"criterion": "location", "status": "pass"|"fail"|"unknown", "note": "brief note"},
    {"criterion": "medications", "status": "pass"|"fail"|"unknown", "note": "brief note"},
    {"criterion": "recruiting status", "status": "pass"|"fail"|"unknown", "note": "brief note"}
  ],
  "summary": "one sentence summary"
}`
          }
        ]
      });

      const text = res.choices[0]?.message?.content || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        results.push({ trialId: trial.id, trialTitle: trial.title, trialUrl: trial.url, ...parsed });
      }
    } catch {
      results.push({
        trialId: trial.id,
        trialTitle: trial.title,
        trialUrl: trial.url,
        eligible: 'unknown',
        score: 50,
        checks: [],
        summary: 'Could not assess eligibility automatically'
      });
    }

    await new Promise(r => setTimeout(r, 200));
  }

  return results;
}

module.exports = { checkEligibility };
