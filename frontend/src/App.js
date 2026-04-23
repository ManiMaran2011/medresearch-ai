import React,{useState,useRef,useEffect,useCallback} from 'react';
import ReactMarkdown from 'react-markdown';
import {v4 as uuidv4} from 'uuid';
import {AreaChart,Area,XAxis,YAxis,Tooltip,ResponsiveContainer} from 'recharts';
import './App.css';

const API='http://localhost:5000/api';
const post=(url,body)=>fetch(`${API}${url}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());

// Icons
const Ic={
  Dna:()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 3c0 6 14 6 14 12S5 21 5 21"/><path d="M19 3c0 6-14 6-14 12s14 6 14 6"/></svg>,
  Send:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Mic:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M19 10a7 7 0 0 1-14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>,
  X:()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:()=><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
  Plus:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Menu:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Dl:()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  User:()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Steth:()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>,
  Pin:()=><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Link:()=><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  Warn:()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Sound:()=><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
  Chev:()=><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
};

// Voice
function useVoice(cb){const[on,setOn]=useState(false);const r=useRef(null);const start=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert('Use Chrome for voice');return;}const rec=new SR();rec.continuous=false;rec.interimResults=false;rec.onresult=e=>{cb(e.results[0][0].transcript);setOn(false);};rec.onend=()=>setOn(false);rec.onerror=()=>setOn(false);r.current=rec;rec.start();setOn(true);};return{on,start,stop:()=>{r.current?.stop();setOn(false);}};}

// TTS
function speak(t){if(!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t.replace(/[#*\[\]]/g,'').slice(0,2000));u.rate=0.95;window.speechSynthesis.speak(u);}

// Timeline data
function buildTimeline(pubs){const m={};for(const p of pubs){const y=parseInt(p.year);if(!y||y<1990||y>new Date().getFullYear()+1)continue;m[y]=(m[y]||0)+1;}return Object.entries(m).sort(([a],[b])=>a-b).map(([year,count])=>({year:Number(year),count}));}

// Pipeline
function Pipeline({steps,progress}){return(<div className="pipeline"><div className="pl-top"><span className="pl-title">⬡ LIVE PIPELINE</span><span className="pl-pct">{Math.round(progress)}%</span></div><div className="pl-bar"><div className="pl-fill" style={{width:`${progress}%`}}/></div>{steps.map((s,i)=>(<div key={i} className="pl-step"><div className={`pl-dot ${s.done?'done':s.active?'active':'idle'}`}>{s.done&&<Ic.Check/>}{s.active&&!s.done&&<div className="pl-pulse"/>}</div><span className={`pl-text ${s.done?'done':s.active?'active':'idle'}`}>{s.label}</span></div>))}</div>);}

// Evidence badge
function EBadge({score}){if(!score)return null;const c={green:'badge-green',amber:'badge-amber',red:'badge-red'}[score.color]||'badge-red';return <span className={`badge ${c}`}>{score.confidence}</span>;}

// Pub card
function PubCard({pub,i}){
  const[open,setOpen]=useState(false);const[expl,setExpl]=useState(null);const[loading,setLoading]=useState(false);
  const doExplain=async()=>{if(expl){setOpen(o=>!o);return;}setLoading(true);try{const d=await post('/advanced/explain-paper',{paper:pub});setExpl(d.explanation);setOpen(true);}catch{}setLoading(false);};
  return(<div className="card" style={{animationDelay:`${i*0.05}s`}}>
    <div className="card-top"><span className={`badge ${pub.source==='PubMed'?'badge-pubmed':'badge-openalex'}`}>{pub.source}</span><EBadge score={pub.evidenceScore}/><span className="card-year">{pub.year}</span></div>
    <p className="card-title">{pub.title}</p>
    {pub.authors?.length>0&&<p className="card-authors">{pub.authors.slice(0,3).join(', ')}{pub.authors.length>3?' et al.':''}</p>}
    {pub.journal&&<p className="card-journal">{pub.journal}</p>}
    {pub.abstract&&<p className="card-abstract" style={{WebkitLineClamp:open&&!expl?'unset':3}}>{pub.abstract}</p>}
    {expl&&open&&(<div className="explain-card">{[['What they studied',expl.whatTheyStudied],['How',expl.howTheyDidIt],['Findings',expl.whatTheyFound],['Why it matters',expl.whyItMatters],['Limitations',expl.limitations]].map(([k,v])=>v&&(<div key={k} className="explain-row"><span className="explain-key">{k}</span><span className="explain-val">{v}</span></div>))}{expl.plainEnglishSummary&&<div className="explain-summary">{expl.plainEnglishSummary}</div>}</div>)}
    <div className="card-footer">
      <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
        {pub.abstract?.length>150&&!expl&&<button className="expand-btn" onClick={()=>setOpen(o=>!o)}>{open?'Less':'More'}</button>}
        <button className="expand-btn" onClick={doExplain} disabled={loading}>{loading?'Loading...':expl?(open?'Hide':'Show Explanation'):'🔍 Explain this'}</button>
        {pub.evidenceScore?.reasons?.length>0&&<span className="ev-reasons">{pub.evidenceScore.reasons.slice(0,2).join(' · ')}</span>}
      </div>
      {pub.url&&<a href={pub.url} target="_blank" rel="noopener noreferrer" className="card-link">View <Ic.Link/></a>}
    </div>
  </div>);}

// Trial card
function TrialCard({trial,i}){
  const[open,setOpen]=useState(false);
  const sc={RECRUITING:'badge-green',ACTIVE_NOT_RECRUITING:'badge-blue',COMPLETED:'badge-gray'}[trial.recruitingStatus]||'badge-gray';
  return(<div className="card" style={{animationDelay:`${i*0.05}s`}}>
    <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:3}}><span className={`badge ${sc}`}>{trial.recruitingStatus}</span>{trial.phase&&trial.phase!=='N/A'&&<span className="badge badge-amber">Phase {trial.phase}</span>}</div>
    <p className="card-title">{trial.title}</p>
    {trial.summary&&<p className="card-abstract" style={{WebkitLineClamp:open?'unset':2}}>{trial.summary}</p>}
    {open&&trial.eligibility?.criteria&&<div style={{background:'var(--bg)',borderRadius:6,padding:'7px 9px',margin:'4px 0'}}><p style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--t3)',marginBottom:2}}>Eligibility</p><p style={{fontSize:10,color:'var(--t2)',lineHeight:1.5}}>{trial.eligibility.criteria.slice(0,400)}</p><p style={{fontSize:9,color:'var(--t3)',marginTop:3}}>Ages: {trial.eligibility.minAge} – {trial.eligibility.maxAge} · {trial.eligibility.sex}</p></div>}
    {open&&trial.locations?.length>0&&trial.locations.map((l,j)=><p key={j} style={{fontSize:10,color:'var(--t2)',display:'flex',alignItems:'center',gap:3,marginBottom:2}}><Ic.Pin/>{[l.facility,l.city,l.country].filter(Boolean).join(', ')}</p>)}
    {open&&trial.contacts?.length>0&&trial.contacts.map((c,j)=><p key={j} style={{fontSize:10,color:'var(--t2)',marginBottom:2}}>{c.name}{c.email?` · ${c.email}`:''}</p>)}
    <div className="card-footer"><button className="expand-btn" onClick={()=>setOpen(o=>!o)}>{open?'Less':'Details'}</button>{trial.url&&<a href={trial.url} target="_blank" rel="noopener noreferrer" className="card-link">ClinicalTrials.gov <Ic.Link/></a>}</div>
  </div>);}

// Sub-tab wrapper
function SubTabPanel({tabs,activeTab,setActiveTab,children}){return(<div>
  <div className="sub-tabs">{tabs.map(t=><button key={t.id} className={`sub-tab ${activeTab===t.id?'on':''}`} onClick={()=>setActiveTab(t.id)}>{t.label}</button>)}</div>
  <div className="sub-content">{children}</div>
</div>);}

// ── TAB 1: Need more clarity ───────────────────────────────────────────────
function ClarityTab({pubs,trials,disease,patientCtx}){
  const[sub,setSub]=useState('debate');
  const[debateQ,setDebateQ]=useState('');const[debateRes,setDebateRes]=useState(null);const[debateLoading,setDebateLoading]=useState(false);
  const[sopRec,setSopRec]=useState('');const[sopRes,setSopRes]=useState(null);const[sopLoading,setSopLoading]=useState(false);
  const[cmpT1,setCmpT1]=useState('');const[cmpT2,setCmpT2]=useState('');const[cmpRes,setCmpRes]=useState(null);const[cmpLoading,setCmpLoading]=useState(false);
  const[contraRes,setContraRes]=useState(null);const[contraLoading,setContraLoading]=useState(false);

  const runDebate=async()=>{if(!debateQ.trim())return;setDebateLoading(true);setDebateRes(null);try{const d=await post('/advanced/debate',{query:debateQ,disease,publications:pubs,clinicalTrials:trials,patientContext:patientCtx});setDebateRes(d);}catch{}setDebateLoading(false);};
  const runSop=async()=>{if(!sopRec.trim())return;setSopLoading(true);setSopRes(null);try{const d=await post('/advanced/second-opinion',{recommendation:sopRec,publications:pubs,clinicalTrials:trials,disease});setSopRes(d.opinion);}catch{}setSopLoading(false);};
  const runCmp=async()=>{if(!cmpT1.trim()||!cmpT2.trim())return;setCmpLoading(true);setCmpRes(null);try{const d=await post('/advanced/compare',{treatment1:cmpT1,treatment2:cmpT2,disease,publications:pubs});setCmpRes(d.comparison);}catch{}setCmpLoading(false);};
  const runContra=async()=>{setContraLoading(true);try{const d=await post('/advanced/contradictions',{publications:pubs});setContraRes(d.contradictions);}catch{}setContraLoading(false);};

  const vc={'well-supported':'var(--green)','partially-supported':'var(--amber)','limited-evidence':'var(--red)','concerning':'var(--red)'};
  const vb={'well-supported':'rgba(34,197,94,0.07)','partially-supported':'rgba(245,158,11,0.07)','limited-evidence':'rgba(239,68,68,0.07)','concerning':'rgba(239,68,68,0.07)'};

  return(<SubTabPanel tabs={[{id:'debate',label:'⚔️ AI Debate'},{id:'sop',label:'🔍 Second Opinion'},{id:'cmp',label:'⚖️ Compare Treatments'},{id:'contra',label:'⚡ Contradictions'}]} activeTab={sub} setActiveTab={setSub}>
    {sub==='debate'&&<div>
      <p style={{fontSize:11,color:'var(--t2)',marginBottom:9,lineHeight:1.6}}>Two Llama instances argue for and against a treatment using the retrieved evidence. A third gives a balanced verdict.</p>
      <div className="feature-input-row"><input value={debateQ} onChange={e=>setDebateQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runDebate()} placeholder={`e.g. "DBS surgery for ${disease||'this condition'}"`}/><button className="feature-btn" onClick={runDebate} disabled={debateLoading||!debateQ.trim()}>{debateLoading?'Debating...':'⚔️ Start Debate'}</button></div>
      {debateRes&&<><div className="debate-grid"><div className="debate-card debate-for"><p className="debate-label" style={{color:'var(--green)'}}>🟢 Arguments For</p><p className="debate-text">{debateRes.for}</p></div><div className="debate-card debate-against"><p className="debate-label" style={{color:'var(--red)'}}>🔴 Arguments Against</p><p className="debate-text">{debateRes.against}</p></div></div><div className="debate-verdict"><p className="debate-label" style={{color:'var(--acc)'}}>⚖️ Verdict</p><p className="debate-text">{debateRes.verdict}</p></div></>}
    </div>}
    {sub==='sop'&&<div>
      <p style={{fontSize:11,color:'var(--t2)',marginBottom:9,lineHeight:1.6}}>Enter a doctor's recommendation — the system finds research that supports it and challenges it.</p>
      <div className="feature-input-row"><input value={sopRec} onChange={e=>setSopRec(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runSop()} placeholder='e.g. "You should consider DBS surgery given your stage"'/><button className="feature-btn" onClick={runSop} disabled={sopLoading||!sopRec.trim()}>{sopLoading?'Analyzing...':'🔍 Check'}</button></div>
      {sopRes&&<><div className="sop-verdict" style={{background:vb[sopRes.verdict]||'var(--bg3)',border:`1px solid ${vc[sopRes.verdict]||'var(--border)'}`}}><p style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.06em',color:vc[sopRes.verdict],marginBottom:3}}>Evidence Assessment</p><p style={{fontSize:13,fontWeight:600,color:vc[sopRes.verdict]}}>{sopRes.verdict?.replace(/-/g,' ').toUpperCase()}</p></div>
      <p className="analytics-label">Supporting</p>{sopRes.supporting?.map((s,i)=><p key={i} className="sop-item"><span style={{color:'var(--green)'}}>✓</span><span><strong style={{color:'var(--t1)'}}>{s.source}</strong> — {s.evidence}</span></p>)}
      <p className="analytics-label" style={{marginTop:8}}>Challenging</p>{sopRes.challenging?.map((s,i)=><p key={i} className="sop-item"><span style={{color:'var(--red)'}}>⚠</span><span><strong style={{color:'var(--t1)'}}>{s.source}</strong> — {s.evidence}</span></p>)}
      <div className="sop-net">{sopRes.netAssessment}</div></>}
    </div>}
    {sub==='cmp'&&<div>
      <p style={{fontSize:11,color:'var(--t2)',marginBottom:9}}>Compare two treatments head to head across clinical dimensions.</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr auto',gap:6,marginBottom:10,alignItems:'center'}}>
        <input style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:6,padding:'6px 9px',color:'var(--t1)',fontSize:11,outline:'none'}} value={cmpT1} onChange={e=>setCmpT1(e.target.value)} placeholder="Treatment A"/>
        <span style={{fontSize:10,color:'var(--t3)'}}>vs</span>
        <input style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:6,padding:'6px 9px',color:'var(--t1)',fontSize:11,outline:'none'}} value={cmpT2} onChange={e=>setCmpT2(e.target.value)} placeholder="Treatment B"/>
        <button className="feature-btn" onClick={runCmp} disabled={cmpLoading||!cmpT1.trim()||!cmpT2.trim()}>{cmpLoading?'...':'⚖️'}</button>
      </div>
      {cmpRes&&<><div className="cmp-grid">{[['A',cmpRes.treatmentA],['B',cmpRes.treatmentB]].map(([l,t])=><div key={l} className={`cmp-card ${cmpRes.winner===l?'cmp-winner-card':''}`}>{cmpRes.winner===l&&<span className="badge badge-green" style={{marginBottom:4,display:'inline-block'}}>⭐ Preferred</span>}<p className="cmp-name">{t?.name}</p><p className="cmp-score" style={{color:cmpRes.winner===l?'var(--green)':'var(--t2)'}}>{t?.score}/10</p>{[['Efficacy',t?.efficacy],['Side effects',t?.sideEffects],['Best for',t?.bestFor]].map(([k,v])=>v&&<p key={k} className="cmp-row"><span className="cmp-key">{k}: </span>{v}</p>)}</div>)}</div>
      {cmpRes.dimensions&&<div>{cmpRes.dimensions.map((d,i)=><div key={i} className="cmp-dim-row"><span className="cmp-dim-label">{d.name}</span><div className="cmp-dim-bars"><div className="cmp-dim-bar" style={{width:`${d.scoreA*10}%`,background:'var(--acc)'}}/><div className="cmp-dim-bar" style={{width:`${d.scoreB*10}%`,background:'var(--teal)'}}/></div><span style={{fontSize:9,color:'var(--t3)',fontFamily:'var(--mono)',minWidth:40}}>{d.scoreA}/{d.scoreB}</span></div>)}</div>}
      {cmpRes.winnerReason&&<p style={{fontSize:11,color:'var(--t2)',marginTop:8,padding:'7px 10px',background:'var(--bg2)',borderRadius:6}}>{cmpRes.winnerReason}</p>}</>}
    </div>}
    {sub==='contra'&&<div>
      {!contraRes&&!contraLoading&&<div className="center-prompt"><p>Scan the retrieved papers for conflicting findings and surface contradictions explicitly.</p><button className="feature-btn" onClick={runContra}>⚡ Find Contradictions</button></div>}
      {contraLoading&&<div className="center-prompt"><p>Analyzing papers for contradictions...</p></div>}
      {contraRes&&contraRes.length===0&&<div className="center-prompt"><p>No significant contradictions found — the evidence is broadly consistent.</p></div>}
      {contraRes?.map((c,i)=><div key={i} className="contra-card"><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}><span className="badge badge-blue">{c.paper1}</span><span style={{fontSize:9,color:'var(--t3)'}}>vs</span><span className="badge badge-red">{c.paper2}</span>{c.severity==='major'&&<span className="badge badge-red" style={{marginLeft:'auto'}}>Major</span>}</div><div className="contra-finding a">{c.finding1}</div><div className="contra-finding b">{c.finding2}</div><p className="contra-explain">{c.explanation}</p></div>)}
    </div>}
  </SubTabPanel>);}

// ── TAB 2: Explore the evidence ────────────────────────────────────────────
function EvidenceTab({pubs,trials,disease,patientCtx}){
  const[sub,setSub]=useState('papers');
  const[eligRes,setEligRes]=useState(null);const[eligLoading,setEligLoading]=useState(false);
  const[gapData,setGapData]=useState(null);const[gapLoading,setGapLoading]=useState(false);
  const[leaders,setLeaders]=useState(null);

  const runElig=async()=>{setEligLoading(true);try{const d=await post('/advanced/eligibility',{patientContext:patientCtx,trials});setEligRes(d.results);}catch{}setEligLoading(false);};
  const runGaps=async()=>{setGapLoading(true);try{const d=await post('/advanced/gaps',{publications:pubs,disease,query:''});setGapData(d);}catch{}setGapLoading(false);};
  useEffect(()=>{if(sub==='researchers'&&!leaders){post('/advanced/analytics',{publications:pubs,disease:''}).then(d=>setLeaders(d.leaderboard)).catch(()=>{});}},[sub]);

  const e=eligRes?.filter(r=>r.eligible==='yes').length||0;const p=eligRes?.filter(r=>r.eligible==='partial').length||0;

  return(<SubTabPanel tabs={[{id:'papers',label:`📄 Papers (${pubs.length})`},{id:'trials',label:`🧪 Trials (${trials.length})`},{id:'eligibility',label:'✅ Eligibility'},{id:'gaps',label:'🔭 Research Gaps'},{id:'researchers',label:'🏆 Researchers'}]} activeTab={sub} setActiveTab={setSub}>
    {sub==='papers'&&<div className="cards-grid">{pubs.map((p,i)=><PubCard key={p.id||i} pub={p} i={i}/>)}</div>}
    {sub==='trials'&&<div className="cards-grid">{trials.map((t,i)=><TrialCard key={t.id||i} trial={t} i={i}/>)}</div>}
    {sub==='eligibility'&&<div>
      {!eligRes&&!eligLoading&&<div className="center-prompt"><p>Automatically check if {patientCtx?.name||'the patient'} qualifies for each retrieved trial based on their profile — condition, age, gender, location, and medications.</p>{!patientCtx?.disease&&<p style={{color:'var(--amber)',fontSize:11,marginBottom:8}}>⚠️ Set patient context first for best results</p>}<button className="feature-btn" onClick={runElig}>🎯 Check My Eligibility</button></div>}
      {eligLoading&&<div className="center-prompt"><p>Evaluating trial eligibility with Llama 3.3...</p></div>}
      {eligRes&&<><div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}><span className="badge badge-green">✅ {e} eligible</span><span className="badge badge-amber">⚠️ {p} partial</span><span className="badge badge-red">❌ {eligRes.length-e-p} ineligible</span></div>
      {eligRes.map((r,i)=><div key={i} className="elig-card"><div className="elig-header"><p className="elig-title">{r.trialTitle}</p><span className="elig-score" style={{color:r.eligible==='yes'?'var(--green)':r.eligible==='partial'?'var(--amber)':'var(--red)'}}>{r.score}%</span></div><div className="elig-checks">{r.checks?.map((c,j)=><span key={j} className={`elig-check badge ${c.status==='pass'?'badge-green':c.status==='fail'?'badge-red':'badge-gray'}`}>{c.status==='pass'?'✓':c.status==='fail'?'✗':'?'} {c.criterion}</span>)}</div><p className="elig-summary">{r.summary}</p>{r.trialUrl&&<a href={r.trialUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:'var(--acc)',display:'inline-flex',alignItems:'center',gap:3,marginTop:4}}>View trial <Ic.Link/></a>}</div>)}</>}
    </div>}
    {sub==='gaps'&&<div>
      {!gapData&&!gapLoading&&<div className="center-prompt"><p>Identify what important questions remain unanswered in the current literature, and suggest the ideal study design to address them.</p><button className="feature-btn" onClick={runGaps}>🔭 Find Research Gaps</button></div>}
      {gapLoading&&<div className="center-prompt"><p>Analyzing research landscape...</p></div>}
      {gapData?.gaps?.map((g,i)=><div key={i} className="gap-card"><p className="gap-title">{g.gap}</p><p className="gap-importance">{g.importance}</p><p className="gap-study">💡 {g.suggestedStudy}</p></div>)}
      {gapData?.studyDesign&&<div className="study-box"><p className="study-box-title">🔬 Ideal Study Design</p>{[['Title',gapData.studyDesign.title],['Hypothesis',gapData.studyDesign.hypothesis],['Study type',gapData.studyDesign.studyType],['Sample size',gapData.studyDesign.sampleSize],['Duration',gapData.studyDesign.duration],['Primary endpoint',gapData.studyDesign.primaryEndpoint],['Significance',gapData.studyDesign.significance]].map(([k,v])=>v&&<div key={k} className="study-row"><span className="study-key">{k}</span><span className="study-val">{v}</span></div>)}</div>}
    </div>}
    {sub==='researchers'&&<div>
      <p className="analytics-label">Top researchers based on retrieved papers</p>
      {!leaders&&<p style={{fontSize:11,color:'var(--t2)'}}>Loading...</p>}
      {leaders?.map((r,i)=><div key={i} className="leader-row"><span className="leader-rank">{['🥇','🥈','🥉'][i]||`#${i+1}`}</span><span className="leader-name">{r.name}</span><span className="leader-count">{r.paperCount} papers{r.totalCitations>0?` · ${r.totalCitations} citations`:''}</span></div>)}
    </div>}
  </SubTabPanel>);}

