import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { BANKS, parseAnswer } from '../server/field-puzzles.mjs';
import { authenticate, createRoom, joinRoom, command, snapshot, ONLINE_TIMEOUT } from '../server/rooms.mjs';
import { D1Store, handleAPI } from '../server/api.mjs';
import safehouse from '../js/exploration.js';
import course from '../js/course.js';

function team(count = 2, mode = 'exploration') {
  let now = 100000;
  const { room, player: host } = createRoom('ABC234', 'ECHO', now, mode);
  for (let i = 1; i < count; i++) joinRoom(room, 'OP' + i, now);
  room.seed = 654321;
  const send = (p, action, extra = {}) => command(room, p, { action, requestId: crypto.randomUUID(), stageId: room.stageId, ...extra }, now);
  const view = p => snapshot(room, p, now);
  function tick(ms, maintainCrew = true) {
    now += ms;
    if (maintainCrew) for (const p of room.players) if (now - p.seen < ONLINE_TIMEOUT) send(p, 'poll');
  }
  function start() {
    for (const p of room.players) send(p, 'ready', { ready: true });
    send(host, 'start');
  }
  function walk(p, station) {
    const map = view(p).field.map, target = map.objects[station];
    const geo = safehouse.geometry(map);
    let seq = p.fieldPose.seq;
    const nav = geo.createNavigator(p.fieldPose);
    assert.ok(nav.moveTo(target), 'Every station must be reachable');
    const frames = 4;
    let batch = [];
    for (let i = 0; nav.state.destination && i < 1000; i++) {
      nav.step(1 / 60);
      tick(1000 / 60, i % 25 === 0);
      if (i % frames === frames - 1 || !nav.state.destination) {
        batch.push({ x: nav.state.x, y: nav.state.y, seq: ++seq });
        if (batch.length >= 6 || !nav.state.destination) {
          send(p, 'poll', { pose: { points: batch, direction: nav.state.direction, moving: nav.state.moving } });
          const last = batch.at(-1);
          assert.ok(Math.hypot(last.x - p.fieldPose.x, last.y - p.fieldPose.y) < .01, `Position rejected at station ${station}: ${JSON.stringify({ last, pose: p.fieldPose })}`);
          batch = [];
        }
      }
    }
    assert.ok(Math.hypot(target.x - p.fieldPose.x, target.y - p.fieldPose.y) < 1);
  }
  function open(p, station, taskId) {
    walk(p, station);
    send(p, 'field-open', { station, taskId });
    const panel = view(p).field.panel;
    assert.equal(panel.id, taskId);
    return panel.puzzle;
  }
  function solve(p, station, taskId, answer, packet) {
    const puzzle = open(p, station, taskId);
    assert.ok(puzzle);
    assert.ok(!('answers' in puzzle));
    tick(750);
    const reply = send(p, 'field-answer', { station, taskId, answer, packet });
    assert.equal(reply.correct, true);
  }
  return { room, host, send, view, tick, start, walk, open, solve };
}

test('all 48 templates generate eight distinct playable variants and reject invalid formats', () => {
  assert.equal(BANKS.length, 6);
  assert.equal(new Set(BANKS.flat().map(t => t.id)).size, 48);
  for (const bank of BANKS) {
    assert.equal(bank.length, 8);
    for (const template of bank) {
      const variants = Array.from({ length: 8 }, (_, i) => template.build(i));
      assert.equal(new Set(variants.map(p => JSON.stringify([p.brief, p.lines]))).size, 8, template.id);
      for (const puzzle of variants) {
        assert.equal(parseAnswer(puzzle, ''), null);
        assert.equal(parseAnswer(puzzle, {}), null);
        assert.equal(parseAnswer(puzzle, '1/0'), null);
        assert.ok(puzzle.hint && puzzle.answers.length);
        if (puzzle.options) assert.equal(new Set(puzzle.options).size, puzzle.options.length);
        for (const answer of puzzle.answers) assert.equal(parseAnswer(puzzle, answer), answer);
      }
    }
  }
  const [route] = BANKS[1].filter(t => t.id === 'canal-cost');
  assert.deepEqual(route.build(5).answers, ['Jembatan', 'Dermaga']);
  assert.deepEqual(BANKS[4].find(t => t.id === 'split-power').build(7).answers, ['(13, 4, 5)', '(12, 5, 5)']);
});

