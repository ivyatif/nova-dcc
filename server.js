const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const GHL_TOKEN = process.env.GHL_TOKEN || '';
const GHL_BASE = 'https://services.leadconnectorhq.com';

// Proxy all /api/ghl/* requests to GHL
app.all('/api/ghl/*', async (req, res) => {
  try {
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
