// Real HTTP integration test, using four independent bearer sessions.
// Run only against a server owned for QA; creates and then leaves one QA room.
import assert from 'node:assert/strict';
const origin = new URL(process.argv[2] || 'http://127.0.0.1:4175').origin;
const clients = []; let code, latest;
async function call(path, body, secret) {
  const response = await fetch(origin + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...(secret ? { Authorization: 'Bearer ' + secret } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const data = await response.json(); assert.ok(response.ok, `${response.status}: ${data.error}`); return data;
}
const command = (secret, action, extra = {}) => call(`/api/rooms/${code}/command`, { action, requestId: crypto.randomUUID(), ...extra }, secret);
function solve(c) {
  const values = () => [...c.plain].map(char => (char.charCodeAt(0) - 64) * c.fn.a + c.fn.b);
  if (c.kind === 'encode') return values();
  if (c.kind === 'decode') return c.cipher.map(n => String.fromCharCode(64 + (n - c.fn.b) / c.fn.a)).join('');
  if (c.kind === 'sequence') return c.options.findIndex(a => JSON.stringify(a) === JSON.stringify(values()));
  if (c.kind === 'composition') return c.options.findIndex(f => f.a === c.f.a * c.g.a && f.b === c.f.a * c.g.b + c.f.b);
  if (c.kind === 'calibrate') { const [p, q] = c.samples, a = (q.y - p.y) / (q.x - p.x); return { a, b: p.y - a * p.x }; }
  const expected = values(), row = expected.findIndex((v, i) => v !== c.values[i]); return { row, value: expected[row] };
}
try {
  const health = await fetch(origin + '/api/health', { signal: AbortSignal.timeout(15000) }); assert.equal((await health.json()).maxPlayers, 4);
  const created = await call('/api/rooms/create', { name: 'QA-ECHO' }); code = created.room.code; clients.push(created.secret);
  for (const name of ['QA-NOVA', 'QA-VEGA', 'QA-LUNA']) clients.push((await call(`/api/rooms/${code}/join`, { name })).secret);
  await Promise.all(clients.map(secret => command(secret, 'ready', { ready: true })));
  latest = await command(clients[0], 'start');
  for (let mission = 0; mission < 6; mission++) {
    const stages = latest.room.stages;
    for (let stage = 0; stage < stages; stage++) {
      const states = await Promise.all(clients.map(secret => command(secret, 'poll')));
      const stageId = states[0].room.stageId;
      assert.equal(new Set(states.map(r => r.room.players.find(p => p.id === r.room.you).role)).size, 4);
      assert.equal(new Set(states.map(r => r.room.challenge.kind)).size, 4);
      await Promise.all(clients.map((secret, i) => command(secret, 'answer', { stageId, answer: solve(states[i].room.challenge) })));
      latest = await command(clients[0], 'poll');
    }
    assert.equal(latest.room.records.length, mission + 1);
    if (mission < 5) latest = await command(clients[0], 'next');
  }
  assert.equal(latest.room.total, 900); assert.equal(latest.room.phase, 'finished'); assert.equal(latest.room.players.length, 4);
  console.log('PASS: four HTTP sessions completed all 6 missions / all generated stages, 900 team points; backend=' + origin);
} finally {
  if (code) for (const secret of clients) try { await command(secret, 'leave'); } catch (_) {}
}
