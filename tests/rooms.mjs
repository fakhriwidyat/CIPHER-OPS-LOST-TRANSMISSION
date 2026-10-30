import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createRoom, joinRoom, command, snapshot, authenticate, challengeFor, ONLINE_TIMEOUT, ROOM_LIFETIME } from '../server/rooms.mjs';
import { handleAPI, MemoryStore, D1Store } from '../server/api.mjs';
import { OPERATORS } from '../server/assignments.mjs';
const id = () => crypto.randomUUID();
function team(count = 4) {
  const { room, player } = createRoom('ABC234', 'ECHO', 100000);
  for (let i = 1; i < count; i++) joinRoom(room, 'OP' + i, 100000);
  room.challengeVersion = 2; // Regression coverage for existing rooms.
  let now = 100000;
  const cmd = (p, action, extra = {}) => command(room, p, { action, stageId: room.stageId, requestId: id(), ...extra }, now);
  const start = () => { for (const p of room.players) cmd(p, 'ready', { ready: true }); cmd(player, 'start'); };
  return { room, player, cmd, start, tick: ms => now += ms, now: () => now };
}
function solution(c) {
  const encrypt = () => [...c.plain].map(char => (char.charCodeAt(0) - 64) * c.fn.a + c.fn.b);
  if (c.kind === 'encode') return encrypt();
  if (c.kind === 'decode') return c.cipher.map(n => String.fromCharCode(64 + (n - c.fn.b) / c.fn.a)).join('');
  if (c.kind === 'sequence') return c.options.findIndex(v => JSON.stringify(v) === JSON.stringify(encrypt()));
  if (c.kind === 'composition') return c.options.findIndex(v => v.a === c.f.a * c.g.a && v.b === c.f.a * c.g.b + c.f.b);
  if (c.kind === 'calibrate') { const [p, q] = c.samples, a = (q.y - p.y) / (q.x - p.x); return { a, b: p.y - a * p.x }; }
  const values = encrypt(), row = values.findIndex((v, i) => v !== c.values[i]); return { row, value: values[row] };
}
test('room capacity, distinct seats and callsign validation', () => {
  const t = team(); assert.equal(t.room.players.length, 4); assert.equal(new Set(t.room.players.map(p => p.slot)).size, 4);
  assert.throws(() => joinRoom(t.room, 'FIFTH', t.now()), /penuh/);
  assert.throws(() => createRoom('AAAAAA', '<script>'), /Callsign/);
  const two = team(2); assert.throws(() => joinRoom(two.room, 'echo', two.now()), /sudah dipakai/);
});
test('only host starts; minimum two connected, ready players', () => {
  const t = team(2); assert.throws(() => t.cmd(t.player, 'start'), /semuanya siap/);
  assert.throws(() => t.cmd(t.room.players[1], 'start'), /Hanya host/);
  t.start(); assert.equal(t.room.phase, 'playing'); assert.throws(() => joinRoom(t.room, 'THIRD', t.now()), /sudah berjalan/);
  const one = team(1); one.cmd(one.player, 'ready', { ready: true }); assert.throws(() => one.cmd(one.player, 'start'), /2–4/);
});
test('all four players must solve all eight stages across six missions', () => {
  const t = team(); t.start(); let stages = 0;
  for (let m = 0; m < 6; m++) {
    const count = m === 2 || m === 5 ? 2 : 1;
    for (let s = 0; s < count; s++) {
      stages++; const stageId = t.room.stageId;
      for (const p of t.room.players) {
        t.cmd(p, 'answer', { answer: solution(challengeFor(t.room, p)) });
        if (p !== t.room.players.at(-1)) { assert.equal(t.room.phase, 'playing'); assert.equal(t.room.stageId, stageId); }
      }
      if (s + 1 < count) { assert.equal(t.room.stage, s + 1); assert.notEqual(t.room.stageId, stageId); }
    }
    assert.equal(t.room.phase, m === 5 ? 'finished' : 'result');
    if (m !== 5) t.cmd(t.player, 'next');
  }
  assert.equal(stages, 8); assert.equal(t.room.total, 900); assert.equal(t.room.records.length, 6);
});
test('malformed answers preserve hearts; duplicate requests cannot double-charge', () => {
  const t = team(2); t.start();
  assert.throws(() => t.cmd(t.player, 'answer', { answer: ['19', '21'] }), /format/); assert.equal(t.room.health, 3);
  const request = { action: 'answer', stageId: t.room.stageId, requestId: id(), answer: [0, 0] };
  command(t.room, t.player, request, t.now()); command(t.room, t.player, request, t.now()); assert.equal(t.room.health, 2); assert.equal(t.room.errors, 1);
  assert.throws(() => t.cmd(t.player, 'answer', { answer: [0, 0] }), /Tunggu sebentar/); assert.equal(t.room.health, 2);
});
test('hint is private, charged once and affects team score', () => {
  const t = team(2); t.start();
  assert.equal(snapshot(t.room, t.player, t.now()).challenge.hint, undefined);
  t.cmd(t.player, 'hint'); t.cmd(t.player, 'hint'); assert.equal(t.room.hints, 1); assert.equal(t.room.health, 3);
  assert.ok(snapshot(t.room, t.player, t.now()).challenge.hint); assert.equal(snapshot(t.room, t.room.players[1], t.now()).challenge.hint, undefined);
  for (const p of t.room.players) t.cmd(p, 'answer', { answer: solution(challengeFor(t.room, p)) });
  assert.equal(t.room.total, 125);
});
test('failure and host retry reset only current mission', () => {
  const t = team(2); t.start(); for (const p of t.room.players) t.cmd(p, 'answer', { answer: solution(challengeFor(t.room, p)) }); t.cmd(t.player, 'next');
  const c = challengeFor(t.room, t.player), wrong = (solution(c) + 1) % 4;
  for (let i = 0; i < 3; i++) { t.tick(1000); t.cmd(t.player, 'answer', { answer: wrong }); }
  assert.equal(t.room.phase, 'failed'); assert.equal(t.room.total, 150);
  assert.throws(() => t.cmd(t.room.players[1], 'retry'), /Hanya host/); t.cmd(t.player, 'retry'); assert.equal(t.room.health, 3); assert.equal(t.room.total, 150); assert.equal(t.room.errors, 0);
});
test('stale stage and already solved submissions do not consume hearts', () => {
  const t = team(2); t.start(); const old = t.room.stageId;
  t.cmd(t.player, 'answer', { answer: solution(challengeFor(t.room, t.player)) }); assert.throws(() => t.cmd(t.player, 'answer', { answer: [1, 1] }), /sudah benar/);
  t.cmd(t.room.players[1], 'answer', { answer: solution(challengeFor(t.room, t.room.players[1])) }); t.cmd(t.player, 'next');
  assert.throws(() => t.cmd(t.player, 'answer', { stageId: old, answer: 0 }), /Tahap sudah berubah/); assert.equal(t.room.health, 3);
});
test('disconnect pauses, host migrates, reconnect uses the same secret', () => {
  const t = team(3); t.start(); const original = t.player, second = t.room.players[1];
  t.tick(ONLINE_TIMEOUT + 1); t.cmd(second, 'poll'); assert.equal(t.room.hostId, second.id);
  assert.equal(snapshot(t.room, second, t.now()).paused, true); assert.throws(() => t.cmd(second, 'answer', { answer: solution(challengeFor(t.room, second)) }), /dijeda/);
  t.cmd(authenticate(t.room, original.secret), 'poll'); t.cmd(t.room.players[2], 'poll');
  assert.equal(snapshot(t.room, original, t.now()).paused, false); assert.equal(t.room.hostId, second.id);
});
test('host can drop only disconnected players and cannot progress alone', () => {
  const t = team(2); t.start(); const other = t.room.players[1];
  assert.throws(() => t.cmd(t.player, 'remove', { playerId: other.id }), /terputus/);
  t.tick(ONLINE_TIMEOUT + 1); t.cmd(t.player, 'poll'); t.cmd(t.player, 'remove', { playerId: other.id });
  assert.equal(t.room.players.length, 1); assert.equal(snapshot(t.room, t.player, t.now()).paused, true);
  t.cmd(t.player, 'lobby'); assert.equal(t.room.phase, 'lobby'); joinRoom(t.room, 'NEW', t.now()); assert.equal(t.room.players.length, 2);
});
test('snapshots never expose bearer secrets, receipts or other private packets', () => {
  const t = team(); t.start(); const publicJSON = JSON.stringify(snapshot(t.room, t.player, t.now()));
  for (const p of t.room.players) assert.ok(!publicJSON.includes(p.secret));
  assert.ok(!publicJSON.includes('receipts')); assert.ok(snapshot(t.room, t.player, t.now()).players.every(p => !p.secret && !p.challenge));
  assert.throws(() => authenticate(t.room, 'guessed'), /Sesi/);
});
test('expired rooms cannot be joined', () => { const t = team(2); t.tick(ROOM_LIFETIME + 1); assert.throws(() => joinRoom(t.room, 'LATE', t.now()), /kedaluwarsa/); });
test('four unique operators, lobby selection, occupied-role rejection, readiness reset', () => {
  const t = team(2); assert.deepEqual(t.room.players.map(p => p.role), ['kai', 'nyx']);
  t.cmd(t.player, 'ready', { ready: true }); t.cmd(t.player, 'role', { role: 'bolt' }); assert.equal(t.player.role, 'bolt'); assert.equal(t.player.ready, false);
  assert.throws(() => t.cmd(t.room.players[1], 'role', { role: 'bolt' }), /sudah dipakai/);
  const third = joinRoom(t.room, 'THIRD', t.now()); assert.equal(third.role, 'kai');
  joinRoom(t.room, 'FOURTH', t.now()); assert.equal(new Set(t.room.players.map(p => p.role)).size, 4);
  t.start(); assert.throws(() => t.cmd(t.player, 'role', { role: 'iris' }), /hanya bisa diganti/);
});
test('every stage has four distinct task types toward one shared goal', () => {
  const t = team();
  for (let m = 0; m < 6; m++) for (let s = 0; s < (m === 2 || m === 5 ? 2 : 1); s++) {
    t.room.mission = m; t.room.stage = s;
    const tasks = t.room.players.map(p => challengeFor(t.room, p));
    assert.equal(new Set(tasks.map(c => c.kind)).size, 4, `mission ${m} stage ${s}`);
    assert.equal(new Set(tasks.map(c => c.task)).size, 4);
    const views = t.room.players.map(p => snapshot(t.room, p, t.now()));
    assert.equal(new Set(views.map(v => v.teamGoal)).size, 1); assert.equal(views[0].operators.length, 4);
  }
});
test('assignments survive reconnect and retry, vary by room and fresh lobby', () => {
  const t = team(); t.start(); const before = JSON.stringify(t.room.players.map(p => challengeFor(t.room, p)));
  t.cmd(t.player, 'poll'); assert.equal(JSON.stringify(t.room.players.map(p => challengeFor(t.room, p))), before);
  t.room.phase = 'failed'; t.cmd(t.player, 'retry'); assert.equal(JSON.stringify(t.room.players.map(p => challengeFor(t.room, p))), before);
  const variants = new Set();
  for (let i = 0; i < 12; i++) { const next = team(); variants.add(JSON.stringify(challengeFor(next.room, next.player))); }
  assert.ok(variants.size >= 4);
  t.cmd(t.player, 'lobby'); t.start(); assert.notEqual(JSON.stringify(t.room.players.map(p => challengeFor(t.room, p))), before);
});
test('all generated samples have unique valid choices and calibration does not expose its function', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const t = team(); t.room.seed = seed;
    for (let m = 0; m < 6; m++) for (let s = 0; s < (m === 2 || m === 5 ? 2 : 1); s++) {
      t.room.mission = m; t.room.stage = s;
      for (const p of t.room.players) {
        const c = challengeFor(t.room, p), answer = solution(c);
        if (c.options) { assert.equal(new Set(c.options.map(o => JSON.stringify(o))).size, 4); assert.ok(Number.isInteger(answer) && answer >= 0 && answer <= 3); }
        if (c.kind === 'calibrate') { assert.equal(c.fn, null); assert.ok(c.samples.every(point => point.y === answer.a * point.x + answer.b)); }
        if (c.kind === 'composition') assert.equal(c.fn, null);
      }
    }
  }
});
test('legacy active rooms keep their original questions and upgrade only in a new lobby', () => {
  const t = team(2); delete t.room.challengeVersion; delete t.room.seed; for (const p of t.room.players) delete p.role;
  t.room.phase = 'playing'; assert.deepEqual(solution(challengeFor(t.room, t.player)), [19, 21]);
  t.cmd(t.player, 'answer', { answer: [19, 21] }); assert.equal(t.player.solved, true);
  t.cmd(t.player, 'lobby'); assert.equal(t.room.challengeVersion, 3); assert.equal(new Set(snapshot(t.room, t.player, t.now()).players.map(p => p.role)).size, 2);
});
async function api(store, path, body, secret, origin = 'https://game.test') {
  const response = await handleAPI(new Request('https://game.test' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...(secret ? { Authorization: 'Bearer ' + secret } : {}) }, body: JSON.stringify(body) }), store);
  return { status: response.status, data: await response.json() };
}
function sqliteStore() {
  const db = new DatabaseSync(':memory:'); db.exec('CREATE TABLE rooms (code TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0, state TEXT NOT NULL, updated INTEGER NOT NULL)');
  return new D1Store({ prepare(sql) { return { bind(...args) { const stmt = db.prepare(sql); return { first: async () => stmt.get(...args), run: async () => ({ meta: { changes: Number(stmt.run(...args).changes) } }) }; } }; } });
}
for (const [name, makeStore] of [['memory', () => new MemoryStore()], ['SQLite / D1 adapter', sqliteStore]]) {
  test(`simultaneous claims cannot assign one character to two players (${name})`, async () => {
    const store = makeStore(), made = await api(store, '/api/rooms/create', { name: 'A' });
    const code = made.data.room.code, second = await api(store, `/api/rooms/${code}/join`, { name: 'B' });
    const claims = await Promise.all([made.data.secret, second.data.secret].map(secret => api(store, `/api/rooms/${code}/command`, { action: 'role', role: 'iris', requestId: id() }, secret)));
    assert.deepEqual(claims.map(r => r.status).sort(), [200, 409]);
    const state = await api(store, `/api/rooms/${code}/command`, { action: 'poll' }, made.data.secret);
    assert.equal(new Set(state.data.room.players.map(p => p.role)).size, 2);
  });
  test(`HTTP room lifecycle and concurrent four-player submissions (${name})`, async () => {
    const store = makeStore(), created = await api(store, '/api/rooms/create', { name: 'A' }); assert.equal(created.status, 201);
    const code = created.data.room.code, secrets = [created.data.secret];
    const joined = await Promise.all(['B', 'C', 'D'].map(name => api(store, `/api/rooms/${code}/join`, { name })));
    assert.ok(joined.every(r => r.status === 200)); secrets.push(...joined.map(r => r.data.secret));
    const fifth = await api(store, `/api/rooms/${code}/join`, { name: 'E' }); assert.equal(fifth.status, 409);
    const commandPath = `/api/rooms/${code}/command`;
    await Promise.all(secrets.map(secret => api(store, commandPath, { action: 'ready', ready: true, requestId: id() }, secret)));
    const started = await api(store, commandPath, { action: 'start', requestId: id() }, secrets[0]); assert.equal(started.data.room.phase, 'playing');
    const stageId = started.data.room.stageId;
    const responses = await Promise.all(secrets.map(async secret => { const state = await api(store, commandPath, { action: 'poll' }, secret); return api(store, commandPath, { action: 'answer', stageId, answer: solution(state.data.room.challenge), requestId: id() }, secret); }));
    assert.ok(responses.every(r => r.status === 200));
    const final = await api(store, commandPath, { action: 'poll' }, secrets[0]); assert.equal(final.data.room.total, 0); assert.equal(final.data.room.phase, 'playing'); assert.equal(final.data.room.stage, 1);
    assert.equal(final.data.room.players.filter(p => p.solved).length, 0);
  });
}
test('HTTP auth, cross-origin, invalid route and JSON size are rejected', async () => {
  const store = new MemoryStore(), made = await api(store, '/api/rooms/create', { name: 'A' }); const code = made.data.room.code;
  assert.equal((await api(store, `/api/rooms/${code}/command`, { action: 'poll' }, 'bad')).status, 401);
  assert.equal((await api(store, '/api/rooms/create', { name: 'A' }, null, 'https://evil.test')).status, 403);
  assert.equal((await api(store, '/api/rooms/INVALID/join', { name: 'A' })).status, 404);
  assert.equal((await api(store, '/api/rooms/create', { name: 'A'.repeat(5000) })).status, 413);
});

