import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for Gemini AI Analyst
  app.post("/api/analyst", async (req, res) => {
    try {
      const { prompt, context } = req.body;
      
      const systemInstruction = `You are a helpful, professional AI Analyst integrated into an Enterprise ERP system.
Your job is to answer user queries based on the provided dashboard data context.
Keep your answers concise, professional, and directly address the user's question using the provided data.`;

      const finalPrompt = `Dashboard Context Data:\n${JSON.stringify(context, null, 2)}\n\nUser Request: ${prompt}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: finalPrompt,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      res.json({ result: response.text });
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ error: error.message });
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
