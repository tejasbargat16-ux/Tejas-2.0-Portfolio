/* ==========================================================================
   NEXUS AI — SERVERLESS API ENDPOINT (api/chat.js)
   Compatible with Vercel, Netlify Functions, and Node.js serverless runtimes
   Securely invokes Google Gemini or OpenAI/Groq without exposing private keys
   ========================================================================== */

import { NEXUS_SYSTEM_PROMPT } from "../src/nexus/knowledgeBase.js";

// Rate limiting in-memory store (sliding window per IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };

  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + RATE_LIMIT_WINDOW;
  } else {
    entry.count += 1;
  }

  rateLimitMap.set(ip, entry);
  return entry.count <= MAX_REQUESTS_PER_WINDOW;
}

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anonymous";
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: "Rate limit exceeded. Please wait a moment before sending more messages.",
    });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "A valid message string is required." });
  }

  // Determine LLM Provider from environment
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  try {
    // 1. Google Gemini API (Recommended Default)
    if (geminiKey) {
      const reply = await callGeminiAPI(geminiKey, message, history);
      return res.status(200).json({ reply });
    }

    // 2. Groq Cloud API
    if (groqKey) {
      const reply = await callGroqAPI(groqKey, message, history);
      return res.status(200).json({ reply });
    }

    // 3. OpenAI API
    if (openAiKey) {
      const reply = await callOpenAIAPI(openAiKey, message, history);
      return res.status(200).json({ reply });
    }

    // If no API key configured on server:
    return res.status(503).json({
      error: "No AI API key configured on the server. Falling back to portfolio knowledge engine.",
    });
  } catch (err) {
    console.error("NEXUS AI Backend Error:", err);
    return res.status(500).json({
      error: "Failed to generate AI response: " + (err.message || "Unknown error"),
    });
  }
}

async function callGeminiAPI(apiKey, userMessage, history = []) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const contents = [
    {
      role: "user",
      parts: [{ text: NEXUS_SYSTEM_PROMPT + "\n\nPlease acknowledge and adhere to these guidelines." }],
    },
    {
      role: "model",
      parts: [{ text: "Understood. I am NEXUS AI, the official personal portfolio intelligence representing Tejas Rajesh Bargat. I will provide accurate, grounded, concise, and helpful answers." }],
    },
  ];

  // Append recent history
  if (Array.isArray(history)) {
    for (const h of history) {
      if (h.role && h.content) {
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        });
      }
    }
  }

  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.4,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorData}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini API.");
  return text;
}

async function callGroqAPI(apiKey, userMessage, history = []) {
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const messages = [
    { role: "system", content: NEXUS_SYSTEM_PROMPT },
  ];

  if (Array.isArray(history)) {
    for (const h of history) {
      if (h.role && h.content) {
        messages.push({ role: h.role, content: h.content });
      }
    }
  }

  messages.push({ role: "user", content: userMessage });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      max_tokens: 500,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callOpenAIAPI(apiKey, userMessage, history = []) {
  const url = "https://api.openai.com/v1/chat/completions";

  const messages = [
    { role: "system", content: NEXUS_SYSTEM_PROMPT },
  ];

  if (Array.isArray(history)) {
    for (const h of history) {
      if (h.role && h.content) {
        messages.push({ role: h.role, content: h.content });
      }
    }
  }

  messages.push({ role: "user", content: userMessage });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
