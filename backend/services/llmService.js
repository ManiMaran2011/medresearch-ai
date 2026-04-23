const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are MedResearch AI — an advanced medical research reasoning engine powered by Llama 3.3 70B.

Your role is to synthesize peer-reviewed literature and clinical trial data into structured, evidence-based insights for healthcare research.

STRICT RULES:
1. NEVER hallucinate or invent citations — only reference provided research data
2. Always cite sources using [PUB1], [PUB2], [TRIAL1] etc. from the provided data
3. Be specific, evidence-backed, and personalized to the patient context
4. Structure every response with clear markdown headers
5. Flag any drug safety concerns clearly with ⚠️
6. Be honest about evidence quality — distinguish RCTs from observational studies`;

async function generateResponse({ query, disease, patientContext, publications, clinicalTrials, conversationHistory = [], expandedQuery, drugInteractions = [] }) {
  try {
    const pubContext = publications.slice(0, 8).map((p, i) =>
      `[PUB${i+1}]\nTitle: ${p.title}\nSource: ${p.source} | Year: ${p.year} | Evidence: ${p.evidenceScore?.confidence || 'Unknown'}\nAuthors: ${(p.authors || []).slice(0, 3).join(', ')}\nAbstract: ${p.abstract}\nURL: ${p.url}`
    ).join('\n\n---\n\n');

    const trialContext = clinicalTrials.slice(0, 6).map((t, i) =>
      `[TRIAL${i+1}]\nTitle: ${t.title}\nStatus: ${t.recruitingStatus} | Phase: ${t.phase}\nSummary: ${t.summary}\nEligibility: ${t.eligibility?.criteria?.slice(0, 300)}\nLocations: ${t.locations?.map(l => [l.city, l.country].filter(Boolean).join(', ')).join(' | ')}\nURL: ${t.url}`
    ).join('\n\n---\n\n');

    const drugContext = drugInteractions.length > 0
      ? `\n\n== DRUG SAFETY DATA (OpenFDA) ==\n${drugInteractions.map(d => `${d.drug}: Top reactions — ${d.topReactions?.slice(0, 4).map(r => `${r.reaction} (${r.count} reports)`).join(', ')}`).join('\n')}`
      : '';

    const userMessage = `PATIENT CONTEXT:
${patientContext?.name ? `Name: ${patientContext.name}` : ''}
${patientContext?.age ? `Age: ${patientContext.age}` : ''}
${patientContext?.gender ? `Gender: ${patientContext.gender}` : ''}
${patientContext?.disease ? `Condition: ${patientContext.disease}` : ''}
${patientContext?.location ? `Location: ${patientContext.location}` : ''}
${patientContext?.medications ? `Medications: ${patientContext.medications}` : ''}

QUERY: "${query}"
${expandedQuery ? `EXPANDED SEARCH: ${expandedQuery}` : ''}

== RETRIEVED PUBLICATIONS (${publications.length} papers, showing top 8) ==
${pubContext || 'No publications retrieved for this query.'}

== RETRIEVED CLINICAL TRIALS (${clinicalTrials.length} trials, showing top 6) ==
${trialContext || 'No clinical trials retrieved for this query.'}
${drugContext}

Please provide a comprehensive research response with these exact sections:

## 🔬 Condition Overview
Brief, clear overview of the condition and query context.

## 📚 Key Research Insights
Evidence-based insights from the publications. Cite every claim with [PUB#]. Distinguish high-evidence (RCT/meta-analysis) from emerging findings.

## 🧪 Clinical Trial Highlights
Highlight the most relevant active and completed trials. Cite with [TRIAL#]. Note recruitment status and eligibility.

## ⚠️ Drug Safety & Interactions
Only include if drug data is available. Flag any concerns clearly.

## 💡 Personalized Recommendations
Tailored specifically to this patient's condition, location, and context.

## 📋 Important Disclaimer
Brief medical disclaimer.`;

    const messages = [
      ...conversationHistory.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2048,
      temperature: 0.3,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]
    });

    return response.choices[0]?.message?.content || 'Unable to generate response.';
  } catch (err) {
    console.error('Groq LLM error:', err.message);
    throw new Error(`LLM error: ${err.message}`);
  }
}

async function expandQueryLLM(query, disease, patientContext) {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 150,
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: `You are a medical search query optimizer. Respond with ONLY a valid JSON object, no other text.

Query: "${query}"
Disease: "${disease || 'not specified'}"
Location: "${patientContext?.location || 'not specified'}"

Return exactly: {"expandedQuery": "optimized medical search query", "keyTerms": ["term1", "term2", "term3"]}`
      }]
    });

    const text = response.choices[0]?.message?.content || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return { expandedQuery: `${disease || ''} ${query}`.trim(), keyTerms: [] };
  } catch {
    return { expandedQuery: `${disease || ''} ${query}`.trim(), keyTerms: [] };
  }
}

async function generateFollowUps(query, disease, response) {
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 200,
      temperature: 0.4,
      messages: [{
        role: 'user',
        content: `Based on this medical research query and response, suggest 3 intelligent follow-up questions a patient or doctor would ask next.

Original query: "${query}"
Disease context: "${disease || 'general'}"

Return ONLY a JSON array: ["question 1?", "question 2?", "question 3?"]`
      }]
    });

    const text = res.choices[0]?.message?.content || '';
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return [];
  } catch {
    return [];
  }
}

module.exports = { generateResponse, expandQueryLLM, generateFollowUps };
