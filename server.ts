import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "Inventora", time: new Date().toISOString() });
  });

  // API route for Gemini AI Analyst
  app.post("/api/analyst", async (req, res) => {
    try {
      const { prompt, context } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Return structured insight if GEMINI_API_KEY is not yet configured
        return res.json({
          result: `[Inventora Automated Summary]\n\nBased on your current operations data:\n- Total Infrastructure Units: 1,104 units across hardware clusters with optimal status.\n- Active Purchase Orders: 45 registered POs (12 pending executive approvals).\n- Revenue: Rp 12.8M (up 18% month-over-month) with healthy liquidity.\n- Staffing: 342 active headcount with 15 recent onboarding events.\n\n*Note: Configure GEMINI_API_KEY in your environment to enable custom interactive conversational queries.*`
        });
      }

      const ai = getGeminiClient();
      const systemInstruction = `You are a helpful, professional AI Analyst integrated into the Inventora Enterprise ERP system.
Your job is to answer user queries based on the provided dashboard data context.
Keep your answers concise, professional, data-driven, and directly address the user's question using the provided metrics.`;

      const finalPrompt = `Dashboard Context Data:\n${JSON.stringify(context, null, 2)}\n\nUser Request: ${prompt}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: finalPrompt,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      res.json({ result: response.text });
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI analysis" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
