const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function setup() {
  const events = new Map(), frames = new Map(); let id = 0, now = 100, blocked = false, lastPose, hints = 0;
  function eventTarget(name) {
    return { addEventListener(type, callback) { events.set(name + ':' + type, callback); }, removeEventListener(type, callback) { if (events.get(name + ':' + type) === callback) events.delete(name + ':' + type); } };
  }
  const window = eventTarget('window'), document = eventTarget('document');
  const nodes = new Map(), scene = { ...eventTarget('scene'), isConnected: true, dataset: {}, classList: { toggle() {} }, querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, { hidden: true, textContent: '' }); return nodes.get(selector); }, querySelectorAll() { return []; } };
  const canvas = { clientWidth: 960, getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 540 }; } };
  const context = { window, document, requestAnimationFrame: callback => { frames.set(++id, callback); return id; }, cancelAnimationFrame: key => frames.delete(key) };
  vm.createContext(context); vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/exploration.js'), 'utf8'), context);
  const controller = window.Safehouse.mount({ scene, canvas, onInteract() {}, onPose(pose) { lastPose = pose; }, onHint() { hints++; }, isBlocked: () => blocked });
  function tick(count = 1) { for (let i = 0; i < count; i++) { now += 16.67; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now)); } }
  function key(type, value, tagName = 'MAIN') { let prevented = false; events.get('document:' + type)?.({ key: value, target: { tagName }, preventDefault() { prevented = true; }, repeat: false }); return prevented; }
  tick();
  return { controller, events, frames, scene, key, tick, pose: () => lastPose, block(value) { blocked = value; }, hints: () => hints };
}
test('keyboard movement is scoped away from text input and pauses for modals', () => {
  const app = setup(), start = app.pose().x;
  assert.equal(app.key('keydown', 'd', 'INPUT'), false); app.tick(10); assert.equal(app.pose().x, start);
  assert.equal(app.key('keydown', 'd'), true); app.tick(10); assert.ok(app.pose().x > start);
  app.controller.pause(); const paused = app.pose().x; app.tick(10); assert.equal(app.pose().x, paused);
  app.controller.resume(); app.tick(10); assert.equal(app.pose().x, paused); // Held key was cleared.
  app.block(true); assert.equal(app.key('keydown', 'a'), false); app.tick(10); assert.equal(app.pose().x, paused);
  app.controller.destroy();
});
test('touch directions stop on pointer release and cleanup removes owned listeners', () => {
  const app = setup(), start = app.pose().x;
  const button = { dataset: { move: 'right' }, setPointerCapture() {} };
  const event = { button: 0, pointerId: 1, target: { closest: selector => selector === '[data-move]' ? button : null }, preventDefault() {} };
  app.events.get('scene:pointerdown')(event); app.tick(12); assert.ok(app.pose().x > start);
  app.events.get('scene:pointerup')(event); const stopped = app.pose().x; app.tick(30); assert.ok(app.pose().x-stopped < 6); const settled=app.pose().x;app.tick(10);assert.equal(app.pose().x,settled);
  app.controller.destroy(); assert.equal(app.events.size, 0); assert.equal(app.frames.size, 0);
});
test('E away from an object explains how to interact instead of changing screens', () => {
  const app = setup(); app.key('keydown', 'e'); assert.equal(app.hints(), 1); app.controller.destroy();
});
