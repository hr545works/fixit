import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getGeminiClient, CHAT_SYSTEM_INSTRUCTION } from "./_gemini";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { messages } = req.body ?? {};
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Invalid payload. 'messages' array is required." });
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

    // Filter out empty messages
    const filteredMessages = messages.filter((m: any) => m && m.content && m.content.trim() !== "");

    // Map to Gemini's content structure, ensuring alternating roles starting with 'user'
    const contents: any[] = [];
    let lastRole: string | null = null;

    for (const m of filteredMessages) {
      const role = m.role === "assistant" ? "model" : "user";

      if (contents.length === 0 && role === "model") {
        continue;
      }

      if (role === lastRole) {
        contents[contents.length - 1].parts[0].text += "\n\n" + m.content;
      } else {
        contents.push({ role, parts: [{ text: m.content }] });
        lastRole = role;
      }
    }

    if (contents.length === 0) {
      res.status(400).json({ error: "Invalid history payload. No valid messages remaining after sanitization." });
      return;
    }

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: CHAT_SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const reply = response.text || "I'm sorry, I couldn't generate a response.";
    res.status(200).json({ content: reply });
  } catch (error: any) {
    console.error("Gemini Chat API Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "An error occurred during content generation.",
    });
  }
}
