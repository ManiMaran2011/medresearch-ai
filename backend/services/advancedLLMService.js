const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const call = async (messages, maxTokens = 600, temp = 0.3) => {
  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: maxTokens,
    temperature: temp,
    messages
  });
  return res.choices[0]?.message?.content || '';
};

// 1. Research Contradiction Finder
async function findContradictions(publications) {
  if (publications.length < 3) return [];
  const pubList = publications.slice(0, 8).map((p, i) =>
    `[PUB${i+1}] "${p.title}" (${p.year}): ${p.abstract?.slice(0, 250)}`
  ).join('\n\n');

  const text = await call([{
    role: 'user',
    content: `Analyze these medical research papers and identify any contradictions or conflicting findings between them.

${pubList}

Return ONLY a JSON array of contradictions found:
[
  {
    "paper1": "PUB1",
    "paper2": "PUB3",
    "finding1": "what PUB1 found",
    "finding2": "what PUB3 found",
    "explanation": "why they conflict and possible reasons",
    "severity": "major"|"minor"
  }
]

If no contradictions found, return an empty array: []`
  }], 600, 0.2);

  try {
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch { return []; }
}

// 2. Research Gap Finder
async function findResearchGaps(publications, disease, query) {
  const pubList = publications.slice(0, 8).map((p, i) =>
    `[PUB${i+1}] "${p.title}" (${p.year}): ${p.abstract?.slice(0, 200)}`
  ).join('\n\n');

  const text = await call([{
    role: 'user',
    content: `Based on this collection of research papers about "${query}" for ${disease}, identify what important questions remain unanswered in the current literature.

Papers:
${pubList}

Return ONLY a JSON array:
[
  {
    "gap": "description of the research gap",
    "importance": "why this gap matters clinically",
    "suggestedStudy": "what type of study would address this"
  }
]
Return 3-5 gaps maximum.`
  }], 500, 0.4);

  try {
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch { return []; }
}

// 3. Jargon Simplifier
async function simplifyResponse(technicalResponse) {
  return await call([
    {
      role: 'system',
      content: 'You rewrite medical text in plain English for patients with no medical background. Keep the same information but make it conversational and easy to understand. Remove all jargon. Use simple words.'
    },
    {
      role: 'user',
      content: `Rewrite this in plain English that anyone can understand:\n\n${technicalResponse}`
    }
  ], 1500, 0.3);
}

// 4. Confidence Scoring per section
async function scoreConfidence(response, publications) {
  const highCount = publications.filter(p => p.evidenceScore?.confidence === 'High').length;
  const modCount = publications.filter(p => p.evidenceScore?.confidence === 'Moderate').length;
  const totalPubs = publications.length;

  const text = await call([{
    role: 'user',
    content: `Given this medical research response and evidence quality context, rate confidence for each main section.

Response sections to rate:
- Condition Overview
- Research Insights  
- Treatment Recommendations
- Clinical Trial Highlights
- Drug Safety Notes

Evidence quality: ${highCount} high-quality papers, ${modCount} moderate, ${totalPubs} total retrieved.

Return ONLY a JSON array:
[
  {"section": "Condition Overview", "score": 8, "reason": "well established"},
  {"section": "Research Insights", "score": 7, "reason": "supported by RCTs"},
  {"section": "Treatment Recommendations", "score": 6, "reason": "some uncertainty"},
  {"section": "Clinical Trial Highlights", "score": 9, "reason": "direct trial data"},
  {"section": "Drug Safety Notes", "score": 8, "reason": "FDA data available"}
]`
  }], 300, 0.1);

  try {
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch { return []; }
}

// 5. Second Opinion Mode
async function getSecondOpinion(doctorRecommendation, publications, clinicalTrials, disease) {
  const pubList = publications.slice(0, 6).map((p, i) =>
    `[PUB${i+1}] "${p.title}" (${p.year}, ${p.evidenceScore?.confidence || 'Unknown'} evidence): ${p.abstract?.slice(0, 250)}`
  ).join('\n\n');

  const text = await call([{
    role: 'user',
    content: `A doctor recommended: "${doctorRecommendation}"

Disease context: ${disease}

Research available:
${pubList}

Analyze this recommendation against the evidence. Return ONLY a JSON object:
{
  "recommendation": "${doctorRecommendation}",
  "supporting": [
    {"evidence": "what supports this", "source": "PUB1", "strength": "strong"|"moderate"|"weak"}
  ],
  "challenging": [
    {"evidence": "what challenges this", "source": "PUB2", "strength": "strong"|"moderate"|"weak"}
  ],
  "netAssessment": "overall assessment in 2 sentences",
  "verdict": "well-supported"|"partially-supported"|"limited-evidence"|"concerning"
}`
  }], 600, 0.2);

  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch { return null; }
}

// 6. Disease Progression Timeline
async function getProgressionTimeline(disease) {
  const text = await call([{
    role: 'user',
    content: `Create a medical progression timeline for ${disease}.

Return ONLY a JSON array of stages:
[
  {
    "stage": "Early Stage",
    "timeframe": "Years 1-3",
    "symptoms": ["symptom 1", "symptom 2"],
    "treatments": ["treatment 1", "treatment 2"],
    "trialsToWatch": "what type of trials are relevant",
    "color": "green"
  }
]

Include 4-6 stages from early to advanced. Use colors: green (early), yellow (mild-moderate), orange (moderate), red (advanced).`
  }], 700, 0.3);

  try {
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch { return []; }
}

// 7. Biomarker & Genetics Panel
async function getBiomarkers(disease) {
  const text = await call([
    { role: 'system', content: 'You are a medical expert. Output ONLY valid JSON arrays. No markdown, no explanation, no code blocks. Start with [ and end with ].' },
    { role: 'user', content: `Return a JSON array of 5 key biomarkers, genetic markers, or diagnostic tests for ${disease}. Each object: name, type (genetic|biomarker|diagnostic), relevance, clinicalUse. JSON array only.` }
  ], 600, 0.1);
  try {
    const match = text.match(/\[\s\S]*/);
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      const parsed = JSON.parse(arrMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    return [
      { name: disease + ' primary biomarker', type: 'biomarker', relevance: 'Key indicator for ' + disease, clinicalUse: 'Clinical diagnosis and monitoring' },
      { name: 'Genetic screening panel', type: 'genetic', relevance: 'Identifies genetic risk factors', clinicalUse: 'Risk assessment' },
      { name: 'Inflammatory markers', type: 'biomarker', relevance: 'Indicates disease activity', clinicalUse: 'Monitoring severity' }
    ];
  } catch {
    return [{ name: disease + ' biomarker', type: 'biomarker', relevance: 'Key marker for ' + disease, clinicalUse: 'Diagnosis' }];
  }
}

// 8. Explain This Paper
async function explainPaper(paper) {
  const text = await call([
    {
      role: 'system',
      content: 'You explain medical research papers clearly. Break down what was studied, how, what was found, and why it matters — in plain language.'
    },
    {
      role: 'user',
      content: `Explain this paper in simple terms:

Title: ${paper.title}
Authors: ${(paper.authors || []).slice(0, 3).join(', ')}
Year: ${paper.year}
Abstract: ${paper.abstract}

Return ONLY a JSON object:
{
  "whatTheyStudied": "one sentence",
  "howTheyDidIt": "one sentence about methodology",
  "whatTheyFound": "2-3 key findings",
  "whyItMatters": "clinical significance",
  "limitations": "main limitation of this study",
  "plainEnglishSummary": "2-3 sentence summary anyone can understand"
}`
    }
  ], 400, 0.3);

  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch { return null; }
}

// 9. Suggested Study Design
async function suggestStudyDesign(disease, gaps) {
  const gapText = gaps.slice(0, 3).map(g => g.gap).join('\n- ');

  const text = await call([{
    role: 'user',
    content: `Based on these research gaps in ${disease} studies:
- ${gapText}

Design the ideal next clinical trial to address the most important gap.

Return ONLY a JSON object:
{
  "title": "proposed trial title",
  "hypothesis": "what the trial would test",
  "studyType": "RCT / cohort / case-control etc",
  "sampleSize": "estimated sample size",
  "duration": "estimated duration",
  "primaryEndpoint": "main outcome measure",
  "secondaryEndpoints": ["endpoint 1", "endpoint 2"],
  "eligibilityCriteria": "key inclusion/exclusion criteria",
  "estimatedCost": "rough cost estimate",
  "significance": "why this study is needed"
}`
  }], 500, 0.4);

  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch { return null; }
}

// 10. Treatment Comparison
async function compareTreatments(treatment1, treatment2, disease, publications) {
  const pubList = publications.slice(0, 8).map((p, i) =>
    `[PUB${i+1}] "${p.title}" (${p.year}): ${p.abstract?.slice(0, 200)}`
  ).join('\n\n');

  const text = await call([{
    role: 'user',
    content: `Compare these two treatments for ${disease}:
Treatment A: ${treatment1}
Treatment B: ${treatment2}

Using this research:
${pubList}

Return ONLY a JSON object:
{
  "treatmentA": {
    "name": "${treatment1}",
    "efficacy": "efficacy summary",
    "sideEffects": "main side effects",
    "evidence": "evidence quality",
    "bestFor": "which patients benefit most",
    "score": 0-10
  },
  "treatmentB": {
    "name": "${treatment2}",
    "efficacy": "efficacy summary", 
    "sideEffects": "main side effects",
    "evidence": "evidence quality",
    "bestFor": "which patients benefit most",
    "score": 0-10
  },
  "winner": "A"|"B"|"tie",
  "winnerReason": "why one is preferred or when to use each",
  "dimensions": [
    {"name": "Efficacy", "scoreA": 8, "scoreB": 6},
    {"name": "Safety", "scoreA": 7, "scoreB": 8},
    {"name": "Evidence Quality", "scoreA": 9, "scoreB": 5},
    {"name": "Accessibility", "scoreA": 6, "scoreB": 8},
    {"name": "Side Effects", "scoreA": 6, "scoreB": 7}
  ]
}`
  }], 700, 0.2);

  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch { return null; }
}

// 11. Historical Treatment Evolution
async function getTreatmentHistory(disease) {
  const text = await call([{
    role: 'user',
    content: `Create a historical timeline of treatment evolution for ${disease} from discovery to present day.

Return ONLY a JSON array:
[
  {
    "decade": "1960s",
    "year": 1967,
    "milestone": "Levodopa discovered",
    "significance": "why this was important",
    "type": "drug"|"surgery"|"therapy"|"research"|"approval"
  }
]
Return 6-10 key milestones in chronological order.`
  }], 600, 0.3);

  try {
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch { return []; }
}

module.exports = {
  findContradictions,
  findResearchGaps,
  simplifyResponse,
  scoreConfidence,
  getSecondOpinion,
  getProgressionTimeline,
  getBiomarkers,
  explainPaper,
  suggestStudyDesign,
  compareTreatments,
  getTreatmentHistory
};
