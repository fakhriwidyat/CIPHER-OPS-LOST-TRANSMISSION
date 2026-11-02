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
test('Aria has her own artwork in every direction, with stable reduced motion',()=>{
  for(const direction of ['down','up','left','right']) {
    const aria=render('aria',{direction,reduced:true});
    for(const type of ['kai','nyx','bolt','iris']) assert.notEqual(aria,render(type,{direction,reduced:true}));
    assert.equal(aria,render('aria',{direction,reduced:true,moving:true,time:5.2,wave:true}));
  }
});
test('browser composites a native pixel buffer once at fractional world scales',()=>{
  const vm=require('node:vm'),fs=require('node:fs');
  const nativeScales=[],blits=[];
  const native={save(){},restore(){},translate(){},scale(x,y){nativeScales.push([x,y]);},clearRect(){},fillRect(x,y,w,h){assert.ok([x,y,w,h].every(Number.isInteger));}};
  const buffer={getContext:()=>native};
  const window={};vm.runInNewContext(fs.readFileSync(require.resolve('../js/characters.js'),'utf8'),{window,document:{createElement:()=>buffer}});
  const target={save(){},restore(){},drawImage(...args){blits.push(args);},fillRect(){assert.fail('Never scale individual sprite parts on the world canvas');}};
  for(const type of ['runner','aria','kai','nyx','bolt','iris']) for(const direction of ['left','right','up','down']) for(const time of [0,.12,.24,.36]) {
    window.CharacterArt.draw(target,type,{x:432.7,y:408.3,scale:1.85,aspect:1.37,direction,time,moving:true});
  }
  assert.equal(blits.length,96);assert.equal(buffer.width,48);assert.equal(buffer.height,56);
  assert.ok(nativeScales.every(([x,y])=>Math.abs(x)===1&&y===1));
  assert.ok(blits.every(args=>args.slice(1).every(Number.isInteger)));
});
