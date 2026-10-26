// Optional art contact sheet; takes a local @napi-rs/canvas module path for QA.
const fs = require('node:fs');
const path = require('node:path');
const { createCanvas } = require(process.argv[2] || '@napi-rs/canvas');
const art = require('../js/characters.js');
const canvas = createCanvas(880, 530), ctx = canvas.getContext('2d');
ctx.fillStyle = '#0b1423'; ctx.fillRect(0, 0, 880, 530);
ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#8bb7c0';
ctx.fillText('CIPHER OPS / CHARACTER STUDY', 28, 28);
['runner', 'aria'].forEach((type, row) => {
  ctx.fillStyle = '#c1d9d7'; ctx.fillText(type.toUpperCase(), 28, 66 + row * 230);
  ['down', 'right', 'up', 'left'].forEach((direction, col) => {
    const x = 80 + col * 150, y = 243 + row * 230;
    art.draw(ctx, type, { x, y, scale: 3.3, direction, reduced: true });
    ctx.fillStyle = '#6f94a7'; ctx.fillText(direction.toUpperCase(), x - 23, y + 24);
  });
});
fs.mkdirSync(path.join(__dirname, '../previews'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../previews/characters.png'), canvas.toBuffer('image/png'));
