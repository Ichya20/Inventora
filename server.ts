import { validateParsedInvoice } from './src/lib/invoiceValidation';
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import compression from "compression";
import "dotenv/config";
import { requireFirebaseRole } from './server/auth';
import { persistGoodsReceipt, persistPurchaseOrder, verifyFirebaseToken } from './server/firebaseAdmin';
import { ROLES } from './src/lib/authorization';
import type { VerifiedUser } from './server/auth';
import { AiServiceError, aiServiceError, generateAiContent } from './server/ai';

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
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
  const ip = res.locals.user?.uid || req.ip || req.socket.remoteAddress || "anonymous";
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
}, 10 * 60 * 1000).unref();

export function createApp({ verifyToken = verifyFirebaseToken, saveReceipt = persistGoodsReceipt, createPurchaseOrder = persistPurchaseOrder, getAi = getGeminiClient }: {
  verifyToken?: (token: string) => Promise<VerifiedUser>;
  saveReceipt?: typeof persistGoodsReceipt;
  createPurchaseOrder?: typeof persistPurchaseOrder;
  getAi?: typeof getGeminiClient;
} = {}) {
  const app = express();
  const aiAccess = requireFirebaseRole(verifyToken, ROLES);
  const financeAccess = requireFirebaseRole(verifyToken, ['Super Admin', 'Finance Manager']);
  const warehouseAccess = requireFirebaseRole(verifyToken, ['Super Admin', 'Warehouse Manager']);
  const procurementAccess = requireFirebaseRole(verifyToken, ['Super Admin', 'Finance Manager', 'Warehouse Manager']);

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

  // Normalize presentation without replacing unavailable business data.
  function cleanAiOutput(text: string): string {
    if (!text) return '';
    return text
      // Remove hashtag headers (# Header -> Header)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic asterisks (**word** -> word, *word* -> word)
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
      // Remove underscore emphasis
      .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
      // Remove inline and block backticks
      .replace(/```[a-z]*\n?/gi, '')
      .replace(/`([^`]+)`/g, '$1')
      // Normalize asterisk/plus bullets to clean bullet •
      .replace(/^\s*[\*\+]\s+/gm, '• ')
      .replace(/^\s*-\s+/gm, '• ')
      // Remove bracket wrappers around titles: [Executive Copilot] -> Executive Copilot
      .replace(/\[([^\]]+)\]/g, '$1')
      .trim();
  }

  const aiUnavailable = (res: express.Response) => res.status(503).json({ code: 'AI_UNAVAILABLE', error: 'Analisis AI belum tersedia. Silakan coba kembali.' });
  const aiFailure = (res: express.Response, error: unknown) => {
    const failure = aiServiceError(error);
    console.warn('AI request failed:', { code: failure.code, status: failure.status });
    if (failure.retryAfterSeconds) res.setHeader('Retry-After', failure.retryAfterSeconds);
    return res.status(failure.status).json({ code: failure.code, error: failure.message, ...(failure.retryAfterSeconds ? { retryAfterSeconds: failure.retryAfterSeconds } : {}) });
  };
  const aiNotConfigured = (res: express.Response) => aiFailure(res, new AiServiceError('AI_NOT_CONFIGURED', 'GEMINI_API_KEY belum diisi pada server.'));

  app.post('/api/purchase-orders', warehouseAccess, async (req, res) => {
    try { return res.status(201).json(await createPurchaseOrder(req.body, res.locals.user)); }
    catch (error: any) {
      if ([422, 409].includes(error.status)) return res.status(error.status).json({ error: error.message });
      console.error('PO creation failed:', error.code || 'server-configuration');
      return res.status(503).json({ error: 'PO belum tersimpan. Periksa koneksi dan konfigurasi Firebase Admin.' });
    }
  });

  app.post('/api/purchase-orders/:poId/receipt', warehouseAccess, async (req, res) => {
    if (!req.params.poId || req.params.poId.length > 200 || req.params.poId.includes('/') || !req.body?.grn) {
      return res.status(400).json({ error: 'ID PO dan rincian GRN wajib diisi.' });
    }
    try {
      const result = await saveReceipt(req.params.poId, req.body.grn, res.locals.user);
      return res.json(result);
    } catch (error: any) {
      if (error.status === 422 || error.status === 404) return res.status(error.status).json({ error: error.message });
      console.error('Receipt persistence failed:', error.code || 'server-configuration');
      return res.status(503).json({ error: 'Penerimaan belum tersimpan. Periksa koneksi dan konfigurasi Firebase Admin pada server.' });
    }
  });

  // 5.1. General AI Analyst
  app.post("/api/analyst", financeAccess, aiRateLimiter, async (req, res) => {
    const { prompt, context } = req.body || {};
    if (typeof prompt !== "string" || !prompt.trim()) return res.status(400).json({ error: "Prompt wajib diisi." });
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return aiNotConfigured(res);
    }

    try {
      const ai = getAi();
      const systemInstruction = `You are a helpful, professional AI Analyst integrated into the Inventora Enterprise ERP system.
Your job is to answer user queries based on the provided dashboard data context.
Use only the supplied metrics. Clearly identify illustrative input as sample data. Null or missing values are unavailable, not zero. Do not invent revenue, forecasts, or reconciliation status.
IMPORTANT FORMATTING RULE: Output clean, neat plain text only. Do NOT use markdown symbols, asterisks (* or **), hashtags (#), or code backticks. Use clear line breaks and simple dash (-) or bullet (•) points.`;

      const finalPrompt = `Dashboard Context Data:\n${JSON.stringify(context, null, 2)}\n\nUser Request: ${prompt}`;

      const response = await generateAiContent(ai, {
        contents: finalPrompt,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      if (!response.text?.trim()) return aiUnavailable(res);
      return res.json({ result: cleanAiOutput(response.text), source: "ai" });
    } catch (error: any) {
      return aiFailure(res, error);
    }
  });

  // 5.2. Executive ERP Copilot (Interactive Assistant)
  app.post("/api/copilot", aiAccess, aiRateLimiter, async (req, res) => {
    const { message, context, history } = req.body || {};
    if (typeof message !== "string" || !message.trim()) return res.status(400).json({ error: "Pesan wajib diisi." });
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return aiNotConfigured(res);
    }

    try {
      const ai = getAi();
      const systemInstruction = `You are the Executive Copilot of Inventora Enterprise ERP.
You assist C-level executives, finance controllers, and procurement leads with high-velocity data synthesis, executive memos, PO evaluations, and strategic operations guidance.
Format your responses using clean, neat plain text with clear headings and bullet points (using simple • or -).
CRITICAL: Do NOT use markdown asterisks (* or **), hashtag headers (#, ##, ###), or backtick marks. Keep all text completely clean and uncluttered.
Ground all factual statements on the provided ERP context. Null or absent metrics are unavailable, not zero. Do not invent revenue, payment reconciliation, historical trends, or synchronization status. Explain when the supplied context cannot answer the question.`;

      const promptPayload = `Real-Time ERP System Context:\n${JSON.stringify(context || {}, null, 2)}\n\nRecent Conversation History:\n${JSON.stringify(history || [], null, 2)}\n\nUser Message: ${message}`;

      const response = await generateAiContent(ai, {
        contents: promptPayload,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      if (!response.text?.trim()) return aiUnavailable(res);
      return res.json({ reply: cleanAiOutput(response.text), source: "ai" });
    } catch (error: any) {
      return aiFailure(res, error);
    }
  });

  // 5.3. Smart PO Risk & Price Anomaly Detector
  app.post("/api/ai/po-risk", procurementAccess, aiRateLimiter, async (req, res) => {
    const { po } = req.body || {};
    if (!po || typeof po !== "object") return res.status(400).json({ error: "PO wajib diisi." });
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return aiNotConfigured(res);
    }

    try {
      const ai = getAi();
      const prompt = `Analyze this Purchase Order for procurement fraud, price spikes, vendor risks, and budget variances:
${JSON.stringify(po, null, 2)}

Return a strict JSON object with:
- "riskLevel": "LOW" | "MEDIUM" | "HIGH"
- "riskScore": integer between 0 and 100
- "summary": concise 1-2 sentence risk executive briefing (plain text, no asterisks or hashtags)
- "anomalies": array of detected risks or price variances (strings, plain text)
- "recommendation": concrete next step for the approving director (plain text, no asterisks)
- "budgetVariancePercent": include only when a benchmark price is provided in the input; otherwise omit it`;

      const response = await generateAiContent(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You are an Enterprise Procurement Risk & Anomaly Analyzer for Inventora ERP. Always respond with strict, valid JSON matching the requested schema. Do not claim vendor, price, or budget verification without supporting input. State missing evidence. Never use asterisks or hashtag symbols in string values."
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      if (parsed.summary) parsed.summary = cleanAiOutput(parsed.summary);
      if (parsed.recommendation) parsed.recommendation = cleanAiOutput(parsed.recommendation);
      if (Array.isArray(parsed.anomalies)) {
        parsed.anomalies = parsed.anomalies.map((a: string) => cleanAiOutput(a));
      }
      return res.json(parsed);
    } catch (error: any) {
      return aiFailure(res, error);
    }
  });

  // 5.4. Predictive Restock & Demand Forecaster
  app.post("/api/ai/forecast-restock", warehouseAccess, aiRateLimiter, async (req, res) => {
    const { inventory } = req.body || {};
    if (!Array.isArray(inventory)) return res.status(400).json({ error: "Daftar stok wajib diisi." });
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return aiNotConfigured(res);
    }

    try {
      const ai = getAi();
      const prompt = `Analyze this inventory stock list and forecast restock needs:
${JSON.stringify(inventory, null, 2)}

Return a strict JSON object:
{
  "insights": "1-2 sentence summary of overall stock health (clean text, no asterisks or hash marks)",
  "forecasts": [
    {
      "skuId": string,
      "name": string,
      "daysUntilStockout": number,
      "recommendedOrderQty": number,
      "urgency": "NORMAL" | "HIGH" | "CRITICAL",
      "rationale": "plain text reasoning without asterisks or markdown syntax"
    }
  ]
}`;

      const response = await generateAiContent(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You are an Inventory Demand & Restock Forecaster for an Enterprise ERP system. Output strict, valid JSON only. Do not use asterisks, hashes, or backticks in text strings."
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      if (parsed.insights) parsed.insights = cleanAiOutput(parsed.insights);
      if (Array.isArray(parsed.forecasts)) {
        parsed.forecasts.forEach((f: any) => {
          if (f.rationale) f.rationale = cleanAiOutput(f.rationale);
        });
      }
      if (!parsed.forecasts || !Array.isArray(parsed.forecasts) || parsed.forecasts.length === 0) {
        return aiUnavailable(res);
      }
      return res.json(parsed);
    } catch (error: any) {
      return aiFailure(res, error);
    }
  });

  // 5.5. Smart Invoice & Raw Quote Text Parser (Text-to-PO)
  app.post("/api/ai/parse-invoice", warehouseAccess, aiRateLimiter, async (req, res) => {
    const { text } = req.body || {};
    if (typeof text !== "string" || !text.trim() || text.length > 50000) {
      return res.status(400).json({ error: "Text is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return aiNotConfigured(res);
    }

    try {
      const ai = getAi();
      const prompt = `Extract all procurement details from this raw invoice, quote, or vendor order text:
"""
${text}
"""

Return a strict JSON object:
{
  "vendor": string,
  "invoiceNo": string (or "DRAFT"),
  "date": string (YYYY-MM-DD, only if present),
  "items": [
    {
      "name": string,
      "qty": number,
      "unitPrice": number,
      "subtotal": number
    }
  ],
  "subtotal": number,
  "taxAmount": number (only tax explicitly specified; use 0 when absent),
  "grandTotal": number,
  "notes": string
}`;

      const response = await generateAiContent(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You are an Intelligent Document & Invoice Parser for Inventora ERP. Extract only facts present in the source document. Never invent vendors, dates, item quantities, prices or taxes. If required details are missing, return an error object. Reconcile all line totals and the grand total."
        }
      });

      const parsed = validateParsedInvoice(JSON.parse(response.text || "{}"));
      const normalizedSource = text.toLowerCase().replace(/\s+/g, " ");
      if (!normalizedSource.includes(parsed.vendor.toLowerCase().replace(/\s+/g, " "))) throw new Error("Vendor tidak ditemukan dalam dokumen sumber.");
      return res.json(parsed);
    } catch (error: any) {
      if (error instanceof AiServiceError) return aiFailure(res, error);
      console.warn('Invoice extraction failed: invalid-response');
      return res.status(422).json({ error: "Invoice belum dapat diekstrak dengan konsisten. Periksa dokumen atau isi formulir secara manual." });
    }
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const PORT = 3000;
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

if (process.argv[1] && ['server.ts', 'server.cjs'].includes(path.basename(process.argv[1]))) {
  startServer().catch(error => { console.error('Server startup failed:', error); process.exitCode = 1; });
}
