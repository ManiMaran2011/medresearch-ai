function generateReport({ patientContext, publications, clinicalTrials, aiResponse, query, generatedAt }) {
  const date = new Date(generatedAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const pubsHTML = (publications || []).slice(0, 8).map((pub, i) => `
    <div class="card">
      <div class="card-header">
        <span class="badge ${pub.source === 'PubMed' ? 'badge-blue' : 'badge-purple'}">${pub.source}</span>
        ${pub.evidenceScore ? `<span class="badge badge-${pub.evidenceScore.color === 'green' ? 'green' : pub.evidenceScore.color === 'amber' ? 'amber' : 'red'}">${pub.evidenceScore.confidence} Evidence</span>` : ''}
        <span class="year">${pub.year}</span>
      </div>
      <h4>${pub.title}</h4>
      ${pub.authors?.length ? `<p class="authors">${pub.authors.slice(0,3).join(', ')}${pub.authors.length > 3 ? ' et al.' : ''}</p>` : ''}
      ${pub.journal ? `<p class="journal">${pub.journal}</p>` : ''}
      ${pub.abstract ? `<p class="abstract">${pub.abstract.slice(0, 300)}...</p>` : ''}
      ${pub.url ? `<a href="${pub.url}" class="link">View paper →</a>` : ''}
    </div>`).join('');

  const trialsHTML = (clinicalTrials || []).slice(0, 6).map((trial, i) => `
    <div class="card">
      <div class="card-header">
        <span class="badge ${trial.recruitingStatus === 'RECRUITING' ? 'badge-green' : 'badge-gray'}">${trial.recruitingStatus}</span>
        ${trial.phase && trial.phase !== 'N/A' ? `<span class="badge badge-amber">Phase ${trial.phase}</span>` : ''}
      </div>
      <h4>${trial.title}</h4>
      ${trial.summary ? `<p class="abstract">${trial.summary.slice(0, 300)}...</p>` : ''}
      ${trial.locations?.length ? `<p class="location">📍 ${trial.locations.map(l => [l.city, l.country].filter(Boolean).join(', ')).slice(0,3).join(' | ')}</p>` : ''}
      ${trial.url ? `<a href="${trial.url}" class="link">View on ClinicalTrials.gov →</a>` : ''}
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MedResearch AI Report — ${query}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; max-width: 900px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #3b82f6; margin-bottom: 28px; }
  .logo { font-size: 24px; font-weight: 800; color: #3b82f6; }
  .logo span { color: #0f172a; }
  .meta { font-size: 12px; color: #64748b; text-align: right; line-height: 1.8; }
  .patient-box { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; display: flex; gap: 32px; flex-wrap: wrap; }
  .patient-field label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; display: block; margin-bottom: 2px; }
  .patient-field value { font-size: 15px; font-weight: 600; color: #1e293b; }
  .query-tag { display: inline-block; background: #ede9fe; color: #6d28d9; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; margin-bottom: 24px; }
  .section { margin-bottom: 32px; }
  .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
  .ai-box { background: white; border-left: 4px solid #3b82f6; padding: 20px 24px; border-radius: 0 10px 10px 0; font-size: 14px; line-height: 1.8; color: #334155; white-space: pre-wrap; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 12px; }
  .card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
  .card-header { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
  .card h4 { font-size: 13px; font-weight: 600; color: #1e293b; line-height: 1.4; margin-bottom: 4px; }
  .authors { font-size: 11px; color: #64748b; font-style: italic; margin-bottom: 2px; }
  .journal { font-size: 11px; color: #0ea5e9; margin-bottom: 5px; }
  .abstract { font-size: 12px; color: #475569; line-height: 1.5; margin-bottom: 6px; }
  .location { font-size: 11px; color: #64748b; margin-bottom: 6px; }
  .link { font-size: 11px; color: #3b82f6; text-decoration: none; }
  .year { font-size: 11px; color: #94a3b8; margin-left: auto; }
  .badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-purple { background: #ede9fe; color: #6d28d9; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-gray { background: #f1f5f9; color: #475569; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.8; }
  @media print { body { padding: 20px; } .header { page-break-after: avoid; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">MedResearch <span>AI</span></div>
      <div style="font-size:12px;color:#64748b;margin-top:4px;">Powered by Llama 3.3 70B · Open Source LLM</div>
    </div>
    <div class="meta">
      Generated: ${date}<br>
      Sources: PubMed · OpenAlex · ClinicalTrials.gov<br>
      Model: Llama 3.3 70B (Groq)
    </div>
  </div>

  ${(patientContext?.name || patientContext?.disease) ? `
  <div class="patient-box">
    ${patientContext.name ? `<div class="patient-field"><label>Patient</label><value>${patientContext.name}</value></div>` : ''}
    ${patientContext.disease ? `<div class="patient-field"><label>Condition</label><value>${patientContext.disease}</value></div>` : ''}
    ${patientContext.location ? `<div class="patient-field"><label>Location</label><value>${patientContext.location}</value></div>` : ''}
    ${patientContext.medications ? `<div class="patient-field"><label>Medications</label><value>${patientContext.medications}</value></div>` : ''}
  </div>` : ''}

  <div class="query-tag">Query: "${query}"</div>

  ${aiResponse ? `
  <div class="section">
    <div class="section-title">🤖 AI Research Analysis</div>
    <div class="ai-box">${aiResponse.replace(/#{1,3} /g, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/🔬|📚|🧪|⚠️|💡|📋/g, '')}</div>
  </div>` : ''}

  ${publications?.length ? `
  <div class="section">
    <div class="section-title">📚 Research Publications (${publications.length})</div>
    <div class="grid">${pubsHTML}</div>
  </div>` : ''}

  ${clinicalTrials?.length ? `
  <div class="section">
    <div class="section-title">🧪 Clinical Trials (${clinicalTrials.length})</div>
    <div class="grid">${trialsHTML}</div>
  </div>` : ''}

  <div class="footer">
    This report is for informational and research purposes only. It does not constitute medical advice.<br>
    Always consult a qualified healthcare professional before making any medical decisions.<br>
    MedResearch AI · Powered by Llama 3.3 70B (Open Source) · Generated ${date}
  </div>
</body>
</html>`;
}

module.exports = { generateReport };
