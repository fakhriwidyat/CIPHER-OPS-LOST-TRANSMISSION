const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEngine, normalize, CUES, PROFILES } = require('../js/audio.js');
class Param {
  constructor() { this.value = 0; this.events = []; }
  record(type, value, time) { assert.ok(Number.isFinite(value)); assert.ok(Number.isFinite(time) && time >= 0); this.value = value; this.events.push({ type, value, time }); }
  setValueAtTime(v, t) { this.record('set', v, t); }
  linearRampToValueAtTime(v, t) { this.record('linear', v, t); }
  exponentialRampToValueAtTime(v, t) { assert.ok(v > 0); this.record('exponential', v, t); }
  cancelAndHoldAtTime() {}
  cancelScheduledValues() {}
}
class Node {
  constructor(kind, owner) { this.kind = kind; this.owner = owner; this.connections = []; for (const key of ['gain', 'frequency', 'Q', 'pan', 'detune', 'threshold', 'knee', 'ratio', 'attack', 'release']) this[key] = new Param(); }
  connect(node) { this.connections.push(node); }
  disconnect() { this.disconnected = true; }
  start(at = 0) { this.owner.starts.push({ node: this, at }); }
  stop(at = 0) { this.owner.stops.push({ node: this, at }); }
}
class Context {
  constructor() { this.currentTime = 0; this.sampleRate = 8000; this.state = 'suspended'; this.starts = []; this.stops = []; this.nodes = []; this.resumeCount = 0; this.destination = this.node('destination'); }
  node(kind) { const result = new Node(kind, this); this.nodes.push(result); return result; }
  createGain() { return this.node('gain'); }
  createOscillator() { return this.node('oscillator'); }
  createBufferSource() { return this.node('bufferSource'); }
  createBiquadFilter() { return this.node('filter'); }
  createStereoPanner() { return this.node('panner'); }
  createDynamicsCompressor() { return this.node('compressor'); }
  createConvolver() { return this.node('convolver'); }
  createBuffer(channels, length) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { getChannelData: i => data[i] }; }
  resume() { this.resumeCount++; this.state = 'running'; this.onstatechange?.(); return Promise.resolve(); }
  suspend() { this.state = 'suspended'; this.onstatechange?.(); return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}
