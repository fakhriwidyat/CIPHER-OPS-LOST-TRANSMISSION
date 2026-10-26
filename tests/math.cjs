const { test } = require('node:test');
const assert = require('node:assert/strict');
const { math, missions } = require('../js/data.js');
test('required encryption and inverse calculations', () => {
  assert.equal(math.linear(8, { a: 2, b: 3 }), 19);
  assert.equal(math.linear(9, { a: 2, b: 3 }), 21);
  assert.deepEqual(math.encrypt('CAT', { a: 3, b: 2 }), [11, 5, 62]);
  const fn = math.compose({ a: 3, b: 2 }, { a: 2, b: 1 });
  assert.deepEqual(fn, { a: 6, b: 5 });
  assert.equal(math.linear(8, fn), 53);
  assert.equal(math.inverse(53, fn), 8);
  assert.deepEqual(math.encrypt('HI', fn), [53, 59]);
  assert.equal(math.decrypt([11, 5, 8, 29, 44], { a: 3, b: 2 }), 'CABIN');
  assert.deepEqual(math.encrypt('SAFE', { a: 2, b: 3 }), [41, 5, 15, 13]);
  assert.deepEqual(math.encrypt('GO', fn), [47, 95]);
  assert.equal(math.decrypt([119, 11, 41, 35], fn), 'SAFE');
});
test('all letters and spaces round-trip with all campaign functions', () => {
  const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';
  for (const mission of missions) assert.equal(math.decrypt(math.encrypt(text.toLowerCase(), mission.fn), mission.fn), text);
  assert.equal(math.numberToChar(0), ' ');
  assert.equal(math.charToNumber(' '), 0);
  assert.equal(math.format([11, 5, 62]), '[11, 5, 62]');
});
test('malformed or impossible decryption is rejected', () => {
  for (const value of [-1, 27, 2.5, NaN]) assert.throws(() => math.numberToChar(value));
  assert.throws(() => math.encrypt('HI!', { a: 2, b: 3 }));
  assert.throws(() => math.decrypt([12], { a: 3, b: 2 }));
  assert.throws(() => math.decrypt([83], { a: 3, b: 2 }));
  assert.throws(() => math.inverse(5, { a: 0, b: 2 }));
});
test('score and rating are deterministic, and clamp at zero', () => {
  assert.equal(math.score(0, 0), 150);
  assert.equal(math.score(1, 0), 90);
  assert.equal(math.score(0, 1), 125);
  assert.equal(math.score(2, 2), 30);
  assert.equal(math.score(20, 20), 0);
  assert.equal(math.stars(0, 0), 3);
  assert.equal(math.stars(1, 0), 2);
  assert.equal(math.stars(2, 0), 1);
  assert.equal(math.stars(0, 1), 1);
});
test('every mission has valid, executable challenges', () => {
  assert.equal(missions.length, 6);
  for (const m of missions) {
    for (const s of m.stages) {
      if (s.kind === 'sequence') assert.equal(s.options.filter(option => math.same(option, math.encrypt(s.plain, m.fn))).length, 1);
      if (s.kind === 'composition') { const fn = math.compose(m.f, m.g); assert.equal(s.options.filter(option => option.a === fn.a && option.b === fn.b).length, 1); }
      if (s.kind === 'decode') assert.ok(/^[A-Z ]+$/.test(math.decrypt(s.cipher, m.fn)));
      if (s.kind === 'repair') assert.notEqual(math.encrypt(s.plain, m.fn)[s.corruptIndex], s.corruptValue);
    }
  }
});
