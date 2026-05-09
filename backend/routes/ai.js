const express = require("express");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

function heuristicAnalysis(message = "") {
  const text = String(message || "").toLowerCase();
  let severity = "LOW";
  if (/(fire|explosion|sink|flood|collision|dead|engine failure|mayday)/.test(text)) severity = "HIGH";
  else if (/(injury|leak|navigation|storm|damage|fuel low)/.test(text)) severity = "MED";

  const injuryCount = Number((text.match(/(\d+)\s*(injur|crew hurt|casualt)/)?.[1]) || 0);
  const damageEstimate = text.includes("major") ? "major" : text.includes("minor") ? "minor" : "unknown";
  const issueType =
    text.match(/fire|flood|collision|engine|piracy|medical|storm|fuel/i)?.[0]?.toUpperCase() || "UNKNOWN";

  return {
    severity,
    issueType,
    injuryCount,
    damageEstimate,
    source: "fallback",
    model: "heuristic-v1",
    recommendedAction:
      severity === "HIGH"
        ? "Immediate response: reroute nearby support and prioritize rescue."
        : "Monitor closely and prepare reroute/support decision.",
  };
}

async function analyzeDistressMessage({ shipId, message }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return heuristicAnalysis(message);

  const prompt = `Extract structured distress data as strict JSON only.
Required keys: severity (HIGH|MED|LOW), issueType, injuryCount, damageEstimate, recommendedAction.
Ship: ${shipId}
Message: ${message}`;

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a maritime distress extraction engine." },
          { role: "user", content: prompt },
        ],
      }),
    });
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return heuristicAnalysis(message);
    const parsed = JSON.parse(content);
    return {
      severity: ["HIGH", "MED", "LOW"].includes(parsed?.severity) ? parsed.severity : "LOW",
      issueType: String(parsed?.issueType || "UNKNOWN"),
      injuryCount: Number.isFinite(Number(parsed?.injuryCount)) ? Number(parsed.injuryCount) : 0,
      damageEstimate: String(parsed?.damageEstimate || "unknown"),
      source: "groq",
      model: DEFAULT_MODEL,
      recommendedAction: String(parsed?.recommendedAction || "Monitor and assist as needed."),
    };
  } catch {
    return heuristicAnalysis(message);
  }
}

function createAiRouter() {
  const router = express.Router();

  router.post("/distress", async (req, res) => {
    const shipId = String(req.body?.shipId || "").toUpperCase();
    const message = String(req.body?.message || "");
    if (!shipId || !message) {
      return res.status(400).json({ error: "shipId and message are required" });
    }
    const analysis = await analyzeDistressMessage({ shipId, message });
    return res.json(analysis);
  });

  return router;
}

module.exports = { createAiRouter, analyzeDistressMessage };
