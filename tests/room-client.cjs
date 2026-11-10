const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../js/rooms.js'), 'utf8');

function setup(search = '', respond = () => ({})) {
  const requests = [], events = new Map();
  let stored = JSON.stringify({ code: 'OLD234', secret: 'a'.repeat(32) });
  let html = '', answer = null;
  const location = new URL('http://game.test/game' + search);
  const game = {
    set innerHTML(value) {
      html = value;
      const stage = /<form id="room-answer" data-stage="([^"]+)"/.exec(value)?.[1];
      answer = stage ? { dataset: { stage }, elements: [{ name: 'decoded', type: 'text', value: '' }] } : null;
    },
    get innerHTML() { return html; },
    querySelector(selector) { return selector === '#room-answer' ? answer : null; },
    querySelectorAll() { return []; },
    addEventListener(type, listener) { events.set(type, listener); },
    removeEventListener(type) { events.delete(type); },
  };
  const window = { dispatchEvent() {}, CipherCourse: require('../js/course.js'), CipherCertificate: require('../js/certificate.js') };
  const history = { replaceState(_state, _title, url) { location.href = url.href; } };
  vm.runInNewContext(source, {
    window, location, history, URL, URLSearchParams, AbortController, CustomEvent: class {},
    PixelArt: { portrait: () => '' },
    FormData: class { constructor(form) { this.values = form.values; } get(name) { return this.values[name]; } },
    setTimeout: () => 1, clearTimeout() {}, cancelAnimationFrame() {},
    sessionStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; }, removeItem: () => { stored = null; } },
    async fetch(path, options) {
      const body = options?.body ? JSON.parse(options.body) : undefined;
      requests.push({ path, body });
      return { ok: true, json: async () => respond(path, body) };
    },
  });
  window.CipherRooms.mount({ game, scene: content => content, mount() {}, sound() {} });
  return { game, location, events, requests, get answer() { return answer; }, get saved() { return JSON.parse(stored); } };
}

const operator = { id: 'kai', name: 'KAI', color: '#56e4ff', role: 'Kurir' };
function snapshot(code, revision, stageId, hinted = false) {
  return {
    code, revision, stageId, phase: 'playing', mission: 0, stage: 0, stages: 4,
    you: 'player', hostId: 'player', title: 'FIRST CONTACT', district: 'Central Hub',
    health: 3, total: 0, events: [], operators: [operator], teamGoal: 'Tes tim',
    players: [{ id: 'player', name: 'QA', role: 'kai', slot: 0, connected: true, hinted }],
    challenge: { kind: 'decode', fn: { a: 2, b: 3 }, cipher: [5, 7], type: 'DECODE', hint: hinted ? 'Hint QA' : undefined },
  };
}

test('a new invitation beats a saved room; Enter in the room code joins instead of creating', async () => {
  const app = setup('?ref=qa&room=new234', path => path.endsWith('/join') ? { secret: 'b'.repeat(32), room: snapshot('NEW234', 1, 'first') } : { ok: true });
  assert.match(app.game.innerHTML, /id="room-code"[^>]*value="NEW234"/);
  assert.ok(!app.requests.some(request => request.path.includes('OLD234')));
  let prevented = false;
  await app.events.get('keydown')({ key: 'Enter', target: { id: 'room-code', form: { values: { name: 'QA', code: 'NEW234' }, querySelectorAll: () => [] } }, preventDefault() { prevented = true; } });
  assert.ok(prevented);
  assert.ok(app.requests.some(request => request.path === '/api/rooms/NEW234/join'));
  assert.ok(!app.requests.some(request => request.path === '/api/rooms/create'));
  assert.equal(app.saved.code, 'NEW234');
  assert.equal(app.location.searchParams.get('ref'), 'qa');
});

test('opening a hint keeps the typed answer for that stage but never carries it into a new stage', async () => {
  let hints = 0;
  const app = setup('', (path, body) => {
    if (path === '/api/health') return { ok: true };
    if (body.action === 'hint') {
      hints++;
      return { room: snapshot('OLD234', hints + 1, hints === 1 ? 'first' : 'second', true) };
    }
    return { room: snapshot('OLD234', 1, 'first') };
  });
  await new Promise(resolve => setImmediate(resolve));
  app.answer.elements[0].value = 'AB';
  const hint = () => app.events.get('click')({ target: { closest: () => ({ dataset: { roomAction: 'hint' } }) } });
  await hint();
  assert.match(app.game.innerHTML, /Hint QA/);
  assert.equal(app.answer.elements[0].value, 'AB');
  await hint();
  assert.equal(app.answer.dataset.stage, 'second');
  assert.equal(app.answer.elements[0].value, '');
});

test('training debrief offers Riverside first and a personalized team certificate at the end', async () => {
  const room = { ...snapshot('OLD234', 1, 'first'), mode: 'training', phase: 'result', total: 150, records: [{ mission: 0, score: 150 }] };
  function load(state) {
    return setup('', (path) => path.endsWith('/health') ? { ok: true } : { room: state });
  }
  const first = load(room);
  const end = load({
    ...room, phase: 'finished', mission: 1, total: 280, records: [...room.records, { mission: 1, score: 130 }],
    completedAt: '2026-11-10T10:00:00.000Z', you: 'friend',
    players: [...room.players, { ...room.players[0], id: 'friend', name: 'TEMAN', slot: 1 }]
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.match(first.game.innerHTML, /MASUK RIVERSIDE/);
  assert.doesNotMatch(first.game.innerHTML, /download=/);
  assert.match(end.game.innerHTML, /download="sertifikat-cipher-ops-TEMAN.svg"/);
  assert.match(end.game.innerHTML, /SKOR TIM/);
  assert.match(end.game.innerHTML, /280\/300/);
});