// ── TAB 3: Understand the disease ─────────────────────────────────────────
function DiseaseTab({disease}){
  const[sub,setSub]=useState('progression');
  const[progData,setProgData]=useState(null);const[progLoading,setProgLoading]=useState(false);
  const[histData,setHistData]=useState(null);const[histLoading,setHistLoading]=useState(false);
  const[bioData,setBioData]=useState(null);const[bioLoading,setBioLoading]=useState(false);

  const runProg=async()=>{setProgLoading(true);try{const d=await post('/advanced/progression',{disease});setProgData(d.timeline||[]);}catch{}setProgLoading(false);};
  const runHist=async()=>{setHistLoading(true);try{const d=await post('/advanced/history',{disease});setHistData(d.history||[]);}catch{}setHistLoading(false);};
  const runBio=async()=>{setBioLoading(true);try{const d=await post('/advanced/biomarkers',{disease});setBioData(d.biomarkers||[]);}catch{}setBioLoading(false);};

  const dc={green:'var(--green)',yellow:'var(--amber)',orange:'#f97316',red:'var(--red)'};
  const tb={drug:{bg:'rgba(59,130,246,0.1)',c:'var(--acc)'},surgery:{bg:'rgba(239,68,68,0.1)',c:'var(--red)'},approval:{bg:'rgba(34,197,94,0.1)',c:'var(--green)'},research:{bg:'rgba(245,158,11,0.1)',c:'var(--amber)'},therapy:{bg:'rgba(168,85,247,0.1)',c:'var(--purple)'}};
  const tc={genetic:{bg:'rgba(168,85,247,0.1)',c:'var(--purple)'},biomarker:{bg:'rgba(59,130,246,0.1)',c:'var(--acc)'},diagnostic:{bg:'rgba(20,184,166,0.1)',c:'var(--teal)'}};

  return(<SubTabPanel tabs={[{id:'progression',label:'📉 Disease Progression'},{id:'history',label:'📜 Treatment History'},{id:'biomarkers',label:'🧬 Biomarkers'}]} activeTab={sub} setActiveTab={setSub}>
    {sub==='progression'&&<div>
      {!progData&&!progLoading&&<div className="center-prompt"><p>View the typical progression stages for {disease||'this condition'} — symptoms, treatments, and relevant trials at each stage.</p><button className="feature-btn" onClick={runProg}>📈 Show Progression</button></div>}
      {progLoading&&<div className="center-prompt"><p>Generating progression timeline...</p></div>}
      {progData&&progData.length===0&&<div className="center-prompt"><p style={{color:'var(--red)'}}>Could not generate progression data. Try setting a specific disease in patient context.</p><button className="feature-btn" onClick={runProg} style={{marginTop:8}}>Retry</button></div>}
      {progData&&progData.length>0&&<div className="prog-timeline">{progData.map((s,i)=><div key={i} className="prog-item"><div className="prog-dot" style={{borderColor:dc[s.color]||'var(--acc)',background:`${dc[s.color]||'var(--acc)'}20`}}/><div><p className="prog-stage">{s.stage}</p><p className="prog-timeframe">{s.timeframe}</p><p className="prog-section">Symptoms</p><div className="prog-tags">{s.symptoms?.map((x,j)=><span key={j} className="prog-tag">{x}</span>)}</div><p className="prog-section">Treatments</p><div className="prog-tags">{s.treatments?.map((x,j)=><span key={j} className="prog-tag" style={{borderColor:'rgba(59,130,246,0.2)',color:'var(--acc)'}}>{x}</span>)}</div></div></div>)}</div>}
    </div>}
    {sub==='history'&&<div>
      {!histData&&!histLoading&&<div className="center-prompt"><p>Explore how treatment for {disease||'this condition'} evolved from discovery to today — decade by decade.</p><button className="feature-btn" onClick={runHist}>📜 Load History</button></div>}
      {histLoading&&<div className="center-prompt"><p>Loading treatment history...</p></div>}
      {histData&&histData.length===0&&<div className="center-prompt"><p style={{color:'var(--red)'}}>Could not load history. Try setting a specific disease in patient context.</p><button className="feature-btn" onClick={runHist} style={{marginTop:8}}>Retry</button></div>}
      {histData&&histData.length>0&&histData.map((h,i)=>{const t=tb[h.type]||tb.research;return(<div key={i} className="hist-item"><span className="hist-year">{h.year}</span><div><p className="hist-milestone">{h.milestone}</p><p className="hist-sig">{h.significance}</p><span style={{fontSize:8,padding:'1px 5px',borderRadius:6,background:t.bg,color:t.c,display:'inline-block',marginTop:3}}>{h.type}</span></div></div>);})}
    </div>}
    {sub==='biomarkers'&&<div>
      {!bioData&&!bioLoading&&<div className="center-prompt"><p>Key genetic markers, biomarkers, and diagnostic tests relevant to {disease||'this condition'}.</p><button className="feature-btn" onClick={runBio}>🧬 Load Biomarkers</button></div>}
      {bioLoading&&<div className="center-prompt"><p>Loading biomarker data...</p></div>}
      {bioData&&bioData.length===0&&<div className="center-prompt"><p style={{color:'var(--red)'}}>Could not load biomarkers. Try setting a specific disease in patient context.</p><button className="feature-btn" onClick={runBio} style={{marginTop:8}}>Retry</button></div>}
      {bioData&&bioData.length>0&&<div className="bio-grid">{bioData.map((b,i)=>{const t=tc[b.type]||tc.biomarker;return(<div key={i} className="bio-card"><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}><p className="bio-name">{b.name}</p><span className="badge" style={{background:t.bg,color:t.c}}>{b.type}</span></div><p className="bio-relevance">{b.relevance}</p><p className="bio-use">{b.clinicalUse}</p></div>);})}</div>}
    </div>}
  </SubTabPanel>);}