test('both curriculum maps offer different puzzles across all four topics with valid answer formats', () => {
  for (const bank of course.BANKS) {
    assert.equal(new Set(bank.map(t => t.id)).size, 8);
    for (const template of bank) {
      const variants = Array.from({ length: 8 }, (_, v) => template.build(v));
      assert.equal(new Set(variants.map(v => JSON.stringify(v.lines))).size, 8, template.id);
      for (const puzzle of variants) {
        assert.equal(parseAnswer(puzzle, ''), null);
        for (const answer of puzzle.answers) {
          assert.equal(parseAnswer(puzzle, answer), answer);
          assert.equal(course.normalize(puzzle, answer), answer);
        }
      }
    }
  }
  assert.deepEqual(course.BANKS[1][6].build(0).answers, ['Baris A', 'Baris C']);
});

for (const count of [2, 3, 4]) test(`${count} players travel, share packages and complete all six districts`, () => {
  const t = team(count); t.start();
  for (let mission = 0; mission < BANKS.length; mission++) {
    const field = t.room.field;
    assert.equal(field.tasks.length, count * 3);
    for (const p of t.room.players) {
      assert.equal(field.tasks.filter(task => task.owner === p.id).length, 3);
      const root = field.tasks.find(task => task.source === null && task.owner === p.id && ['kai', 'nyx', 'bolt', 'iris'][task.station] === p.role);
      assert.ok(root, 'Each operator gets an initial task matching their role.');
    }
    assert.throws(() => t.send(t.host, 'field-open', { station: 4, taskId: 'final' }), /Dekati/);
    for (const [i, task] of field.tasks.entries()) {
      if (i === 2) {
        const fault = t.view(t.host).field.fault;
        assert.ok(fault.active && !fault.resolved);
        const v = field.fault.variant, repair = count !== 3;
        const solve = repair ? [19 + v, 11 + v, 23 + v, 8 - v, 15 + v, v + 6] : [2 * v + 7, v + 16, (30 + v) % 9, 8 + v, 2 * v + 8, v + 4];
        t.solve(t.host, repair ? fault.repair : fault.bypass, repair ? 'repair' : 'bypass', String(solve[mission]));
        assert.equal(field.fault.resolved, repair ? 'repair' : 'bypass');
      }
      const owner = t.room.players.find(p => p.id === task.owner);
      if (task.clueAt !== null) {
        assert.notEqual(task.clueAt, task.station);
        const helper = t.room.players.find(p => p !== owner);
        assert.match(t.view(owner).field.work[task.station].find(t => t.id === task.id).state, /cari di/);
        t.walk(helper, task.clueAt);
        t.send(helper, 'field-open', { station: task.clueAt, taskId: 'clue-' + task.id });
        assert.equal(task.clueRead, true);
        assert.equal(t.view(owner).field.work[task.clueAt].find(t => t.id === 'clue-' + task.id).clue, BANKS[mission][task.index].build(task.variant).lines[0]);
      }
      const answer = BANKS[mission][task.index].build(task.variant).answers[0];
      t.solve(owner, task.station, task.id, answer, task.source === null ? undefined : String(field.tasks[task.source].packet));
      assert.equal(t.view(t.host).field.completed, i + 1);
    }
    const last = t.view(t.host).field;
    assert.equal(last.finalReady, true);
    if (mission === 1) assert.equal(last.map.gates.filter(g => g.open).length, 1);
    const checksum = field.tasks.slice(0, 4).reduce((sum, task, i) => sum + task.packet * field.weights[i], 0);
    const answer = mission === 5 ? (checksum % 13) * (2 + field.fault.variant % 3) + (field.fault.resolved === 'repair' ? 1 : 4) : checksum % 10;
    t.solve(t.host, 4, 'final', String(answer));
    assert.equal(t.room.phase, mission < 5 ? 'result' : 'finished');
    assert.equal(t.room.records.length, mission + 1);
    if (mission < 5) t.send(t.host, 'next');
  }
});

