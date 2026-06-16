const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({limit:'10mb'}));
app.use(express.static('public'));

const GHL_TOKEN = process.env.GHL_TOKEN || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY || '';
const GHL_BASE = 'https://services.leadconnectorhq.com';

// Health check — shows if token is loaded
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    ghl_token: GHL_TOKEN ? 'loaded (' + GHL_TOKEN.slice(0,8) + '...)' : 'MISSING',
    anthropic_key: ANTHROPIC_KEY ? 'loaded' : 'MISSING'
  });
});

// Proxy GHL requests
app.all('/api/ghl/*', async (req, res) => {
  try {
    if (!GHL_TOKEN) return res.status(500).json({ error: 'GHL_TOKEN not set in Railway variables' });
    const ghlPath = req.path.replace('/api/ghl', '');
    const query = new URLSearchParams(req.query).toString();
    const url = GHL_BASE + ghlPath + (query ? '?' + query : '');
    const options = {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${GHL_TOKEN}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = JSON.stringify(req.body);
    }
    const response = await fetch(url, options);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy Anthropic API
app.post('/api/nova', async (req, res) => {
  try {
    if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'ANTHROPIC_KEY not set in Railway variables' });
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve Nova app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Nova running on port ${PORT}`));
