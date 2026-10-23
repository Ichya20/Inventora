import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../server';
import type { Role } from '../src/types';
import { validatePurchaseOrderCreate } from '../src/lib/purchaseOrderValidation';

let server: Server;
let base: string;
let aiCalls = 0;
let aiFailure = false;
let aiError: unknown;
let aiText = 'Recorded active PO count: 0';
let failNextAi = false;
let savedActor: unknown;
let creationActor: unknown;
const createdIds = new Set<string>();
const previousKey = process.env.GEMINI_API_KEY;
before(async () => {
  const app = createApp({
    verifyToken: async token => {
      const roles: Record<string, Role | null> = { finance: 'Finance Manager', warehouse: 'Warehouse Manager', hr: 'HR Manager', unassigned: null };
      if (!(token in roles)) throw new Error('Invalid signature or expired token');
      return { uid: 'api-test-' + token, role: roles[token] };
    },
    getAi: () => ({ models: { generateContent: async () => {
      aiCalls++;
      if (aiFailure) throw new Error('upstream unavailable');
      if (failNextAi) { failNextAi = false; throw { status: 503 }; }
      if (aiError) throw aiError;
      return { text: aiText };
    } } }) as any,
    saveReceipt: async (_id, _receipt, actor) => { savedActor = actor; return { status: 'Barang Diterima', threeWayMatchStatus: 'MATCHED' }; },
    createPurchaseOrder: async (input, actor) => {
      creationActor = actor;
      let po;
      try { po = validatePurchaseOrderCreate(input); }
      catch (error) { throw Object.assign(error, { status: 422 }); }
      if (createdIds.has(po.id)) throw Object.assign(new Error('Duplicate PO'), { status: 409 });
      createdIds.add(po.id);
      return po;
    },
  });
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + (server.address() as { port: number }).port;
});
after(async () => {
  if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey;
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});
async function post(route: string, body: unknown, token?: string) {
  const response = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json(), retryAfter: response.headers.get('Retry-After') };
}

test('all AI endpoints reject anonymous and invalid tokens before invoking the paid service', async () => {
  process.env.GEMINI_API_KEY = 'mock-key';
  for (const route of ['/api/analyst', '/api/copilot', '/api/ai/po-risk', '/api/ai/forecast-restock', '/api/ai/parse-invoice']) {
    assert.equal((await post(route, { role: 'Super Admin' })).status, 401);
    assert.equal((await post(route, {}, 'forged')).status, 401);
  }
  assert.equal(aiCalls, 0);
});

test('API permissions use verified role claims instead of client-supplied roles', async () => {
  assert.equal((await post('/api/analyst', { prompt: 'Revenue', role: 'Super Admin' }, 'hr')).status, 403);
  assert.equal((await post('/api/ai/parse-invoice', { text: 'Quote' }, 'finance')).status, 403);
  assert.equal((await post('/api/ai/forecast-restock', { inventory: [] }, 'finance')).status, 403);
  assert.equal((await post('/api/copilot', { message: 'Hello' }, 'unassigned')).status, 403);
  assert.equal(aiCalls, 0);
});

test('unconfigured or failed AI returns an explicit failure without fabricated business numbers', async () => {
  delete process.env.GEMINI_API_KEY;
  for (const [route, body, token] of [
    ['/api/copilot', { message: 'PO summary', context: { activePosCount: 0 } }, 'finance'],
    ['/api/analyst', { prompt: 'Revenue' }, 'finance'],
    ['/api/ai/po-risk', { po: { total: 1000 } }, 'warehouse'],
    ['/api/ai/forecast-restock', { inventory: [] }, 'warehouse'],
  ] as const) {
    const result = await post(route, body, token);
    assert.equal(result.status, 503);
    assert.equal(result.data.code, 'AI_NOT_CONFIGURED');
    assert.doesNotMatch(JSON.stringify(result.data), /45 POs|12\.800|1,104|45 PO/);
    assert.equal(result.data.reply, undefined);
    assert.equal(result.data.result, undefined);
  }
  process.env.GEMINI_API_KEY = 'mock-key';
  aiFailure = true;
  assert.equal((await post('/api/copilot', { message: 'PO summary' }, 'finance')).status, 503);
  aiFailure = false;
  const result = await post('/api/copilot', { message: 'PO summary', context: { activePosCount: 0 } }, 'finance');
  assert.equal(result.status, 200);
  assert.equal(result.data.reply, 'Recorded active PO count: 0');
});

