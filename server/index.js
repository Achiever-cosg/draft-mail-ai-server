import prompt from './utils/prompt.js';

const { GEMINI_API_KEY, MODEL_NAME } = process.env;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

function buildGeminiRequestBody(emailContent) {
  return {
    contents: [
      {
        parts: [
          { text: `${prompt}\n\n${emailContent.trim()}` },
        ],
      },
    ],
  };
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, message: 'Proxy server is up and running....' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { emailContent } = req.body;

  if (!emailContent || typeof emailContent !== 'string' || emailContent.trim() === '') {
    return res.status(400).json({ error: 'Missing or empty emailContent in request body' });
  }

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGeminiRequestBody(emailContent)),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error('Gemini API error:', response.status, errBody);
      return res.status(response.status).json({
        error: errBody?.error?.message || 'Gemini API request failed',
      });
    }

    const data = await response.json();
    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data));
      return res.status(502).json({ error: 'Unexpected response from Gemini API' });
    }

    return res.status(200).json({ reply: generatedText });

  } catch (error) {
    console.error('Handler fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
