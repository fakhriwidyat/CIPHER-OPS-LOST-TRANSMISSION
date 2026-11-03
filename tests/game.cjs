/* State-machine integration tests, using an isolated DOM adapter rather than a browser. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { math, missions, SAVE_KEY, SETTINGS_KEY } = require('../js/data.js');
function setup(savedEntries = []) {
  const store = new Map(savedEntries), listeners = {}, timers = new Map(), nodes = new Map(); let timerId = 0;
  function node() { return { innerHTML: '', textContent: '', hidden: true, disabled: false, isConnected: true, open: false, offsetWidth: 500, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, focus() {}, addEventListener() {}, showModal() { this.open = true; }, close() { this.open = false; }, getBoundingClientRect() { return { left: 0, right: 500, top: 0, bottom: 500 }; } }; }
  const game = node(), modal = node(); nodes.set('#game', game); nodes.set('#modal', modal);
  const getNode = selector => { if (!nodes.has(selector)) nodes.set(selector, node()); return nodes.get(selector); };
  game.querySelector = getNode;
  game.querySelectorAll = () => [];
  const document = { querySelector: getNode, activeElement: node(), body: node(), addEventListener: (type, callback) => { listeners[type] = callback; } };
  const PixelArt = { mount() {}, portrait() { return 'data:image/png;base64,test'; } };
  const context = { document, PixelArt, localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) }, setTimeout: (callback, ms) => { const id = ++timerId; timers.set(id, { callback, ms }); return id; }, clearTimeout: id => timers.delete(id), FormData: class { constructor(form) { this.data = form.values; } get(key) { return this.data[key] ?? null; } } };
  context.window = { matchMedia: () => ({ matches: false }), PixelArt };
  vm.createContext(context);
  for (const file of ['data.js', 'game.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/', file), 'utf8'), context, { filename: file });
  const click = (name, id) => listeners.click({ target: { closest: () => ({ dataset: { action: name, id: String(id) }, disabled: false }) } });
  const submit = (id, values) => listeners.submit({ preventDefault() {}, target: { id, values, elements: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value }])) } });
  const save = () => JSON.parse(store.get(SAVE_KEY));
  const has = text => game.innerHTML.includes(text);
  const advanceTimers = ms => { for (const [id, task] of [...timers]) if (task.ms <= ms) { timers.delete(id); task.callback(); } };
  const start = () => { click('new'); click('skipIntro'); submit('callsign-form', { callsign: 'TEST_RUNNER' }); };
  const open = id => { click('mission', id); click('startMission'); };
  const answerStage = (id, stageIndex) => {
    const mission = missions[id], stage = mission.stages[stageIndex];
    let values = {};
    if (stage.kind === 'encode') values = Object.fromEntries(math.encrypt(stage.plain, mission.fn).map((v, i) => ['value-' + i, String(v)]));
    if (stage.kind === 'sequence') values.option = String(stage.options.findIndex(v => math.same(v, math.encrypt(stage.plain, mission.fn))));
    if (stage.kind === 'composition') { const fn = math.compose(mission.f, mission.g); values.option = String(stage.options.findIndex(v => v.a === fn.a && v.b === fn.b)); }
    if (stage.kind === 'decode') values.decoded = math.decrypt(stage.cipher, mission.fn);
    if (stage.kind === 'repair') values = { 'repair-row': String(stage.corruptIndex), 'repair-value': String(math.encrypt(stage.plain, mission.fn)[stage.corruptIndex]) };
    submit('puzzle-form', values);
  };
  return { click, submit, save, has, start, open, answerStage, store, game, modal, getNode, advanceTimers, listeners };
}
test('intro skip, callsign validation, and locked districts', () => {
  const app = setup(); assert.ok(app.has('NO SAVED SIGNAL'));
  app.click('new'); assert.ok(app.has('Kota ini tak pernah tidur'));
  app.click('introNext'); assert.ok(app.has('Enam distrik terputus'));
  app.click('skipIntro'); app.submit('callsign-form', { callsign: '<script>' }); assert.ok(app.has('callsign-form'));
  app.submit('callsign-form', { callsign: 'ECHO' }); assert.equal(app.save().callsign, 'ECHO'); assert.ok(app.has('THE SAFEHOUSE'));
  app.click('map'); assert.ok(app.has('CONNECTION LOCKED'));
  app.click('mission', 5); assert.ok(app.has('DISTRICT NETWORK')); assert.deepEqual(app.save().completed, []);
});
test('empty and malformed answers do not cost lives; wrong valid answers and hints do', () => {
  const app = setup(); app.start(); app.open(0);
  app.submit('puzzle-form', {}); assert.equal(app.save().active.health, 3);
  app.submit('puzzle-form', { 'value-0': '1.5', 'value-1': '21' }); assert.equal(app.save().active.health, 3);
  app.submit('puzzle-form', { 'value-0': '1', 'value-1': '21' }); assert.equal(app.save().active.health, 2);
  app.click('hint'); app.click('hint'); assert.equal(app.save().active.hints, 1); assert.equal(app.save().active.penaltyHints, 1);
  app.answerStage(0, 0); assert.deepEqual(app.save().records[0], { score: 65, stars: 1 });
  app.click('replay'); app.answerStage(0, 0); assert.deepEqual(app.save().records[0], { score: 150, stars: 3 });
  app.click('replay'); app.answerStage(0, 0); assert.deepEqual(app.save().completed, [0]); assert.equal(app.save().records[0].score, 150); assert.equal(app.save().clues.length, 1);
});
test('three errors fail a mission, protect prior progress, and retry resets mission state', () => {
  const app = setup(); app.start(); app.open(0); app.answerStage(0, 0); app.click('nextMission'); app.click('startMission');
  for (let i = 0; i < 3; i++) app.submit('puzzle-form', { option: '0' });
  assert.ok(app.has('CONNECTION LOST')); assert.deepEqual(app.save().completed, [0]); assert.equal(app.save().active, null);
  app.submit('puzzle-form', { option: '1' }); assert.deepEqual(app.save().completed, [0]);
  app.click('retry'); assert.equal(app.save().active.health, 3); assert.equal(app.save().active.errors, 0);
  app.answerStage(1, 0); assert.deepEqual(app.save().completed, [0, 1]);
});
test('all six missions require all stages, finish the campaign, and restore save', () => {
  const app = setup(); app.start();
  for (let id = 0; id < 6; id++) {
    app.open(id);
    for (let stage = 0; stage < missions[id].stages.length; stage++) {
      app.answerStage(id, stage);
      if (stage < missions[id].stages.length - 1) assert.ok(!app.save().completed.includes(id));
    }
    assert.ok(app.save().completed.includes(id));
  }
  assert.equal(Object.values(app.save().records).reduce((s, r) => s + r.score, 0), 900);
  app.click('ending'); assert.ok(app.has('THE CITY')); assert.ok(app.has('900')); assert.ok(app.has('18/18'));
  const restored = setup(app.store); restored.click('continue'); assert.ok(restored.has('THE SAFEHOUSE')); assert.deepEqual(restored.save().completed, [0, 1, 2, 3, 4, 5]);
});
test('resume survives refresh mid-composition, without skipping the second stage', () => {
  const app = setup(); app.start(); for (const id of [0, 1]) { app.open(id); app.answerStage(id, 0); }
  app.open(2); app.answerStage(2, 0); assert.equal(app.save().active.stage, 1);
  const restored = setup(app.store); restored.click('continue'); assert.ok(restored.has('STAGE 2 / 2')); restored.answerStage(2, 1); assert.ok(restored.save().completed.includes(2));
});
test('dialogue effects persist and cannot farm hint tokens or duplicate clues', () => {
  const app = setup(); app.start(); app.click('aria'); app.click('dialogueChoice', 0); assert.ok(app.save().clues.includes('log'));
  app.click('hub'); app.click('aria'); app.click('dialogueChoice', 1); assert.equal(app.save().freeHints, 1);
  app.click('hub'); app.open(0); app.click('hint'); assert.equal(app.save().active.penaltyHints, 0); assert.equal(app.save().active.hints, 1); assert.equal(app.save().freeHints, 0);
  app.click('hub'); app.click('aria'); app.click('dialogueChoice', 1); assert.equal(app.save().freeHints, 0);
  app.click('hub'); app.click('aria'); app.click('dialogueChoice', 0); assert.equal(app.save().clues.filter(c => c === 'log').length, 1);
  app.click('archive'); assert.ok(app.has('Sebelum pemadaman'));
});
test('overwrite and reset require explicit in-game confirmation', () => {
  const app = setup(); app.start(); app.click('new'); assert.equal(app.modal.open, true); app.click('closeModal'); assert.equal(app.save().callsign, 'TEST_RUNNER');
  app.click('settings'); app.click('resetSave'); app.click('closeModal'); assert.ok(app.store.has(SAVE_KEY));
  app.click('resetSave'); app.click('confirm'); assert.equal(app.store.has(SAVE_KEY), false); assert.ok(app.has('NO SAVED SIGNAL'));
});
test('corrupt, outdated, and non-contiguous saves are ignored safely', () => {
  for (const data of ['{broken', JSON.stringify({ version: 1 }), JSON.stringify({ version: 2, callsign: 'X', completed: [0, 2], records: {} })]) {
    const app = setup([[SAVE_KEY, data]]); assert.ok(app.has('NO SAVED SIGNAL'));
  }
});
test('co-op hides original message, shares lives through handoff, and completes all rounds', () => {
  const app = setup(); app.start(); const before = app.store.get(SAVE_KEY);
  app.click('coopSetup'); app.submit('coop-form', { p1: 'ECHO', p2: 'NOVA' });
  const rounds = [{ plain: 'RADIO', fn: { a: 2, b: 3 } }, { plain: 'GRID', fn: { a: 3, b: 2 } }, { plain: 'WAVE', fn: { a: 6, b: 5 } }];
  for (let index = 0; index < rounds.length; index++) {
    const round = rounds[index]; assert.ok(app.has('SENDER / ECHO'));
    app.submit('puzzle-form', Object.fromEntries(math.encrypt(round.plain, round.fn).map((v, i) => ['value-' + i, String(v)])));
    assert.ok(app.has('TRANSMITTING_')); app.advanceTimers(1500); assert.ok(app.has('RECEIVER HANDOFF'));
    app.click('receiverReady'); assert.ok(app.has('RECEIVER / NOVA')); assert.ok(!app.has(round.plain));
    app.submit('puzzle-form', { decoded: 'WRONG' }); assert.ok(app.getNode('.mission-hud').innerHTML.includes('2 dari 3 nyawa'));
    app.submit('puzzle-form', { decoded: round.plain.toLowerCase() }); assert.ok(app.has('CONNECTION VERIFIED'));
    if (index < 2) app.click('nextCoop');
  }
  assert.ok(app.has('TEAM CHANNEL RESTORED')); assert.ok(app.has('270'));
  assert.equal(app.store.get(SAVE_KEY), before); app.click('finishCoop'); assert.ok(app.has('LOCAL CO-OP'));
});
test('co-op failure and retry do not affect a saved solo campaign', () => {
  const app = setup(); app.start(); const before = app.store.get(SAVE_KEY); app.click('coopSetup'); app.submit('coop-form', { p1: 'A', p2: 'B' });
  for (let i = 0; i < 3; i++) app.submit('puzzle-form', Object.fromEntries([1, 2, 3, 4, 5].map((v, i) => ['value-' + i, String(v)])));
  assert.ok(app.has('CONNECTION LOST')); app.click('retry'); assert.ok(app.has('SENDER / A')); assert.ok(app.has('3 dari 3 nyawa')); assert.equal(app.store.get(SAVE_KEY), before);
});
test('settings changes are written separately from campaign progress', () => {
  const app = setup(); app.start(); const before = app.store.get(SAVE_KEY); app.click('settings');
  app.listeners.change({ target: { id: 'setting-motion', checked: true } });
  assert.equal(JSON.parse(app.store.get(SETTINGS_KEY)).reducedMotion, true); assert.equal(app.store.get(SAVE_KEY), before);
});
test('audio mixer values save independently and persist after a reload', () => {
  const app = setup(); app.start(); const before = app.store.get(SAVE_KEY);
  app.listeners.input({ target: { dataset: { audioSetting: 'musicVolume' }, value: '18' } });
  app.listeners.input({ target: { dataset: { audioSetting: 'effectsVolume' }, value: '82' } });
  assert.equal(JSON.parse(app.store.get(SETTINGS_KEY)).musicVolume, 18);
  assert.equal(JSON.parse(app.store.get(SETTINGS_KEY)).effectsVolume, 82);
  assert.equal(app.store.get(SAVE_KEY), before);
  const restored = setup(app.store); restored.click('settings');
  assert.ok(restored.modal.innerHTML.includes('value="18" id="audio-musicVolume"'));
  assert.ok(restored.modal.innerHTML.includes('value="82" id="audio-effectsVolume"'));
});
test('legacy sound-off preference is preserved with sensible defaults for new mixer sliders', () => {
  const app = setup([[SETTINGS_KEY, JSON.stringify({ sound: false, reducedMotion: true })]]);
  assert.ok(app.getNode('#sound-toggle').innerHTML.includes('AUDIO OFF')); app.click('settings');
  assert.ok(app.modal.innerHTML.includes('value="55" id="audio-volume"'));
  assert.ok(app.modal.innerHTML.includes('value="36" id="audio-musicVolume"'));
});
test('audio slider validation clamps ranges and ignores unknown settings', () => {
  const app = setup(); app.listeners.input({ target: { dataset: { audioSetting: 'volume' }, value: '500' } });
  assert.equal(JSON.parse(app.store.get(SETTINGS_KEY)).volume, 100);
  const before = app.store.get(SETTINGS_KEY);
  app.listeners.input({ target: { dataset: { audioSetting: 'volume' }, value: 'oops' } });
  app.listeners.input({ target: { dataset: { audioSetting: 'callsign' }, value: 'broken' } });
  assert.equal(app.store.get(SETTINGS_KEY), before);
});
