// Development helper: expand the compact stylesheet without changing its rules.
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '../css/style.css');
const source = fs.readFileSync(file, 'utf8');
let output = '', buffer = '', indent = 0, quote = '', parentheses = 0;
function flush() {
  if (buffer.trim()) output += '  '.repeat(indent) + buffer.trim() + '\n';
  buffer = '';
}
for (let index = 0; index < source.length; index++) {
  const char = source[index];
  if (quote) {
    buffer += char;
    if (char === '\\') buffer += source[++index] || '';
    else if (char === quote) quote = '';
    continue;
  }
  if (char === '"' || char === "'") { quote = char; buffer += char; continue; }
  if (char === '/' && source[index + 1] === '*') {
    flush(); const end = source.indexOf('*/', index + 2);
    buffer = source.slice(index, end + 2); flush(); index = end + 1; continue;
  }
  if (char === '(') parentheses++;
  if (char === ')') parentheses--;
  if (!parentheses && char === '{') { buffer = buffer.trim().replace(/:\s+/g, ':') + ' {'; flush(); indent++; }
  else if (!parentheses && char === '}') { flush(); indent--; buffer = '}'; flush(); if (indent === 0) output += '\n'; }
  else if (!parentheses && char === ';') { buffer += ';'; flush(); }
  else if (char === '\n' || char === '\r') buffer += ' ';
  else buffer += char;
}
flush();
fs.writeFileSync(file, output);