test('new campaigns complete 30 varied stages, with stable refresh and fresh replay', () => {
 const t=team(); t.room.challengeVersion=3; t.start(); let count=0;
 for(let m=0;m<6;m++){
  const stages=snapshot(t.room,t.player,t.now()).stages;
  const previous=new Map();
  for(let s=0;s<stages;s++){
   const cs=t.room.players.map(p=>challengeFor(t.room,p));
   assert.equal(new Set(cs.map(c=>c.kind)).size,4);
   for(const [i,c] of cs.entries()){
    assert.deepEqual(c,challengeFor(t.room,t.room.players[i]));
    if(previous.has(i)) assert.notEqual(c.kind,previous.get(i));
    previous.set(i,c.kind);
    if(c.options) assert.equal(new Set(c.options.map(JSON.stringify)).size,4);
   }
   for(const [i,p] of t.room.players.entries()) t.cmd(p,'answer',{answer:solution(cs[i])});
   count++;
  }
  assert.equal(t.room.phase,m===5?'finished':'result');
  if(m<5)t.cmd(t.player,'next');
 }
 assert.equal(count,30); assert.equal(t.room.total,900);
});
test('new seeds change questions and task order',()=>{
 const variants=new Set(),orders=new Set();
 for(let seed=1;seed<=80;seed++){
  const t=team();t.room.challengeVersion=3;t.room.seed=seed;
  variants.add(JSON.stringify(challengeFor(t.room,t.player)));
  orders.add(t.room.players.map(p=>challengeFor(t.room,p).kind).join(','));
 }
 assert.ok(variants.size>60);assert.ok(orders.size>20);
});
