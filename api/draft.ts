import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getGeminiClient, DRAFT_SYSTEM_INSTRUCTION } from "./_gemini.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { prompt } = req.body ?? {};
    if (!prompt) {
      res.status(400).json({ error: "Prompt is required." });
      return;
    }

    let client;
    try {
      client = getGeminiClient();
    } catch (keyErr: any) {
      res.status(500).json({
        error: "API Key Configuration Missing",
        message: keyErr.message || "Gemini API Key is not set.",
      });
      return;
    }

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: DRAFT_SYSTEM_INSTRUCTION,
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    res.status(200).json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Gemini Draft API Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "An error occurred during content generation.",
    });
  }
}
