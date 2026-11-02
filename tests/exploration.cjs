const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ROOM, OBJECTS, walkable, clearLine, findPath, createNavigator } = require('../js/exploration.js');
test('gait tracks distance, settles without sliding and stays consistent across frame rates',()=>{
  const positions=[];
  for(const fps of [30,60,120]) {
    const nav=createNavigator({x:500,y:450});
    for(let i=0;i<fps;i++)nav.step(1/fps,{x:1});
    assert.ok(Math.abs(nav.state.time-(nav.state.x-500)/ROOM.speed)<1e-8);
    const x=nav.state.x,time=nav.state.time;
    for(let i=0;i<fps/2;i++)nav.step(1/fps);
    assert.equal(nav.state.x,x);assert.equal(nav.state.time,time);
    assert.ok(nav.state.gaitWeight<.001);
    positions.push(x);
  }
  assert.ok(Math.max(...positions)-Math.min(...positions)<2);
});
test('small diagonal fluctuations preserve facing and blocked movement does not advance gait',()=>{
  const nav=createNavigator({x:550,y:440,direction:'right'});
  for(let i=0;i<12;i++) {nav.step(1/60,{x:1,y:i%2?1.01:.99});assert.equal(nav.state.direction,'right');}
  const wall=createNavigator({x:ROOM.maxX,y:480,direction:'right'});
  for(let i=0;i<60;i++)wall.step(1/60,{x:1});
  assert.equal(wall.state.time,0);assert.equal(wall.state.gaitWeight,0);
});
function finish(nav, maxFrames = 1500) {
  for (let i = 0; i < maxFrames && (nav.state.path.length || nav.state.destination); i++) {
    nav.step(1 / 60);
    assert.ok(walkable(nav.state.x, nav.state.y), 'Every simulated step stays on accessible floor.');
  }
  assert.equal(nav.state.path.length, 0, 'Path finishes without getting stuck.');
}
test('walking stays inside the room and cannot pass through desks or crates', () => {
  const nav = createNavigator();
  for (let i = 0; i < 300; i++) nav.step(1 / 60, { y: -1 });
  assert.ok(nav.state.y >= 401); // Computer desk ends at 393, plus 8 px feet radius.
  assert.ok(walkable(nav.state.x, nav.state.y));
  for (let i = 0; i < 300; i++) nav.step(1 / 60, { y: 1 });
  assert.ok(nav.state.y <= ROOM.maxY);
  const crate = createNavigator({ x: 780, y: 440 });
  for (let i = 0; i < 80; i++) crate.step(1 / 60, { x: 1 });
  assert.ok(crate.state.x <= 790);
});
test('diagonal speed is normalized and large frame gaps are clamped', () => {
  const a = createNavigator({ x: 550, y: 440 }), b = createNavigator({ x: 550, y: 440 });
  a.step(.03, { x: 1 }); b.step(.03, { x: 1, y: 1 });
  assert.ok(Math.abs(Math.hypot(a.state.x - 550, a.state.y - 440) - Math.hypot(b.state.x - 550, b.state.y - 440)) < .001);
  a.step(10, { x: 1 }); assert.ok(a.state.x - 550 < 11);
});
test('click-to-move routes around the computer desk toward the archive', () => {
  const start = { x: 476, y: 446 }, archive = OBJECTS.find(o => o.id === 'archive');
  assert.equal(clearLine(start, archive), false);
  const path = findPath(start, archive); assert.ok(path.length >= 2);
  let anchor = start;
  for (const waypoint of path) { assert.ok(clearLine(anchor, waypoint)); anchor = waypoint; }
});
test('all four hotspot approaches arrive and invoke exactly one interaction', () => {
  const calls = [], nav = createNavigator({}, id => calls.push(id));
  for (const object of OBJECTS) {
    assert.ok(nav.approach(object.id)); finish(nav);
    assert.equal(calls.at(-1), object.id);
    assert.ok(Math.hypot(nav.state.x - object.x, nav.state.y - object.y) <= 22);
    nav.step(.05); nav.step(.05);
    assert.equal(calls.filter(id => id === object.id).length, 1);
  }
});
test('E only activates nearby objects; walking interrupts pending hotspot navigation', () => {
  const calls = [], nav = createNavigator({}, id => calls.push(id));
  assert.equal(nav.interact(), false); assert.equal(calls.length, 0);
  nav.approach('map'); nav.step(.03, { x: -1 });
  assert.equal(nav.state.pending, null); assert.equal(nav.state.path.length, 0);
  for (let i = 0; i < 100; i++) nav.step(1 / 60);
  assert.equal(calls.length, 0);
  nav.moveTo({ x: 410, y: 420 }); finish(nav); assert.equal(nav.interact(), true); assert.deepEqual(calls, ['terminal']);
});
test('floor clicks on obstacles or outside the room resolve to safe reachable points', () => {
  for (const destination of [{ x: 330, y: 380 }, { x: 830, y: 430 }, { x: -500, y: 400 }, { x: 1200, y: 490 }]) {
    const nav = createNavigator(); assert.ok(nav.moveTo(destination)); finish(nav);
    assert.ok(walkable(nav.state.x, nav.state.y));
  }
  assert.deepEqual(findPath({ x: 330, y: 350 }, { x: 500, y: 440 }), []);
});
test('saved locations outside the room fall back to the starting position', () => {
  const nav = createNavigator({ x: NaN, y: -100 }); assert.equal(nav.state.x, 476); assert.equal(nav.state.y, 446);
  nav.approach('aria'); nav.stop(); assert.equal(nav.state.moving, false); assert.equal(nav.state.pending, null);
});
