MedResearch AI 🧬
A production-grade medical research assistant powered by Meta's Llama 3.3 70B (open source), built on the MERN stack.
Watch Demo

What it does
Send a medical query → the system hits PubMed, OpenAlex, ClinicalTrials.gov and OpenFDA simultaneously, pulls 180+ raw results, ranks and scores them, and uses Llama 3.3 to reason over everything and deliver a structured, personalized, evidence-backed response in real time.
Every response comes with 4 guided exploration paths:

🤔 Need more clarity? — AI Debate, Second Opinion, Treatment Comparison, Contradictions
🔬 Explore the evidence — Papers, Trials, Eligibility Checker, Research Gaps, Researchers
🧬 Understand the disease — Progression Timeline, Treatment History, Biomarkers
📊 See it visually — Analytics, Citation Network, Global Research Map


Stack

Frontend — React.js
Backend — Node.js + Express.js
Database — MongoDB
LLM — Llama 3.3 70B via Groq
Sources — PubMed · OpenAlex · ClinicalTrials.gov · OpenFDA


Setup
bash# Backend
cd backend
npm install
# Create .env with PORT, MONGODB_URI, GROQ_API_KEY
npm run dev

# Frontend
cd frontend
npm install
npm start


For research purposes only. Not medical advice.

Built by Mani Maran
