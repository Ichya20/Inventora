import { ApiError } from './apiError';

export async function authenticatedPost<T>(url: string, payload: unknown, options: { signal?: AbortSignal } = {}): Promise<T> {
  if (sessionStorage.getItem('inventora_demo_user')) throw new Error('Fitur server memerlukan akun Firebase. Mode demo hanya menyimpan simulasi lokal.');
  const { auth } = await import('../firebase');
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error('Silakan masuk untuk menggunakan fitur ini.');
  const token = await user.getIdToken();
  if (auth.currentUser?.uid !== user.uid) throw new Error('Sesi pengguna telah berubah. Silakan masuk kembali.');
  const timeout = AbortSignal.timeout(url.startsWith('/api/ai/') || ['/api/copilot', '/api/analyst'].includes(url) ? 35000 : 20000);
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload), signal: options.signal ? AbortSignal.any([timeout, options.signal]) : timeout,
  });
  const data = await response.json();
  if (auth.currentUser?.uid !== user.uid || sessionStorage.getItem('inventora_demo_user')) throw new Error('Sesi pengguna telah berubah.');
  if (!response.ok) throw new ApiError(data.error || 'Permintaan gagal. Silakan coba kembali.', data.code, response.status);
  return data as T;
}
