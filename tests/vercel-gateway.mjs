import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import fs from 'node:fs';
import { createGateway } from '../api/gateway.mjs';
import { handleAPI, MemoryStore } from '../server/api.mjs';
const FRONTEND = 'https://game.vercel.app', BACKEND = 'https://cipher.test';
async function invoke(handler, path, body, options = {}) {
  const request = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
  request.url = '/api/gateway?path=' + encodeURIComponent(path); request.query = { path };
  request.method = options.method || (path === 'health' ? 'GET' : 'POST');
  request.headers = { host: 'game.vercel.app', origin: FRONTEND, 'content-type': 'application/json', ...options.headers };
  if (options.parsed) request.body = body;
  const response = { statusCode: 0, headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(value) { this.body = JSON.parse(value); } };
  await handler(request, response); return response;
}
test('Vercel routes health and every room operation to the gateway, before page fallback', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url)));
  assert.ok(config.rewrites.some(r => r.source === '/api/health' && r.destination.includes('path=health')));
  assert.ok(config.rewrites.some(r => r.source === '/api/rooms/:path*' && r.destination.includes('path=rooms/:path*')));
  assert.equal(config.outputDirectory, '.'); assert.ok(config.functions['api/gateway.mjs']);
  assert.ok(!fs.readFileSync(new URL('../.vercelignore', import.meta.url), 'utf8').split(/\r?\n/).includes('api'));
});
test('gateway bridges origin and preserves session auth, status and private JSON without forwarding cookies', async () => {
  const calls = [], store = new MemoryStore();
  const gateway = createGateway({ server: BACKEND, fetcher: async (url, options) => { calls.push({ url, options }); return handleAPI(new Request(url, options), store); } });
  const health = await invoke(gateway, 'health'); assert.equal(health.statusCode, 200); assert.equal(health.body.maxPlayers, 4);
  const created = await invoke(gateway, 'rooms/create', { name: 'A' }, { parsed: true, headers: { cookie: 'private-cookie', referer: FRONTEND } });
  assert.equal(created.statusCode, 201); const { secret, room } = created.body;
  const poll = await invoke(gateway, `rooms/${room.code}/command`, { action: 'poll' }, { headers: { authorization: 'Bearer ' + secret } });
  assert.equal(poll.statusCode, 200); assert.equal(poll.body.room.you, room.you);
  assert.equal(calls.at(-1).options.headers.Authorization, 'Bearer ' + secret);
  assert.equal(calls.at(-1).options.headers.Origin, BACKEND);
  assert.equal(calls[1].options.headers.cookie, undefined); assert.equal(calls[1].options.headers.referer, undefined);
  assert.equal(poll.headers['Cache-Control'], 'no-store');
  const wrong = await invoke(gateway, 'rooms/ZZZZZZ/join', { name: 'B' }); assert.equal(wrong.statusCode, 404); assert.match(wrong.body.error, /Room/);
});
test('gateway rejects foreign origin, invalid routes and methods before contacting the room server', async () => {
  let calls = 0; const gateway = createGateway({ fetcher: async () => { calls++; throw new Error(); } });
  assert.equal((await invoke(gateway, 'rooms/create', { name: 'A' }, { headers: { origin: 'https://evil.test' } })).statusCode, 403);
  assert.equal((await invoke(gateway, '//evil.test')).statusCode, 404);
  assert.equal((await invoke(gateway, 'rooms/create', {}, { method: 'GET' })).statusCode, 405);
  assert.equal((await invoke(gateway, 'rooms/create', {}, { headers: { 'content-type': 'text/plain' } })).statusCode, 415);
  assert.equal((await invoke(gateway, 'rooms/create', {}, { headers: { authorization: 'Bearer malformed' } })).statusCode, 401);
  assert.equal(calls, 0);
});
test('gateway checks streamed and pre-parsed request size and JSON shape', async () => {
  let calls = 0; const gateway = createGateway({ fetcher: async () => { calls++; throw new Error(); } });
  for (const parsed of [false, true]) {
    assert.equal((await invoke(gateway, 'rooms/create', { text: 'x'.repeat(5000) }, { parsed })).statusCode, 413);
    assert.equal((await invoke(gateway, 'rooms/create', [], { parsed })).statusCode, 400);
  }
  assert.equal(calls, 0);
});
test('gateway returns actionable JSON for HTML upstream errors, timeout and network failure', async () => {
  const html = createGateway({ fetcher: async () => new Response('<html>404</html>', { status: 404, headers: { 'content-type': 'text/html' } }) });
  assert.equal((await invoke(html, 'health')).statusCode, 502);
  const timeout = createGateway({ fetcher: async () => { throw new DOMException('timeout', 'TimeoutError'); } });
  assert.equal((await invoke(timeout, 'health')).statusCode, 504);
  const failed = createGateway({ fetcher: async () => { throw new Error('internal URL and implementation details'); } });
  const response = await invoke(failed, 'health'); assert.equal(response.statusCode, 502); assert.ok(!response.body.error.includes('implementation'));
});