for (const count of [2, 3, 4]) test(`${count} trainees receive completion only after Central Hub and Riverside`, () => {
  const t = team(count, 'training'); t.start();
  assert.throws(() => t.send(t.host, 'next'), /belum selesai/);
  for (let mission = 0; mission < 2; mission++) {
    const field = t.room.field;
    const initial = t.view(t.host);
    assert.equal(initial.mapCount, 2);
    assert.equal(initial.completedAt, undefined);
    assert.deepEqual(new Set(initial.field.work.flat().map(job => job.topic).filter(Boolean)), new Set(course.TOPICS));
    assert.equal(new Set(field.tasks.map(task => task.index)).size, field.tasks.length);
    for (const [i, task] of field.tasks.entries()) {
      if (i === 2) {
        const fault = t.view(t.host).field.fault, v = field.fault.variant;
        t.solve(t.host, fault.repair, 'repair', String(mission ? v + 11 : v + 19));
      }
      const owner = t.room.players.find(p => p.id === task.owner);
      const answer = course.BANKS[mission][task.index].build(task.variant).answers[0];
      const packet = task.source === null ? undefined : String(field.tasks[task.source].packet);
      t.solve(owner, task.station, task.id, answer, packet);
    }
    const checksum = field.tasks.slice(0, 4).reduce((sum, task, i) => sum + task.packet * field.weights[i], 0);
    t.solve(t.host, 4, 'final', String(checksum % (mission ? 11 : 10)));
    const result = t.view(t.host);
    assert.equal(result.total, (mission + 1) * 150);
    assert.equal(result.phase, mission ? 'finished' : 'result');
    assert.equal(!!result.completedAt, !!mission);
    if (!mission) t.send(t.host, 'next');
  }
  assert.throws(() => t.send(t.host, 'next'), /belum selesai/);
  for (const player of t.room.players) {
    const reconnected = t.view(player);
    assert.equal(reconnected.records.length, 2);
    assert.equal(reconnected.players.find(p => p.id === reconnected.you).name, player.name);
  }
  t.send(t.host, 'lobby');
  assert.equal(t.view(t.host).completedAt, undefined);
});

test('presence, field progress and private hints survive reconnect; new rounds get new work', () => {
  const t = team(3); t.start();
  const { room, host } = t, peer = room.players[1];
  const initial = JSON.stringify(room.field.tasks), task = room.field.tasks[0];
  assert.throws(() => t.send(peer, 'field-open', { station: 0, taskId: task.id }), /Dekati/);
  const puzzle = t.open(host, 0, task.id);
  const panel = { station: 0, taskId: task.id };
  assert.throws(() => t.send(host, 'field-answer', { ...panel, answer: '' }), /format/);
  assert.equal(room.errors, 0);
  t.send(host, 'field-hint', panel); t.send(host, 'field-hint', panel);
  assert.equal(room.hints, 1);
  assert.equal(t.view(peer).field.panel, null);
  assert.equal(t.view(host).field.panel.puzzle.hint, BANKS[0][task.index].build(task.variant).hint);
  const loaded = JSON.parse(JSON.stringify(room));
  const reconnected = authenticate(loaded, host.secret);
  const resumed = snapshot(loaded, reconnected, room.updated).field;
  assert.equal(resumed.panel.puzzle.brief, puzzle.brief);
  assert.equal(resumed.poses.find(p => p.id === host.id).x, host.fieldPose.x);
  assert.equal(resumed.completed, 0);
  t.send(host, 'field-ping', { station: 0, ping: 'help' });
  assert.match(t.view(peer).events.at(-1).text, /Butuh bantuan/);
  t.send(host, 'lobby'); t.start();
  assert.notEqual(JSON.stringify(room.field.tasks), initial);
});

