const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function runDebate({ query, disease, publications, clinicalTrials, patientContext }) {
  const pubContext = publications.slice(0, 8).map((p, i) =>
    `[PUB${i+1}] ${p.title} (${p.year}, ${p.source}) — ${p.abstract?.slice(0, 300)}`
  ).join('\n\n');

  const trialContext = clinicalTrials.slice(0, 4).map((t, i) =>
    `[TRIAL${i+1}] ${t.title} — Status: ${t.recruitingStatus}, Phase: ${t.phase}`
  ).join('\n\n');

  const context = `
Research context:
${pubContext}

Clinical trials:
${trialContext}

Patient: ${patientContext?.disease || disease} in ${patientContext?.location || 'unknown location'}
  `.trim();

  // Run FOR and AGAINST in parallel
  const [forRes, againstRes] = await Promise.all([
    groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `You are a medical expert arguing IN FAVOR of a treatment based on evidence. Be specific, cite the provided research using [PUB#] tags, focus on benefits and positive outcomes. Be concise but compelling. Use bullet points.`
        },
        {
          role: 'user',
          content: `Argue IN FAVOR of: "${query}" for ${disease}\n\nUsing this research:\n${context}\n\nMake 4-5 strong evidence-based arguments FOR this approach.`
        }
      ]
    }),
    groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `You are a medical expert arguing AGAINST a treatment based on evidence. Be specific, cite the provided research using [PUB#] tags, focus on risks, complications and limitations. Be concise but compelling. Use bullet points.`
        },
        {
          role: 'user',
          content: `Argue AGAINST or raise concerns about: "${query}" for ${disease}\n\nUsing this research:\n${context}\n\nMake 4-5 strong evidence-based arguments raising concerns or limitations.`
        }
      ]
    })
  ]);

  const forArgument = forRes.choices[0]?.message?.content || '';
  const againstArgument = againstRes.choices[0]?.message?.content || '';

  // Verdict
  const verdictRes = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 400,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `You are a neutral medical judge. Given arguments for and against a treatment, provide a balanced evidence-based verdict. Be specific about who this treatment is best suited for.`
      },
      {
        role: 'user',
        content: `Query: "${query}" for ${disease}

FOR arguments:
${forArgument}

AGAINST arguments:
${againstArgument}

Provide a balanced verdict: who should consider this treatment, who should avoid it, and what the evidence weight suggests overall. Be concise — 3-4 sentences.`
      }
    ]
  });

  return {
    query,
    disease,
    for: forArgument,
    against: againstArgument,
    verdict: verdictRes.choices[0]?.message?.content || ''
  };
}

module.exports = { runDebate };
