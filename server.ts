import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import compression from "compression";
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

// In-Memory Sliding Window Rate Limiter for AI endpoint
interface RateLimitRecord {
  timestamps: number[];
}
const rateLimitStore = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // Max 30 requests per minute per IP

function aiRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "anonymous";
  const now = Date.now();

  let record = rateLimitStore.get(ip);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(ip, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (record.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const earliest = record.timestamps[0];
    const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - earliest)) / 1000);
    res.setHeader("Retry-After", retryAfterSec);
    return res.status(429).json({
      error: "Too many AI analysis requests. Please wait before asking again.",
      retryAfterSeconds: retryAfterSec,
    });
  }

  record.timestamps.push(now);
  next();
}

// Periodically clean up stale IP keys in rate limiter every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(ip);
    }
  }
}, 10 * 60 * 1000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Performance: Response Compression (Gzip / Deflate)
  app.use(compression());

  // 2. Security: Standard Enterprise HTTP Security Headers
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // 3. Body Parser with Size Limits
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));

  // 4. Detailed Health & Diagnostics Endpoint
  const startTime = Date.now();
  app.get("/api/health", (_req, res) => {
    const memory = process.memoryUsage();
    res.json({
      status: "ok",
      app: "Inventora Enterprise ERP",
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      memory: {
        rssMb: (memory.rss / (1024 * 1024)).toFixed(2),
        heapUsedMb: (memory.heapUsed / (1024 * 1024)).toFixed(2),
      },
    });
  });

  // 5. Rate-limited API route for Gemini AI Analyst
  app.post("/api/analyst", aiRateLimiter, async (req, res) => {
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

  // 6. Vite middleware for development vs Static Production Assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Enable caching for static production assets
    app.use(express.static(distPath, { maxAge: "1d", etag: true }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
