// A compact, original bitmap wordmark. No external font dependency.
const fs = require('node:fs');
const glyphs = {
  C: ['01111','11000','11000','11000','11000','11000','01111'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  P: ['11110','11011','11011','11110','11000','11000','11000'],
  H: ['11011','11011','11011','11111','11011','11011','11011'],
  E: ['11111','11000','11000','11110','11000','11000','11111'],
  R: ['11110','11011','11011','11110','11100','11010','11011'],
  O: ['01110','11011','11011','11011','11011','11011','01110'],
  S: ['01111','11000','11000','01110','00011','00011','11110']
};
let shapes = '';
['CIPHER','OPS'].forEach((word, row) => [...word].forEach((char, index) => glyphs[char].forEach((line, y) => [...line].forEach((v, x) => {
  if (v === '1') shapes += `<rect x="${index * 6 + x}" y="${row * 9 + y}" width="1" height="1"/>`;
}))));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 16" shape-rendering="crispEdges"><title>CIPHER OPS</title><g fill="#e0eee9">${shapes}</g><path d="M20 13h1v3h-1zm2-3h1v6h-1zm2 1h1v5h-1zm2-3h1v8h-1zm2 4h1v4h-1zm2-2h1v6h-1zm2 3h1v3h-1zm2-4h1v7h-1z" fill="#496a78"/></svg>`;
fs.writeFileSync(require('node:path').join(__dirname, '../assets/title.svg'), svg);
