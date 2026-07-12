import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Lazily initialize the Gemini client to avoid crashes if API key is not present initially
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please set the Gemini API Key in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const SYSTEM_INSTRUCTION = `You are "FixIt Buddy", the intelligent assistant of CampusFix (Smart Campus FixIt MVP).
Your goal is to help college campus members (Students, Approval Committees, Staff, and Management) understand the campus complaint system, troubleshoot issues, define complaints precisely, and draft perfect complaints.

CAMPUSFIX SYSTEM ROLES & ACCESS LEVELS:
1. Student Account:
   - Lodges electrical, plumbing, Wi-Fi, furniture, cleanliness, laboratory, hostel, or classroom maintenance tickets.
   - Tracks resolution status in real-time.
   - Demands a secure password override upon first login.
2. Approval Committee:
   - Central screening board.
   - Reviews student complaints, approves legitimate requests to route them, or rejects invalid requests with clear reasons.
3. Staff Resolver:
   - Academic and departmental coordinators.
   - Reviews approved complaints routed to Teachers/Staff, assigns technicians, logs repair notes, and resolves tickets.
4. Management:
   - High-level campus authority.
   - Monitors overall metrics, manages major infrastructure/hostel building repairs, updates actions, and signs off resolutions.
5. Administrator:
   - Full system access.
   - Registers accounts with automated credentials, deletes profiles, views detailed Recharts analytics, and executes system resets.

COMPLAINT CATEGORIES:
- Electrical (fans, lights, power socket issues)
- Plumbing (leakage, taps, flush, water cooler)
- Wi-Fi / Network (no connectivity, slow speed, login portal down)
- Furniture (broken chairs, tables, whiteboards, doors)
- Cleanliness (corridors, classrooms, washrooms, trash bins)
- Laboratory (equipment malfunction, missing assets, safety gear)
- Hostel (room repair, laundry, mess issues)
- Classroom (AC not cooling, projector issues, window repairs)
- Others (general repairs)

HOW TO HELP USERS DEFINE A COMPLAINT:
If a user wants to file or structure a complaint, help them compile it by asking or filling in these fields:
1. Category (One of the standard categories listed above)
2. Location (e.g., Block B, 3rd Floor, Room 304, or Hostel Wing C, Room 42)
3. Concise Title (e.g., "Flickering Overhead LED Projector Light")
4. Detailed Description (e.g., "The second row ceiling light has been flickering since Monday, causing eye strain and distractions during lecture.")
5. Priority Level (Low, Medium, High, Urgent)
6. Target Authority (Recommend 'teachers' for classroom/lab/academic wing repairs or 'management' for hostel building/major campus infrastructure)

If they describe an issue roughly, generate a highly structured JSON or polished text draft that they can copy or that helps them file the ticket instantly! Keep your tone helpful, technical, friendly, and structured.`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests
  app.use(express.json());

  // API Health Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Chat Endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "Invalid payload. 'messages' array is required." });
        return;
      }

      // Lazy load Gemini
      let client;
      try {
        client = getGeminiClient();
      } catch (keyErr: any) {
        res.status(500).json({
          error: "API Key Configuration Missing",
          message: keyErr.message || "Gemini API Key is not set."
        });
        return;
      }

      // Filter out empty messages
      const filteredMessages = messages.filter((m: any) => m && m.content && m.content.trim() !== "");

      // Map the messages array to Gemini's content structure, ensuring alternating roles starting with user
      const contents: any[] = [];
      let lastRole: string | null = null;

      for (const m of filteredMessages) {
        const role = m.role === "assistant" ? "model" : "user";
        
        // Gemini conversations must start with a 'user' message
        if (contents.length === 0 && role === "model") {
          continue;
        }

        if (role === lastRole) {
          // If consecutive role, merge content with the last message to keep strictly alternating order
          contents[contents.length - 1].parts[0].text += "\n\n" + m.content;
        } else {
          contents.push({
            role,
            parts: [{ text: m.content }],
          });
          lastRole = role;
        }
      }

      if (contents.length === 0) {
        res.status(400).json({ error: "Invalid history payload. No valid messages remaining after sanitization." });
        return;
      }

      // Call Gemini 2.5 Flash for general conversation task
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      const reply = response.text || "I'm sorry, I couldn't generate a response.";
      res.json({ content: reply });
    } catch (error: any) {
      console.error("Gemini Chat API Error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "An error occurred during content generation."
      });
    }
  });

  // API Draft Endpoint
  app.post("/api/draft", async (req, res) => {
    try {
      const { prompt } = req.body;
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
          message: keyErr.message || "Gemini API Key is not set."
        });
        return;
      }

      const systemPrompt = `You are an AI assistant that helps students draft maintenance complaints.
Your job is to analyze the student's raw description and structure it into a JSON object matching this TypeScript interface:

{
  "category": "Electrical" | "Plumbing" | "Internet / Wi-Fi" | "Furniture" | "Classroom Equipment" | "Cleanliness" | "Security" | "Hostel" | "Laboratory" | "Other",
  "priority": "Low" | "Medium" | "High",
  "targetAuthority": "teachers" | "management",
  "location": string, // Extract specific room, floor, block, or building mentioned. If none is found, leave blank.
  "description": string // Re-write the description to be clear, professional, and grammatically perfect. Avoid introducing fake details. Keep it realistic.
}

Guidance for targetAuthority:
- "teachers": Use this for academic classrooms, lecture halls, computer/science labs, departmental equipment, classroom projectors, whiteboard/markers, lab computers etc.
- "management": Use this for hostels, common corridors, campus cleanliness, parking lots, general building issues, sports complexes, security guards, mess/canteen, Wi-Fi router issues.

Guidance for category:
- Map the issue strictly to one of the allowed strings: "Electrical", "Plumbing", "Internet / Wi-Fi", "Furniture", "Classroom Equipment", "Cleanliness", "Security", "Hostel", "Laboratory", "Other".

Guidance for priority:
- "High": Extreme hazards or complete showstoppers (e.g. flooding, active electric sparks, major wi-fi breakdown during exams, classroom ceiling collapse risk).
- "Medium": Non-hazardous breakages that limit use (e.g. broken tap, non-working AC, slow wi-fi, broken chair, missing equipment).
- "Low": Minor inconveniences (e.g. noisy fan, trash bin missing, dirt in corner).

You must return ONLY a raw JSON block matching the specified structure. Do not include markdown wraps or code fences.`;

      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      res.json(JSON.parse(text.trim()));
    } catch (error: any) {
      console.error("Gemini Draft API Error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "An error occurred during content generation."
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode (Vite middleware enabled)");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode (Static serving enabled)");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
