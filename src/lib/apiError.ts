export class ApiError extends Error {
  constructor(message: string, public code?: string, public status?: number) { super(message); this.name = 'ApiError'; }
}

export function apiErrorMessage(error: unknown, lang: 'en' | 'id' = 'id'): string {
  const messages: Record<string, [string, string]> = {
    AI_BUSY: ['Gemini is busy. Please try again shortly.', 'Gemini sedang sibuk. Coba kembali beberapa saat lagi.'],
    AI_TIMEOUT: ['Gemini took too long to respond. Please try again.', 'Gemini belum merespons dalam batas waktu. Coba kembali.'],
    AI_RATE_LIMITED: ['Gemini quota or request limit reached. Check API usage before retrying.', 'Kuota atau batas permintaan Gemini tercapai. Periksa penggunaan API sebelum mencoba kembali.'],
    AI_NOT_CONFIGURED: ['GEMINI_API_KEY is missing on the server.', 'GEMINI_API_KEY belum diisi pada server.'],
    AI_KEY_INVALID: ['The Gemini API key is invalid. Update GEMINI_API_KEY on the server.', 'API key Gemini tidak valid. Perbarui GEMINI_API_KEY pada server.'],
    AI_ACCESS_DENIED: ['Gemini access was denied. Check API key permissions.', 'Akses Gemini ditolak. Periksa izin API key.'],
    AI_MODEL_UNAVAILABLE: ['The Gemini model is unavailable for this account. Check GEMINI_MODEL.', 'Model Gemini tidak tersedia untuk akun ini. Periksa GEMINI_MODEL.'],
    AI_CONNECTION_FAILED: ['The server could not connect to Gemini. Check the server internet connection.', 'Server belum dapat terhubung ke Gemini. Periksa koneksi internet server.'],
    AI_INVALID_RESPONSE: ['Gemini returned an unreadable response. Please try again.', 'Respons Gemini belum dapat diproses. Coba kembali.'],
  };
  if (error instanceof ApiError && error.code && messages[error.code]) return messages[error.code][lang === 'en' ? 0 : 1];
  return error instanceof Error ? error.message : lang === 'en' ? 'Request failed. Please try again.' : 'Permintaan gagal. Silakan coba kembali.';
}
