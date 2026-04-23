require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medresearch')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('⚠️  MongoDB offline — running in memory mode'));

// Routes
app.use('/api/chat', require('./routes/chat'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/advanced', require('./routes/advanced'));

// Health check
app.get('/api/health', (req, res) => res.json({ 
  status: 'ok', 
  llm: 'Llama 3.3 70B via Groq',
  sources: ['PubMed', 'OpenAlex', 'ClinicalTrials.gov', 'OpenFDA'],
  timestamp: new Date().toISOString() 
}));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🚀 MedResearch AI running on port ${PORT}`);
  console.log(`🧠 LLM: Llama 3.3 70B (Groq)`);
  console.log(`📚 Sources: PubMed + OpenAlex + ClinicalTrials.gov + OpenFDA\n`);
});
