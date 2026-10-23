import test from 'node:test';
import assert from 'node:assert/strict';
import { AiServiceError, aiServiceError, generateAiContent } from '../server/ai';
import { ApiError, apiErrorMessage } from '../src/lib/apiError';

const input = { contents: 'Use supplied inventory only.', config: { responseMimeType: 'application/json' } };
const policy = { model: 'gemini-3.8-flash', fallbackModel: 'gemini-3.7-flash', timeoutMs: 100 };
const response = { text: '{"forecasts":[]}' };

test('AI success preserves input, uses a bounded wait and disables SDK retries', async () => {
  const requests: any[] = [];
  const ai = { models: { generateContent: async (request: any) => { requests.push(request); return response; } } } as any;
  assert.equal(await generateAiContent(ai, input, policy), response);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].contents, input.contents);
  assert.equal(requests[0].config.responseMimeType, 'application/json');
  assert.equal(requests[0].config.httpOptions.retryOptions.attempts, 1);
  assert.equal(requests[0].config.httpOptions.timeout, policy.timeoutMs);
});

test('a busy primary model uses the fallback once without inventing a response', async () => {
  const models: string[] = [];
  const ai = { models: { generateContent: async ({ model }: any) => {
    models.push(model);
    if (model === policy.model) throw Object.assign(new Error('High demand'), { status: 503 });
    return response;
  } } } as any;
  assert.equal(await generateAiContent(ai, input, policy), response);
  assert.deepEqual(models, [policy.model, policy.fallbackModel]);
});

test('two busy models return a specific failure after at most two attempts', async () => {
  let calls = 0;
  const ai = { models: { generateContent: async () => { calls++; throw { status: 503 }; } } } as any;
  await assert.rejects(generateAiContent(ai, input, policy), (error: AiServiceError) => error.code === 'AI_BUSY' && error.status === 503);
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(generateAiContent(ai, input, { ...policy, fallbackModel: 'none' }));
  assert.equal(calls, 1);
});

test('quota and invalid credentials fail without repeating requests on another model', async () => {
  for (const [failure, code] of [[{ status: 429 }, 'AI_RATE_LIMITED'], [{ status: 400, message: 'API_KEY_INVALID secret-key' }, 'AI_KEY_INVALID'], [{ status: 403 }, 'AI_ACCESS_DENIED']] as const) {
    let calls = 0;
    const ai = { models: { generateContent: async () => { calls++; throw failure; } } } as any;
    await assert.rejects(generateAiContent(ai, input, policy), (error: AiServiceError) => error.code === code && !error.message.includes('secret-key'));
    assert.equal(calls, 1);
  }
});

test('a timed out request signals cancellation and can switch to a responsive fallback', async () => {
  let signal: AbortSignal | undefined;
  const ai = { models: { generateContent: (request: any) => {
    if (request.model === policy.model) { signal = request.config.abortSignal; return new Promise(() => {}); }
    return Promise.resolve(response);
  } } } as any;
  assert.equal(await generateAiContent(ai, input, { ...policy, timeoutMs: 15 }), response);
  assert.equal(signal?.aborted, true);
});

test('stalled primary and fallback both terminate within the bounded attempt policy', async () => {
  let calls = 0;
  const ai = { models: { generateContent: () => { calls++; return new Promise(() => {}); } } } as any;
  await assert.rejects(generateAiContent(ai, input, { ...policy, timeoutMs: 15 }), (error: AiServiceError) => error.code === 'AI_TIMEOUT' && error.status === 504);
  assert.equal(calls, 2);
});

test('network and malformed response failures remain distinguishable in localized UI messages', () => {
  assert.equal(aiServiceError(Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNRESET' } })).code, 'AI_CONNECTION_FAILED');
  assert.equal(aiServiceError(new SyntaxError('Bad JSON')).code, 'AI_INVALID_RESPONSE');
  assert.match(apiErrorMessage(new ApiError('ignored', 'AI_BUSY', 503), 'en'), /Gemini is busy/);
  assert.match(apiErrorMessage(new ApiError('ignored', 'AI_TIMEOUT', 504), 'id'), /batas waktu/);
  assert.match(apiErrorMessage(new ApiError('ignored', 'AI_RATE_LIMITED', 429), 'id'), /Kuota/);
});

test('SDK deadline errors and wrapped aborts trigger the fallback instead of a generic failure', async () => {
  const failures = [
    Object.assign(new Error('{"error":{"code":504,"message":"Deadline expired before operation could complete.","status":"DEADLINE_EXCEEDED"}}'), { status: 504 }),
    { status: 408 },
    new Error('exception AbortError sending request', { cause: Object.assign(new Error('This operation was aborted'), { name: 'AbortError' }) }),
  ];
  for (const error of failures) {
    assert.equal(aiServiceError(error).code, 'AI_TIMEOUT');
    let calls = 0;
    const ai = { models: { generateContent: async () => {
      if (++calls === 1) throw error;
      return response;
    } } } as any;
    assert.equal(await generateAiContent(ai, input, policy), response);
    assert.equal(calls, 2);
  }
});