test('stale, out-of-bounds, through-wall and implausible position updates are rejected', () => {
  const t = team(); t.start();
  const p = t.host, original = p.fieldPose;
  t.tick(1000);
  const pose = point => ({ direction: 'up', moving: true, points: [point] });
  t.send(p, 'poll', { stageId: 'old-stage', pose: pose({ x: original.x, y: 350, seq: 1 }) });
  assert.equal(p.fieldPose.seq, 0);
  t.send(p, 'poll', { pose: pose({ x: original.x, y: 350, seq: 1 }) });
  assert.equal(p.fieldPose.y, 350);
  t.tick(2000);
  t.send(p, 'poll', { pose: pose({ x: original.x, y: 170, seq: 2 }) });
  assert.equal(p.fieldPose.y, 350);
  t.send(p, 'poll', { pose: pose({ x: 1000, y: 350, seq: 3 }) });
  assert.equal(p.fieldPose.x, original.x);
  t.send(p, 'poll', { pose: pose({ x: original.x + 5, y: 350, seq: 4 }) });
  t.send(p, 'poll', { pose: pose({ x: 380, y: 350, seq: 5 }) });
  assert.equal(p.fieldPose.x, original.x + 5);
});

test('an offline operator’s work becomes available to the other two, and can be finished once', () => {
  const t = team(3); t.start();
  const { host, room } = t, peer = room.players[1], third = room.players[2];
  const task = room.field.tasks.find(q => q.owner === peer.id && q.source === null);
  t.tick(ONLINE_TIMEOUT + 1, false);
  t.send(host, 'poll'); t.send(third, 'poll');
  assert.equal(t.view(host).field.work[task.station].find(q => q.id === task.id).state, 'siap');
  t.solve(host, task.station, task.id, BANKS[0][task.index].build(task.variant).answers[0]);
  assert.equal(t.view(peer).field.completed, 1);
  assert.throws(() => t.send(host, 'field-answer', { station: task.station, taskId: task.id, answer: '0' }), /sudah selesai/);
});

test('HTTP exploration snapshots persist in the D1-compatible store and do not leak solutions', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE rooms (code TEXT PRIMARY KEY, revision INTEGER NOT NULL, state TEXT NOT NULL, updated INTEGER NOT NULL)');
  const store = new D1Store({ prepare(sql) {
    const statement = db.prepare(sql);
    return { bind(...values) { return { first: async () => statement.get(...values), run: async () => ({ meta: statement.run(...values) }) }; } };
  } });
  const base = 'http://cipher.test/api/rooms/';
  async function request(path, body, secret) {
    const response = await handleAPI(new Request(base + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(secret ? { Authorization: 'Bearer ' + secret } : {}) }, body: JSON.stringify(body)
    }), store);
    assert.ok(response.ok, await response.clone().text());
    return response.json();
  }
  try {
    const host = await request('create', { name: 'HOST', mode: 'exploration' });
    const code = host.room.code, guest = await request(code + '/join', { name: 'GUEST' });
    const send = (p, action, extra) => request(code + '/command', { action, requestId: crypto.randomUUID(), ...extra }, p.secret);
    await Promise.all([host, guest].map(p => send(p, 'ready', { ready: true })));
    const begun = await send(host, 'start');
    const snapshots = await Promise.all([host, guest].map(p => send(p, 'poll')));
    assert.equal(begun.room.mode, 'exploration');
    assert.equal(snapshots[0].room.revision, begun.room.revision, 'Stationary polls reuse the latest stored revision.');
    assert.equal(snapshots[1].room.revision, begun.room.revision);
    for (const { room } of snapshots) {
      assert.equal(room.stageId, begun.room.stageId);
      assert.equal(room.field.poses.length, 2);
      assert.equal(room.field.total, 6);
      assert.equal(room.field.panel, null);
      assert.equal(room.challenge, null);
      assert.doesNotMatch(JSON.stringify(room), /answers|secret|variant/);
    }
  } finally { db.close(); }
});
