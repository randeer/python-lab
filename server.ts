import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Standard port is 3000
const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Safe Lazy Initializer for Gemini API client
  let aiClient: GoogleGenAI | null = null;
  function getGenAI(): GoogleGenAI | null {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Server continues running, but AI features will be unavailable.");
        return null;
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

  // Health check
  app.get("/api/health", (req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY;
    res.json({ status: "ok", aiTutorEnabled: hasKey });
  });

  // AI Tutor Proxy Endpoint
  app.post("/api/tutor", async (req, res) => {
    try {
      const { code, exerciseTitle, exerciseDescription, userInput, history = [] } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.status(503).json({
          error: "AI service is currently unavailable. Please ensure GEMINI_API_KEY is configured in your Secrets.",
        });
      }

      // Build context and run Gemini 3.5 Flash for high-speed response
      const systemPrompt = `You are "PyGuide", an elite, extremely friendly, and supportive virtual Python Coach for beginner coders learning on mobile devices.
IMPORTANT CONSTRAINTS FOR MOBILE LAYOUT:
- Keep responses short, direct, and limited to about 150-200 words maximum.
- Use clean, simple tables or bullet points to present key concepts.
- Avoid bulky blocks of code. Show only 1-4 line code snippets highlighting the exact change.
- Never write overly complex terminology without a brief, intuitive real-world analogy. It is critical for beginners.
- Cheer on the learner and keep their motivation sky high with a supportive, gamified tone!

CONTEXT:
Exercise Title: ${exerciseTitle || "Python Sandbox"}
Exercise Task: ${exerciseDescription || "General exploration of Python syntax"}
Current Code in Editor:
\`\`\`python
${code || "# No code written yet"}
\`\`\`
Answer the user's question, review their code, highlight any syntax errors, or explain compiler results clearly. Keep it highly readable on a phone screen.`;

      // Construct messages list including history
      const contentsList: any[] = [];
      
      // Combine system prompt and context as preceding guidance or first line
      contentsList.push({
        role: "user",
        parts: [{ text: `${systemPrompt}\n\nUser Question: ${userInput}` }],
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contentsList,
        config: {
          temperature: 0.7,
        },
      });

      const text = response.text || "No response received.";
      res.json({ reply: text });
    } catch (error: any) {
      console.error("AI Tutor endpoint error:", error);
      res.status(500).json({ error: error.message || "An error occurred with the AI Tutor." });
    }
  });

  // Integrate Vite Middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("Loading Vite Dev Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in Production Mode. Serving static assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Python Learning Lab] Server started and listening at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start full stack server:", err);
});
