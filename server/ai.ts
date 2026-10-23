import { ThinkingLevel } from '@google/genai';
import type { GenerateContentParameters, GoogleGenAI } from '@google/genai';

export class AiServiceError extends Error {
  constructor(public code: string, message: string, public status = 503, public retryAfterSeconds?: number) {
    super(message);
    this.name = 'AiServiceError';
  }
}

export function aiServiceError(error: unknown): AiServiceError {
  if (error instanceof AiServiceError) return error;
  const upstream = error as { status?: number; code?: string; message?: string; name?: string; cause?: { code?: string; name?: string } } | null;
  const message = upstream?.message || '';
  if (/API_KEY_INVALID|API key not valid/i.test(message) || upstream?.status === 401) {
    return new AiServiceError('AI_KEY_INVALID', 'API key Gemini tidak valid. Perbarui GEMINI_API_KEY pada server.');
  }
  if (upstream?.status === 403) return new AiServiceError('AI_ACCESS_DENIED', 'Akses Gemini ditolak. Periksa izin API key dan project Google.');
  if (upstream?.status === 404) return new AiServiceError('AI_MODEL_UNAVAILABLE', 'Model Gemini tidak tersedia untuk akun ini. Periksa GEMINI_MODEL pada server.');
  if (upstream?.status === 429) return new AiServiceError('AI_RATE_LIMITED', 'Kuota atau batas permintaan Gemini tercapai. Periksa kuota sebelum mencoba kembali.', 429, 60);
  if (upstream?.status === 503) return new AiServiceError('AI_BUSY', 'Layanan Gemini sedang sibuk. Coba kembali beberapa saat lagi.', 503, 15);
  if ([408, 504].includes(upstream?.status ?? 0) ||
      ['AbortError', 'TimeoutError'].includes(upstream?.name || '') ||
      ['AbortError', 'TimeoutError'].includes(upstream?.cause?.name || '') ||
      /timed? ?out|DEADLINE_EXCEEDED|deadline expired/i.test(message)) {
    return new AiServiceError('AI_TIMEOUT', 'Gemini belum merespons dalam batas waktu. Coba kembali.', 504);
  }
  if (upstream?.cause?.code || /fetch failed|network/i.test(message)) return new AiServiceError('AI_CONNECTION_FAILED', 'Server belum dapat terhubung ke Gemini. Periksa koneksi internet server.');
  if (error instanceof SyntaxError) return new AiServiceError('AI_INVALID_RESPONSE', 'Respons Gemini belum dapat diproses. Silakan coba kembali.', 502);
  return new AiServiceError('AI_UNAVAILABLE', 'Analisis AI belum tersedia. Silakan coba kembali.');
}

type AiClient = Pick<GoogleGenAI, 'models'>;
type AiInput = Omit<GenerateContentParameters, 'model'>;

// Two bounded attempts fit within the frontend's 35-second wait. SDK retries
// are disabled so an overloaded model cannot keep retrying in the background.
export async function generateAiContent(ai: AiClient, input: AiInput, options: { model?: string; fallbackModel?: string; timeoutMs?: number } = {}) {
  const primary = options.model ?? (process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash');
  const fallback = options.fallbackModel ?? (process.env.GEMINI_FALLBACK_MODEL?.trim() || 'gemini-3.7-flash');
  const models = [...new Set([primary, ...(fallback !== 'none' ? [fallback] : [])])];
  const timeoutMs = options.timeoutMs ?? 15000;
  for (let index = 0; index < models.length; index++) {
    const model = models[index];
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new AiServiceError('AI_TIMEOUT', 'Gemini belum merespons dalam batas waktu. Coba kembali.', 504));
        controller.abort();
      }, timeoutMs);
    });
    try {
      return await Promise.race([
        ai.models.generateContent({ ...input, model, config: {
          ...input.config,
          maxOutputTokens: input.config?.maxOutputTokens ?? 4096,
          ...(model.startsWith('gemini-3') && !input.config?.thinkingConfig ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          abortSignal: controller.signal,
          httpOptions: { ...input.config?.httpOptions, timeout: timeoutMs, retryOptions: { attempts: 1 } },
        } }), timeout,
      ]);
    } catch (error) {
      const failure = aiServiceError(error);
      const canFallback = index + 1 < models.length && ['AI_BUSY', 'AI_TIMEOUT', 'AI_CONNECTION_FAILED'].includes(failure.code);
      if (!canFallback) throw failure;
      console.warn('AI model fallback:', { model, code: failure.code, nextModel: models[index + 1] });
    } finally { clearTimeout(timer!); }
  }
  throw new AiServiceError('AI_UNAVAILABLE', 'Analisis AI belum tersedia.');
}