function setup() {
  let created = 0, id = 0; const intervals = new Map(), timeouts = new Map(), context = new Context();
  const engine = createEngine({ createContext: () => { created++; return context; }, setInterval: cb => { intervals.set(++id, cb); return id; }, clearInterval: n => intervals.delete(n), setTimeout: cb => { timeouts.set(++id, cb); return id; }, clearTimeout: n => timeouts.delete(n) });
  const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
  const timers = () => { const tasks = [...timeouts.values()]; timeouts.clear(); tasks.forEach(cb => cb()); };
  return { engine, context, intervals, timeouts, flush, timers, created: () => created };
}
test('custom track loops without synth music, follows mixer/visibility and cleans up',async()=>{
 const context=new Context();context.createMediaElementSource=()=>context.node('media');
 let plays=0,pauses=0,created=0;
 const track={paused:true,play(){plays++;this.paused=false;return Promise.resolve();},pause(){pauses++;this.paused=true;},removeAttribute(){},load(){}};
 const intervals=new Set();
 const engine=createEngine({createContext:()=>context,createTrack:()=>{created++;return track;},setInterval:fn=>{intervals.add(fn);return fn;},clearInterval:fn=>intervals.delete(fn)});
 assert.equal(created,0);engine.unlock();await Promise.resolve();await Promise.resolve();
 assert.equal(created,1);assert.equal(track.loop,true);assert.equal(plays,1);assert.equal(intervals.size,0);
 const media=context.nodes.find(n=>n.kind==='media'),gain=media.connections[0];
 const menu=gain.gain.value;engine.setScene('puzzle');assert.ok(gain.gain.value<menu);
 engine.configure({musicVolume:0});assert.equal(gain.gain.value,0);
 engine.setVisible(false);assert.equal(track.paused,true);engine.setVisible(true);await Promise.resolve();
 assert.ok(plays>=2);assert.equal(created,1);
 engine.destroy();assert.equal(track.paused,true);assert.ok(media.disconnected);assert.ok(pauses>=2);
});
test('no AudioContext, music, or ambient sources are created before a gesture', () => {
  const app = setup(); app.engine.configure({ volume: 60 }); app.engine.setScene('hub'); app.engine.movement({ x: 500, y: 440, moving: true });
  assert.equal(app.created(), 0); assert.equal(app.context.starts.length, 0); assert.equal(app.engine.state().unlocked, false);
});
test('first gesture builds one context, four ambient loops, and one music scheduler', async () => {
  const app = setup(); app.engine.unlock(); app.engine.unlock(); await app.flush();
  assert.equal(app.created(), 1); assert.equal(app.context.resumeCount, 1); assert.equal(app.intervals.size, 1);
  assert.equal(app.context.starts.filter(s => s.node.loop || s.node.kind === 'oscillator' && s.at === 0).length, 4);
  for (let i = 0; i < 20; i++) app.engine.unlock(); assert.equal(app.created(), 1); assert.equal(app.intervals.size, 1); app.engine.destroy();
});
test('mute fades out, suspends, and resumes the same context without duplicate loops', async () => {
  const app = setup(); app.engine.unlock(); await app.flush();
  app.engine.configure({ sound: false }); assert.equal(app.intervals.size, 0); app.timers(); assert.equal(app.context.state, 'suspended');
  const count = app.context.starts.length; assert.equal(app.engine.play('complete'), false); assert.equal(app.engine.preview(), false); assert.equal(app.context.starts.length, count);
  app.engine.configure({ sound: true }); await app.flush(); assert.equal(app.context.state, 'running'); assert.equal(app.created(), 1); assert.equal(app.intervals.size, 1); app.engine.destroy();
});
test('volume settings clamp invalid values and independently reach their mix buses', async () => {
  assert.deepEqual(normalize({ volume: 150, musicVolume: -2, ambienceVolume: NaN, effectsVolume: 22.8 }), { sound: true, volume: 100, musicVolume: 0, ambienceVolume: 58, effectsVolume: 23 });
  const app = setup(); app.engine.configure({ volume: 70, musicVolume: 0, effectsVolume: 30, ambienceVolume: 45 }); app.engine.unlock(); await app.flush();
  const gains = app.context.nodes.filter(n => n.kind === 'gain');
  assert.equal(gains[0].gain.value, .7); assert.equal(gains[1].gain.value, .3); assert.equal(gains[2].gain.value, 0); assert.equal(gains[3].gain.value, .45);
  assert.ok(app.context.nodes.some(n => n.kind === 'compressor' && n.ratio.value === 6)); app.engine.destroy();
});
test('all sound cues schedule valid pitches and envelopes; repeated clicks are throttled', async () => {
  const app = setup(); app.engine.unlock(); await app.flush();
  for (const kind of Object.keys(CUES)) { app.context.currentTime += 5; const count = app.context.starts.length; assert.equal(app.engine.play(kind), true); assert.ok(app.context.starts.length > count, kind); }
  app.context.currentTime += 5; app.engine.play('click'); const count = app.context.starts.length; assert.equal(app.engine.play('click'), false); assert.equal(app.context.starts.length, count);
  app.context.starts.filter(s => !s.node.loop).forEach(start => assert.ok(start.at >= 0)); app.engine.destroy();
});
test('puzzle music is quieter and omits the melody; scheduler never catches up in a burst', async () => {
  assert.ok(PROFILES.puzzle.music < PROFILES.dialogue.music && PROFILES.dialogue.music < PROFILES.hub.music); assert.equal(PROFILES.puzzle.notes, false);
  const app = setup(); app.engine.unlock(); await app.flush(); app.engine.setScene('puzzle');
  app.context.currentTime = 1000; const before = app.context.starts.length; [...app.intervals.values()].forEach(cb => cb());
  assert.ok(app.context.starts.length - before <= 4); const after = app.context.starts.length; [...app.intervals.values()].forEach(cb => cb()); assert.equal(app.context.starts.length, after); app.engine.destroy();
});
test('footsteps follow movement distance and stop when the player stops or leaves the hub', async () => {
  const app = setup(); app.engine.unlock(); await app.flush(); app.engine.setScene('hub'); const before = app.context.starts.length;
  for (let i = 0; i < 60; i++) { app.context.currentTime += 1 / 60; app.engine.movement({ x: 476 + i * 3, y: 440, moving: true }); }
  const moved = app.context.starts.length; assert.ok(moved > before); assert.ok(moved - before <= 10);
  for (let i = 0; i < 30; i++) { app.context.currentTime += 1 / 60; app.engine.movement({ x: 653, y: 440, moving: false }); }
  assert.equal(app.context.starts.length, moved); app.engine.setScene('puzzle'); app.engine.movement({ x: 700, y: 440, moving: true }); assert.equal(app.context.starts.length, moved); app.engine.destroy();
});
test('hidden tabs suspend playback and rapid return cancels pending suspension', async () => {
  const app = setup(); app.engine.unlock(); await app.flush(); app.engine.setVisible(false); assert.equal(app.intervals.size, 0); assert.equal(app.engine.play('radio'), false);
  app.engine.setVisible(true); await app.flush(); app.timers(); assert.equal(app.context.state, 'running'); assert.equal(app.intervals.size, 1);
  app.engine.setVisible(false); app.timers(); assert.equal(app.context.state, 'suspended'); app.engine.setVisible(true); await app.flush(); assert.equal(app.context.state, 'running'); app.engine.destroy();
});
test('unsupported audio fails safely and destroy clears loops, voices, and timers', async () => {
  const unsupported = createEngine({ createContext: () => null }); assert.equal(unsupported.unlock(), false); assert.equal(unsupported.play('click'), false); unsupported.destroy();
  const app = setup(); app.engine.unlock(); await app.flush(); app.engine.play('complete'); app.engine.setVisible(false); app.engine.destroy();
  assert.equal(app.intervals.size, 0); assert.equal(app.timeouts.size, 0); assert.equal(app.context.state, 'closed'); assert.equal(app.engine.state().unlocked, false);
});
