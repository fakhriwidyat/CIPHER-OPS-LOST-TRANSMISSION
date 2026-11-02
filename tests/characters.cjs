const { test } = require('node:test');
const assert = require('node:assert/strict');
const { draw } = require('../js/characters.js');

function render(type, pose = {}) {
  const pixels = []; let depth = 0;
  const ctx = {
    save() { depth++; }, restore() { assert.ok(depth > 0); depth--; },
    translate(...args) { assert.ok(args.every(Number.isFinite)); },
    scale(...args) { assert.ok(args.every(Number.isFinite)); },
    fillRect(x,y,w,h) {
      assert.ok([x,y,w,h].every(Number.isFinite));
      assert.ok(w > 0 && h > 0);
      pixels.push([x,y,w,h,this.fillStyle]);
    }
  };
  draw(ctx,type,pose); assert.equal(depth,0);
  return JSON.stringify(pixels);
}
test('four operators have distinct artwork in all directions and valid animation frames', () => {
  for(const direction of ['down','up','left','right']) {
    const frames=['kai','nyx','bolt','iris'].map(type=>render(type,{direction,reduced:true}));
    assert.equal(new Set(frames).size,4);
    for(const type of ['kai','nyx','bolt','iris','runner','aria']) {
      for(const time of [0,.12,.24,.36,5.2]) render(type,{direction,time,moving:true,wave:true});
    }
  }
});
test('movement changes the sprite and reduced motion stays still',()=>{
  for(const type of ['kai','nyx','bolt','iris']) {
    assert.notEqual(render(type,{moving:true,time:0}),render(type,{moving:true,time:.12}));
    assert.equal(render(type,{moving:true,reduced:true,time:0}),render(type,{moving:true,reduced:true,time:5.2}));
  }
  assert.equal(render('runner',{reduced:true}),render('kai',{reduced:true}));
});
