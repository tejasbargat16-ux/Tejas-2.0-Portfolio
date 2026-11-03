/* ==========================================================================
   NEXUS AI — LOCAL / PRODUCTION BACKEND SERVER (server/server.js)
   Standalone zero-dependency Node.js HTTP server for NEXUS AI
   Runs on Node 18+ using native fetch & http
   ========================================================================== */

import http from "node:http";
import { NEXUS_SYSTEM_PROMPT } from "../src/nexus/knowledgeBase.js";

const PORT = process.env.PORT || 3001;

// Simple in-memory rate limiter (sliding window)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 20;

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
  return entry.count <= MAX_REQUESTS;
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    return res.end();
  }

  // Health check endpoint
  if (req.method === "GET" && req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        status: "ok",
        service: "NEXUS AI Backend",
        hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
        hasGroqKey: Boolean(process.env.GROQ_API_KEY),
        hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      })
    );
  }

  // Chat conversation endpoint
  if (req.method === "POST" && (req.url === "/api/chat" || req.url === "/chat")) {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anonymous";

    if (!checkRateLimit(clientIp)) {
      res.writeHead(429, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Rate limit exceeded. Please wait a minute." }));
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 50000) {
        req.destroy(); // Prevent memory exhaustion
      }
    });

    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const { message, history } = parsed;

        if (!message || typeof message !== "string" || !message.trim()) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Message parameter is required." }));
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        const groqKey = process.env.GROQ_API_KEY;
        const openAiKey = process.env.OPENAI_API_KEY;

        let reply = "";

        if (geminiKey) {
          reply = await callGemini(geminiKey, message.trim(), history);
        } else if (groqKey) {
          reply = await callGroq(groqKey, message.trim(), history);
        } else if (openAiKey) {
          reply = await callOpenAI(openAiKey, message.trim(), history);
        } else {
          res.writeHead(503, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({
              error: "No AI API key configured on the server. Falling back to knowledge engine.",
            })
          );
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ reply }));
      } catch (err) {
        console.error("NEXUS Server Error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({ error: "Server error: " + (err.message || "Unknown error") })
        );
      }
    });

    return;
  }

  // 404 for other endpoints
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint not found." }));
});

async function callGemini(apiKey, userMessage, history = []) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const contents = [
    {
      role: "user",
      parts: [{ text: NEXUS_SYSTEM_PROMPT + "\n\nPlease acknowledge and adhere to these guidelines." }],
    },
    {
      role: "model",
      parts: [{ text: "Understood. I am NEXUS AI, the official personal portfolio intelligence representing Tejas Rajesh Bargat." }],
    },
  ];

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
      generationConfig: { maxOutputTokens: 500, temperature: 0.4 },
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

async function callGroq(apiKey, userMessage, history = []) {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const messages = [{ role: "system", content: NEXUS_SYSTEM_PROMPT }];

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

async function callOpenAI(apiKey, userMessage, history = []) {
  const url = "https://api.openai.com/v1/chat/completions";
  const messages = [{ role: "system", content: NEXUS_SYSTEM_PROMPT }];

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

server.listen(PORT, () => {
  console.log(`[NEXUS AI] Server running on http://localhost:${PORT}`);
  console.log(`[NEXUS AI] Gemini API Key: ${process.env.GEMINI_API_KEY ? "CONFIGURED ✓" : "NOT SET (Local Engine active)"}`);
});