test('AI API reports busy and quota errors without exposing provider errors or fake forecasts', async () => {
  process.env.GEMINI_API_KEY = 'mock-key';
  try {
    aiError = { status: 503, message: 'private-provider-detail' };
    const busy = await post('/api/ai/forecast-restock', { inventory: [] }, 'warehouse');
    assert.equal(busy.status, 503);
    assert.equal(busy.data.code, 'AI_BUSY');
    assert.equal(busy.retryAfter, '15');
    assert.equal(busy.data.forecasts, undefined);
    assert.doesNotMatch(JSON.stringify(busy.data), /private-provider-detail/);
    aiError = { status: 429 };
    const quota = await post('/api/ai/forecast-restock', { inventory: [] }, 'warehouse');
    assert.equal(quota.status, 429);
    assert.equal(quota.data.code, 'AI_RATE_LIMITED');
    aiError = { status: 400, message: 'API_KEY_INVALID secret-key' };
    const invalid = await post('/api/copilot', { message: 'Hello' }, 'finance');
    assert.equal(invalid.data.code, 'AI_KEY_INVALID');
    assert.doesNotMatch(JSON.stringify(invalid.data), /secret-key/);
  } finally { aiError = undefined; }
});

test('restock endpoint returns the real fallback response when the primary model is busy', async () => {
  const before = aiCalls;
  const forecast = { insights: 'Review current stock.', forecasts: [{ skuId: 'SKU-1', name: 'Server', daysUntilStockout: 10, recommendedOrderQty: 5, urgency: 'HIGH', rationale: 'Example fixture.' }] };
  aiText = JSON.stringify(forecast);
  failNextAi = true;
  try {
    const result = await post('/api/ai/forecast-restock', { inventory: [{ id: 'SKU-1', stock: 5 }] }, 'warehouse');
    assert.equal(result.status, 200);
    assert.deepEqual(result.data, forecast);
    assert.equal(aiCalls - before, 2);
  } finally { aiText = 'Recorded active PO count: 0'; failNextAi = false; }
});

test('receipt endpoint requires warehouse permission and binds verification to the signed-in account', async () => {
  const route = '/api/purchase-orders/PO-1/receipt';
  assert.equal((await post(route, { grn: {} })).status, 401);
  assert.equal((await post(route, { grn: {}, role: 'Warehouse Manager' }, 'finance')).status, 403);
  assert.equal((await post(route, {}, 'warehouse')).status, 400);
  assert.equal((await post(route, { grn: {}, uid: 'another-user', role: 'Super Admin' }, 'warehouse')).status, 200);
  assert.deepEqual(savedActor, { uid: 'api-test-warehouse', role: 'Warehouse Manager' });
});

test('PO creation requires warehouse access and reports validation or duplicate failures', async () => {
  const po = { id: 'PO-API-1', vendor: 'Vendor', desc: 'Server', date: '2026-10-22', deliveryDate: '2026-10-27', subtotal: 1000, total: 1110, taxAmount: 110, status: 'Pending Approval', items: [{ name: 'Server', qty: 2, unitPrice: 500, subtotal: 1000 }] };
  assert.equal((await post('/api/purchase-orders', po)).status, 401);
  assert.equal((await post('/api/purchase-orders', { ...po, role: 'Warehouse Manager' }, 'finance')).status, 403);
  assert.equal((await post('/api/purchase-orders', { ...po, items: 'broken' }, 'warehouse')).status, 422);
  const created = await post('/api/purchase-orders', { ...po, uid: 'another-user', role: 'Super Admin' }, 'warehouse');
  assert.equal(created.status, 201);
  assert.equal(created.data.items[0].qty, 2);
  assert.equal(created.data.status, 'Pending Approval');
  assert.deepEqual(creationActor, { uid: 'api-test-warehouse', role: 'Warehouse Manager' });
  assert.equal((await post('/api/purchase-orders', po, 'warehouse')).status, 409);
});