// ── TAB 4: See it visually ─────────────────────────────────────────────────
function VisualTab({pubs,disease}){
  const[sub,setSub]=useState('analytics');
  const[netData,setNetData]=useState(null);const[heatData,setHeatData]=useState(null);const[news,setNews]=useState(null);
  const netRef=useRef(null);
  const timeline=buildTimeline(pubs);

  useEffect(()=>{if((sub==='network'||sub==='heatmap'||sub==='news')&&!netData){post('/advanced/analytics',{publications:pubs,disease}).then(d=>{setNetData(d.citationNetwork);setHeatData(d.heatmap);setNews(d.news);}).catch(()=>{});}},[sub]);

  useEffect(()=>{
    if(sub!=='network'||!netData?.nodes?.length||!netRef.current)return;
    const canvas=netRef.current,ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
    const nodes=netData.nodes.map(n=>({...n,x:W/2+(Math.random()-.5)*280,y:H/2+(Math.random()-.5)*140,vx:0,vy:0}));
    const edges=netData.edges||[];let frame;
    const tick=()=>{
      for(const n of nodes){n.vx*=.85;n.vy*=.85;}
      for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const dx=nodes[j].x-nodes[i].x,dy=nodes[j].y-nodes[i].y,d=Math.max(Math.sqrt(dx*dx+dy*dy),1),f=500/(d*d);nodes[i].vx-=dx*f;nodes[i].vy-=dy*f;nodes[j].vx+=dx*f;nodes[j].vy+=dy*f;}
      for(const e of edges){const s=nodes.find(n=>n.id===e.source),t=nodes.find(n=>n.id===e.target);if(!s||!t)continue;const dx=t.x-s.x,dy=t.y-s.y,d=Math.sqrt(dx*dx+dy*dy),f=(d-100)*.008;s.vx+=dx*f;s.vy+=dy*f;t.vx-=dx*f;t.vy-=dy*f;}
      for(const n of nodes){n.x=Math.max(18,Math.min(W-18,n.x+n.vx));n.y=Math.max(18,Math.min(H-18,n.y+n.vy));}
      ctx.clearRect(0,0,W,H);
      for(const e of edges){const s=nodes.find(n=>n.id===e.source),t=nodes.find(n=>n.id===e.target);if(!s||!t)continue;ctx.strokeStyle='rgba(59,130,246,0.15)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(t.x,t.y);ctx.stroke();}
      for(const n of nodes){const r=Math.min(n.size||5,13);const col={High:'#22c55e',Moderate:'#f59e0b',Emerging:'#ef4444'}[n.confidence]||'#3b82f6';ctx.fillStyle=col+'60';ctx.beginPath();ctx.arc(n.x,n.y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=.8;ctx.stroke();ctx.fillStyle='#94a3b8';ctx.font='8px sans-serif';ctx.fillText(n.label?.slice(0,16)||'',n.x+r+2,n.y+3);}
      frame=requestAnimationFrame(tick);
    };
    tick();return()=>cancelAnimationFrame(frame);
  },[sub,netData]);

  const max=heatData?.[0]?.count||1;

  return(<SubTabPanel tabs={[{id:'analytics',label:'📈 Analytics'},{id:'network',label:'🕸️ Citation Network'},{id:'heatmap',label:'🌍 Global Map'},{id:'news',label:'📰 Resources'}]} activeTab={sub} setActiveTab={setSub}>
    {sub==='analytics'&&<div>
      {timeline.length>0&&<div style={{marginBottom:18}}><p className="analytics-label">Research output by year</p><ResponsiveContainer width="100%" height={120}><AreaChart data={timeline} margin={{top:5,right:5,bottom:0,left:-20}}><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="year" tick={{fontSize:9,fill:'#475569'}} tickLine={false} axisLine={false} interval="preserveStartEnd"/><YAxis tick={{fontSize:9,fill:'#475569'}} tickLine={false} axisLine={false}/><Tooltip contentStyle={{background:'#0d0f14',border:'1px solid rgba(255,255,255,0.06)',borderRadius:6,fontSize:10}} labelStyle={{color:'#94a3b8'}} itemStyle={{color:'#3b82f6'}}/><Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={1.5} fill="url(#ag)" dot={false}/></AreaChart></ResponsiveContainer></div>}
      <p className="analytics-label">Evidence quality distribution</p>
      <div className="ev-grid">{[['High','var(--green)'],['Moderate','var(--amber)'],['Emerging','var(--red)']].map(([lv,col])=><div key={lv} className="ev-cell"><div className="ev-num" style={{color:col}}>{pubs.filter(p=>p.evidenceScore?.confidence===lv).length}</div><div className="ev-lbl">{lv}</div></div>)}</div>
    </div>}
    {sub==='network'&&<div>
      <p className="analytics-label">Citation network · node size = citations · color = evidence quality</p>
      <div style={{display:'flex',gap:9,marginBottom:7}}>{[['High','#22c55e'],['Moderate','#f59e0b'],['Emerging','#ef4444']].map(([l,c])=><span key={l} style={{fontSize:9,color:c,display:'flex',alignItems:'center',gap:3}}><span style={{width:6,height:6,borderRadius:'50%',background:c,display:'inline-block'}}/>{l}</span>)}</div>
      <canvas ref={netRef} width={500} height={190} className="netcanvas"/>
      {!netData&&<p style={{fontSize:11,color:'var(--t2)',textAlign:'center',marginTop:8}}>Loading network...</p>}
    </div>}
    {sub==='heatmap'&&<div>
      <p className="analytics-label">Research activity by country (inferred from author affiliations)</p>
      {!heatData&&<p style={{fontSize:11,color:'var(--t2)'}}>Loading...</p>}
      {heatData?.map((h,i)=><div key={i} className="heatmap-row"><span className="heatmap-country">{h.country}</span><div className="heatmap-bar-wrap"><div className="heatmap-bar" style={{width:`${(h.count/max)*100}%`}}/></div><span className="heatmap-count">{h.count}</span></div>)}
      {heatData?.length===0&&<p style={{fontSize:11,color:'var(--t3)'}}>Insufficient location data in retrieved papers.</p>}
    </div>}
    {sub==='news'&&<div>
      <p className="analytics-label">Live research resources for {disease||'this condition'}</p>
      {!news&&<p style={{fontSize:11,color:'var(--t2)'}}>Loading...</p>}
      {news?.map((n,i)=><div key={i} className="news-item"><a href={n.url} target="_blank" rel="noopener noreferrer" className="news-title">{n.title}</a><div className="news-meta"><span>{n.source}</span><span>{n.time}</span></div></div>)}
    </div>}
  </SubTabPanel>);}

// ── Big tab component ──────────────────────────────────────────────────────
function BigTab({icon,title,sub,isOpen,onToggle,children}){return(
  <div className={`big-tab ${isOpen?'open':''}`}>
    <div className={`bt-header ${isOpen?'open':''}`} onClick={onToggle}>
      <div className="bt-left">
        <div className="bt-icon">{icon}</div>
        <div><p className="bt-title">{title}</p><p className="bt-sub">{sub}</p></div>
      </div>
      <span className={`bt-chevron ${isOpen?'open':''}`}><Ic.Chev/></span>
    </div>
    {isOpen&&<div className="bt-body">{children}</div>}
  </div>
);}

// ── Confidence + simplifier (inline in response) ───────────────────────────
function InlineConf({original,pubs}){
  const[scores,setScores]=useState(null);
  useEffect(()=>{if(!original||!pubs?.length)return;post('/advanced/confidence',{response:original,publications:pubs}).then(d=>setScores(d.scores)).catch(()=>{});},[]);
  const gc=s=>s>=8?'var(--green)':s>=6?'var(--amber)':'var(--red)';
  if(!scores)return <p style={{fontSize:11,color:'var(--t2)'}}>Scoring evidence confidence...</p>;
  return(<div>{scores.map((s,i)=><div key={i} className="conf-bar-row"><div className="conf-label-row"><span className="conf-section">{s.section}</span><span className="conf-score" style={{color:gc(s.score)}}>{s.score}/10</span></div><div className="conf-bar-bg"><div className="conf-bar-fill" style={{width:`${s.score*10}%`,background:gc(s.score)}}/></div><p className="conf-reason">{s.reason}</p></div>)}</div>);
}

function InlineSimplify({original}){
  const[simp,setSimp]=useState('');const[loading,setLoading]=useState(false);const[shown,setShown]=useState(false);
  const run=async()=>{if(simp){setShown(s=>!s);return;}setLoading(true);try{const d=await post('/advanced/simplify',{response:original});setSimp(d.simplified);setShown(true);}catch{}setLoading(false);};
  return(<div>
    <button className="qf-btn" onClick={run} disabled={loading}>{loading?'Simplifying...':shown?'📖 Show Technical':'🗣️ Plain English'}</button>
    {shown&&simp&&<div style={{marginTop:10}}><div className="simp-text"><ReactMarkdown>{simp}</ReactMarkdown></div></div>}
  </div>);
}

// Context panel
function ContextPanel({ctx,onSave,onClose}){
  const[form,setForm]=useState({...ctx});
  return(<div className="ctx-overlay">
    <div className="ctx-top"><span className="ctx-title"><Ic.Steth/> Patient Context</span><button className="ctx-close" onClick={onClose}><Ic.X/></button></div>
    <div className="ctx-grid">
      {[['name','Patient Name','e.g. John Smith'],['age','Age','e.g. 65'],['disease','Disease','e.g. Parkinson\'s'],['location','Location','e.g. Toronto, Canada'],['medications','Medications','e.g. Levodopa']].map(([k,l,p])=><div key={k} className="ctx-field"><label>{l}</label><input value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={p}/></div>)}
      <div className="ctx-field"><label>Gender</label><select value={form.gender||''} onChange={e=>setForm(f=>({...f,gender:e.target.value}))}><option value="">Select</option><option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option></select></div>
      <button className="ctx-save" onClick={()=>{onSave(form);onClose();}}>Save</button>
    </div>
  </div>);}

// Right panel
function RightPanel({messages,patientCtx}){
  const aiMsgs=messages.filter(m=>m.role==='assistant');
  const lastAI=aiMsgs[aiMsgs.length-1];
  const pubs=lastAI?.metadata?.publications||[];
  return(<div className="right-panel">
    <div className="rp-header"><p className="rp-title">Research Journey</p></div>
    <div className="rp-body">
      {aiMsgs.length===0&&<p style={{fontSize:10,color:'var(--t3)',marginTop:4}}>Your research journey appears here as you explore.</p>}
      {aiMsgs.map((m,i)=>{
        const meta=m.metadata||{};const q=messages.filter(x=>x.role==='user')[i]?.content||'Query';
        return(<div key={i} className="journey-item">
          <div className="journey-line"><div className="journey-dot" style={{borderColor:'var(--acc)',background:'var(--accd)'}}/>{i<aiMsgs.length-1&&<div className="journey-connector"/>}</div>
          <div><p className="journey-name" style={{color:'var(--t1)'}}>{q.slice(0,38)}{q.length>38?'...':''}</p><p className="journey-status">{meta.publications?.length||0} papers · {meta.clinicalTrials?.length||0} trials</p>{meta.processingTime&&<span className="journey-badge" style={{background:'var(--accd)',color:'var(--acc)'}}>{(meta.processingTime/1000).toFixed(1)}s</span>}</div>
        </div>);
      })}
      {pubs.length>0&&<div style={{marginTop:11}}><p className="rp-title" style={{marginBottom:7}}>Top Papers</p>{pubs.slice(0,3).map((p,i)=><div key={i} className="rp-paper"><p className="rp-paper-title">{p.title?.slice(0,52)}{p.title?.length>52?'...':''}</p><div className="rp-paper-meta"><span style={{color:p.source==='PubMed'?'#38bdf8':'#a78bfa'}}>{p.source}</span><span>{p.year}</span>{p.evidenceScore&&<span style={{color:p.evidenceScore.color==='green'?'var(--green)':p.evidenceScore.color==='amber'?'var(--amber)':'var(--red)'}}>{p.evidenceScore.confidence}</span>}</div></div>)}</div>}
      {patientCtx?.disease&&<div className="patient-card"><p className="patient-card-label">Active Patient</p><p className="patient-card-name">{patientCtx.name||'Patient'}</p><p className="patient-card-detail">{patientCtx.disease}</p>{patientCtx.age&&<p className="patient-card-sub">{patientCtx.age}{patientCtx.gender?` · ${patientCtx.gender}`:''}</p>}{patientCtx.location&&<p className="patient-card-sub">{patientCtx.location}</p>}</div>}
    </div>
  </div>);}

// ── Main message ───────────────────────────────────────────────────────────
function Message({msg,onFollowUp,patientCtx}){
  const[openTab,setOpenTab]=useState(null);
  const[showConf,setShowConf]=useState(false);
  const isUser=msg.role==='user';
  const m=msg.metadata||{};
  const pubs=m.publications||[],trials=m.clinicalTrials||[],drugs=m.drugInteractions||[],followUps=m.followUps||[];
  const disease=m.disease||patientCtx?.disease||'';
  const hasData=pubs.length||trials.length;
  const toggle=id=>setOpenTab(o=>o===id?null:id);

  if(isUser)return(<div className="msg-user"><div className="msg-user-bubble"><p className="msg-user-text">{msg.content}</p></div><div className="uavatar"><Ic.User/></div></div>);

  return(<div className="msg-ai">
    <div className="aavatar"><Ic.Dna/></div>
    <div className="ai-body">

      {/* Stats bar — only if we have data */}
      {hasData&&<div className="stats-bar">
        <div className="stat-cell"><div className="stat-label">Papers</div><div className="stat-value">{pubs.length}</div><div className="stat-sub">{pubs.filter(p=>p.evidenceScore?.confidence==='High').length} high evidence</div></div>
        <div className="stat-cell"><div className="stat-label">Trials</div><div className="stat-value">{trials.length}</div><div className="stat-sub">{trials.filter(t=>t.recruitingStatus==='RECRUITING').length} recruiting now</div></div>
        {drugs.length>0&&<div className="stat-cell"><div className="stat-label">Drug flags</div><div className="stat-value" style={{color:'var(--amber)'}}>{drugs.length}</div><div className="stat-sub">FDA data</div></div>}
        <div className="stat-cell"><div className="stat-label">Time</div><div className="stat-value" style={{fontSize:15,paddingTop:2}}>{m.processingTime?(m.processingTime/1000).toFixed(1)+'s':'–'}</div><div className="stat-sub">{m.totalFetched||0} raw ranked</div></div>
      </div>}

      {/* Main response */}
      <div className={`ai-card ${hasData?'top':'solo'}`}>
        <div className="response-text">
          <button className="read-btn" onClick={()=>speak(msg.content)}><Ic.Sound/> Read aloud</button>
          <div className="md"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
        </div>

        {/* Quick inline features: plain english + confidence */}
        {hasData&&<div className="quick-features">
          <span className="qf-label">Quick tools:</span>
          <InlineSimplify original={msg.content}/>
          <button className={`qf-btn ${showConf?'active':''}`} onClick={()=>setShowConf(s=>!s)}>📊 {showConf?'Hide':'Confidence'}</button>
        </div>}

        {/* Confidence scores */}
        {showConf&&hasData&&<div style={{padding:'10px 13px',borderTop:'1px solid var(--border)',background:'var(--bg3)'}}><InlineConf original={msg.content} pubs={pubs}/></div>}

        {/* Drug safety — shown inline if detected */}
        {drugs.length>0&&<div className="drug-inline">
          <div className="drug-inline-title"><Ic.Warn/> Drug safety flags — OpenFDA</div>
          <div className="drug-pill-row">{drugs.map((d,i)=><span key={i} className="drug-pill">{d.drug} · {d.topReactions?.slice(0,2).map(r=>r.reaction).join(', ')}</span>)}</div>
        </div>}

        {/* Follow-ups */}
        {followUps.length>0&&<div className="followups"><p className="fu-label">💡 Suggested follow-ups</p><div className="fu-chips">{followUps.map((q,i)=><button key={i} className="fu-chip" onClick={()=>onFollowUp(q)}>{q}</button>)}</div></div>}

        {m.expandedQuery&&<div className="msg-meta"><span>🔍 {m.totalFetched} retrieved</span><span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>Query: "{m.expandedQuery.slice(0,70)}"</span></div>}
      </div>

      {/* The 4 Big Tabs */}
      {hasData&&<div className="big-tabs">
        <BigTab icon="🤔" title="Need more clarity?" sub="AI Debate · Second Opinion · Compare Treatments · Contradictions" isOpen={openTab==='clarity'} onToggle={()=>toggle('clarity')}>
          <ClarityTab pubs={pubs} trials={trials} disease={disease} patientCtx={patientCtx}/>
        </BigTab>
        <BigTab icon="🔬" title="Explore the evidence" sub="Papers · Trials · Eligibility · Research Gaps · Researchers" isOpen={openTab==='evidence'} onToggle={()=>toggle('evidence')}>
          <EvidenceTab pubs={pubs} trials={trials} disease={disease} patientCtx={patientCtx}/>
        </BigTab>
        <BigTab icon="🧬" title="Understand the disease" sub="Disease Progression · Treatment History · Biomarkers" isOpen={openTab==='disease'} onToggle={()=>toggle('disease')}>
          <DiseaseTab disease={disease||patientCtx?.disease||''}/>
        </BigTab>
        <BigTab icon="📊" title="See it visually" sub="Analytics · Citation Network · Global Research Map · Resources" isOpen={openTab==='visual'} onToggle={()=>toggle('visual')}>
          <VisualTab pubs={pubs} disease={disease}/>
        </BigTab>
      </div>}

    </div>
  </div>);}

const QPS=[
  {e:'🫁',l:'Lung cancer',q:'Latest treatment options for lung cancer'},
  {e:'💉',l:'Diabetes trials',q:'Clinical trials for type 2 diabetes'},
  {e:'🧠',l:"Alzheimer's",q:"Top researchers in Alzheimer's disease"},
  {e:'❤️',l:'Heart disease',q:'Recent studies on heart disease prevention'},
  {e:'🦴',l:"Parkinson's DBS",q:"Deep brain stimulation for Parkinson's disease"},
  {e:'💊',l:'Drug safety',q:'Warfarin aspirin drug interactions adverse effects'},
];

export default function App(){
  const[msgs,setMsgs]=useState([]);
  const[steps,setSteps]=useState([]);
  const[prog,setProg]=useState(0);
  const[loading,setLoading]=useState(false);
  const[input,setInput]=useState('');
  const[sid]=useState(()=>uuidv4());
  const[ctx,setCtx]=useState({});
  const[showCtx,setShowCtx]=useState(false);
  const[sidebar,setSidebar]=useState(true);
  const[sessions,setSessions]=useState([]);
  const[err,setErr]=useState('');
  const[lastQ,setLastQ]=useState('');
  const endRef=useRef(null);const inRef=useRef(null);const stepsRef=useRef([]);
  const{on:voiceOn,start:voiceStart,stop:voiceStop}=useVoice(t=>setInput(t));

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[msgs,steps,loading]);

  const send=useCallback(async(text)=>{
    const msg=(text||input).trim();if(!msg||loading)return;
    setInput('');setErr('');setLastQ(msg);
    setMsgs(prev=>[...prev,{role:'user',content:msg}]);
    setLoading(true);setSteps([]);setProg(0);stepsRef.current=[];
    try{
      const res=await fetch(`${API}/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,sessionId:sid,patientContext:ctx})});
      const reader=res.body.getReader(),dec=new TextDecoder();let buf='';
      while(true){
        const{done,value}=await reader.read();if(done)break;
        buf+=dec.decode(value,{stream:true});
        const parts=buf.split('\n\n');buf=parts.pop();
        for(const part of parts){
          let ev='',da='';
          for(const line of part.split('\n')){if(line.startsWith('event: '))ev=line.slice(7).trim();if(line.startsWith('data: '))da=line.slice(6).trim();}
          if(!ev||!da)continue;
          try{
            const p=JSON.parse(da);
            if(ev==='pipeline'){const idx=stepsRef.current.findIndex(s=>s.id===p.step);if(idx>=0)stepsRef.current[idx]={...stepsRef.current[idx],done:true,active:false};stepsRef.current=[...stepsRef.current,{id:p.step,label:p.label,done:false,active:true}];setSteps([...stepsRef.current]);setProg(p.progress||0);}
            if(ev==='result'){
              stepsRef.current=stepsRef.current.map(s=>({...s,done:true,active:false}));setSteps([...stepsRef.current]);setProg(100);
              setMsgs(prev=>[...prev,{role:'assistant',content:p.response,metadata:{publications:p.publications,clinicalTrials:p.clinicalTrials,drugInteractions:p.drugInteractions,followUps:p.followUps,expandedQuery:p.metadata?.expandedQuery,processingTime:p.metadata?.processingTime,totalFetched:p.metadata?.totalFetched,disease:ctx.disease||''}}]);
              setSessions(prev=>[{sessionId:sid,patientContext:ctx,preview:msg.slice(0,60),updatedAt:new Date()},...prev.filter(s=>s.sessionId!==sid)].slice(0,15));
              setTimeout(()=>{setSteps([]);setProg(0);},2500);
            }
            if(ev==='error')setErr(p.message);
          }catch{}
        }
      }
    }catch(e){setErr(e.message||'Connection failed — is backend running on port 5000?');}
    finally{setLoading(false);inRef.current?.focus();}
  },[input,loading,sid,ctx]);

  const lastAI=[...msgs].reverse().find(m=>m.role==='assistant');
  const hasHistory=msgs.some(m=>m.role==='assistant');
  const ctxSet=ctx.name||ctx.disease;

  const exportReport=async()=>{
    if(!lastAI)return;
    try{const res=await fetch(`${API}/chat/report`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patientContext:ctx,publications:lastAI.metadata?.publications||[],clinicalTrials:lastAI.metadata?.clinicalTrials||[],aiResponse:lastAI.content,query:lastQ,generatedAt:new Date().toISOString()})});const html=await res.text();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));a.download=`medresearch-${Date.now()}.html`;a.click();}catch(e){alert('Export failed: '+e.message);}
  };

  return(<div className="app">
    <aside className={`sidebar ${!sidebar?'closed':''}`}>
      <div className="sb-header">
        <div className="sb-brand"><div className="sb-logo"><Ic.Dna/></div><div><p className="sb-name">MedResearch AI</p><p className="sb-llm">Llama 3.3 70B · Open Source</p></div></div>
        <button className="sb-new" onClick={()=>{setMsgs([]);setSteps([]);setErr('');setLastQ('');}}><Ic.Plus/> New session</button>
      </div>
      <div className="sb-body">
        <p className="sb-section-label">Sessions</p>
        {sessions.length===0&&<p style={{fontSize:10,color:'var(--t3)'}}>No sessions yet</p>}
        {sessions.map(s=><div key={s.sessionId} className={`sb-item ${s.sessionId===sid?'active':''}`}><p className="sb-disease">{s.patientContext?.disease||'Research session'}</p><p className="sb-preview">{s.preview}</p></div>)}
      </div>
    </aside>

    <div className="main">
      <div className="topbar">
        <div className="topbar-left">
          <button className="menu-btn" onClick={()=>setSidebar(v=>!v)}><Ic.Menu/></button>
          <button className={`patient-pill ${ctxSet?'set':''}`} onClick={()=>setShowCtx(v=>!v)}>
            <div className={`patient-dot ${ctxSet?'set':''}`}/>
            <span className={`patient-text ${ctxSet?'set':''}`}>{ctxSet?`${ctx.disease||ctx.name}${ctx.age?` · ${ctx.age}`:''}${ctx.gender?` · ${ctx.gender}`:''}`:(<><Ic.Steth/>&nbsp;Set patient context</>)}</span>
          </button>
        </div>
        <div className="topbar-right">
          {lastAI&&<button className="topbar-btn" onClick={exportReport}><Ic.Dl/> Export Report</button>}
        </div>
      </div>

      {showCtx&&<ContextPanel ctx={ctx} onSave={setCtx} onClose={()=>setShowCtx(false)}/>}

      <div className="body-wrap">
        <div className="chat-scroll">
          {msgs.length===0?(
            <div className="welcome">
              <div style={{textAlign:'center'}}><div className="w-icon"><Ic.Dna/></div><h2 className="w-title">MedResearch AI</h2><p className="w-sub">Powered by <strong>Llama 3.3 70B</strong> open source. Live research from PubMed, OpenAlex, ClinicalTrials.gov and OpenFDA. Get an analysis then explore with 4 guided research paths.</p></div>
              <div style={{width:'100%',maxWidth:460}}><p style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--t3)',textAlign:'center',marginBottom:7}}>Quick searches</p><div className="qp-grid">{QPS.map((q,i)=><button key={i} className="qp-btn" onClick={()=>send(q.q)}><span style={{fontSize:18}}>{q.e}</span>{q.l}</button>)}</div></div>
              <div className="src-row">{['Llama 3.3 70B','PubMed','OpenAlex','ClinicalTrials.gov','OpenFDA'].map(s=><span key={s} className="src-pill">{s}</span>)}</div>
            </div>
          ):(
            <div className="msgs">
              {msgs.map((m,i)=><Message key={i} msg={m} onFollowUp={q=>send(q)} patientCtx={ctx}/>)}
              {steps.length>0&&<div className="msg-ai"><div className="aavatar"><Ic.Dna/></div><div style={{flex:1,minWidth:0}}><Pipeline steps={steps} progress={prog}/></div></div>}
              {err&&<div className="error-msg"><strong>Error:</strong> {err}</div>}
              <div ref={endRef}/>
            </div>
          )}
        </div>
        {hasHistory&&<RightPanel messages={msgs} patientCtx={ctx}/>}
      </div>

      <div className="input-area">
        <div className="input-inner">
          <div className="input-box">
            <textarea ref={inRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Ask about a disease, treatment, clinical trial, or drug interaction..." disabled={loading} rows={1} className="chat-textarea"/>
            <button className={`ibtn ibtn-mic ${voiceOn?'on':''}`} onClick={voiceOn?voiceStop:voiceStart} title="Voice input (Chrome)"><Ic.Mic/></button>
            <button className="ibtn ibtn-send" onClick={()=>send()} disabled={!input.trim()||loading}>{loading?<div className="spinner"/>:<Ic.Send/>}</button>
          </div>
          <p className="input-hint">For research purposes only · Not medical advice · Always consult a qualified healthcare professional</p>
        </div>
      </div>
    </div>
  </div>);}
