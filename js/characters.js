/* Hand-drawn 32 × 48 pixel characters. All poses are rendered locally. */
(function (root) {
  'use strict';
  const palettes = {
    runner: { outline: '#081321', hair: '#142238', hairLight: '#36485f', skin: '#dda98b', skinLight: '#f2c5a0', skinShade: '#956b65', cloth: '#284559', clothLight: '#52778a', clothShade: '#172d40', accent: '#70e8e4', accentDark: '#2a899a', pants: '#19283e', pantsLight: '#36485d', boots: '#0b1628', sole: '#6d8b98', metal: '#8faab4', warm: '#e7ad6b' },
    aria: { outline: '#101324', hair: '#392c4c', hairLight: '#a37194', skin: '#dda99c', skinLight: '#f3c8b1', skinShade: '#9e6f7b', cloth: '#b69a7c', clothLight: '#ead0a4', clothShade: '#796b69', accent: '#b9e9dd', accentDark: '#6aaeb0', pants: '#34324c', pantsLight: '#62536a', boots: '#171b30', sole: '#a58f99', metal: '#c1b8bd', warm: '#d69fc2' }
  };
  function draw(target, type, pose = {}) {
    const p = palettes[type] || palettes.runner;
    const scale = pose.scale || 1;
    const phase = pose.moving ? Math.floor((pose.time || 0) * 9) % 4 : 0;
    const stride = pose.moving ? [0, 2, 0, -2][phase] : 0;
    const bob = pose.moving ? phase % 2 : pose.reduced ? 0 : Math.floor((pose.time || 0) * 1.4) % 2;
    const direction = pose.direction || 'down';
    const side = direction === 'left' || direction === 'right';
    const back = direction === 'up';
    const blink = !pose.reduced && (pose.time || 0) % 5.1 > 4.96;
    target.save();
    target.imageSmoothingEnabled = false;
    target.translate(Math.round(pose.x || 0), Math.round(pose.y || 0));
    // Compensate for the room canvas on narrow displays so sprite pixels stay square.
    target.scale(scale * (pose.aspect || 1), scale);
    // A stepped contact shadow fixes the feet to the room's floor.
    target.fillStyle = '#060f1b55'; target.fillRect(-13, -2, 26, 3); target.fillRect(-9, -3, 18, 5);
    target.translate(-16, -48);
    if (direction === 'left') { target.translate(32, 0); target.scale(-1, 1); }
    const rect = (x, y, w, h, color) => { target.fillStyle = p[color] || color; target.fillRect(x, y, w, h); };
    function limb(x, shift) {
      rect(x, 33, 7, 10 + Math.max(0, shift), 'outline');
      rect(x + 1, 34, 5, 7 + Math.max(0, shift), 'pants');
      rect(x + 1, 35, 2, 5, 'pantsLight');
      rect(x - 1, 42 + shift, 9, 5, 'boots');
      rect(x, 43 + shift, 5, 2, 'pantsLight');
      rect(x - 1, 46 + shift, 9, 1, 'sole');
    }
    limb(side ? 12 : 8, stride);
    limb(side ? 17 : 18, -stride);
    target.save(); target.translate(0, -bob);
    // Shoulder line, split coat tails, reinforced seams, and equipment belt.
    rect(side ? 10 : 6, 20, side ? 15 : 21, 15, 'outline');
    rect(side ? 11 : 7, 20, side ? 13 : 19, 13, 'cloth');
    rect(side ? 12 : 8, 21, side ? 4 : 5, 10, 'clothLight');
    rect(side ? 22 : 22, 23, 3, 10, 'clothShade');
    rect(side ? 12 : 7, 31, side ? 12 : 19, 4, 'clothShade');
    rect(side ? 11 : 7, 34, side ? 13 : 8, 3, 'outline');
    if (!side) rect(18, 34, 8, 3, 'outline');
    rect(8, 32, 17, 2, 'pants'); rect(15, 32, 4, 2, 'metal');
    if (back) {
      rect(10, 21, 12, 11, 'outline'); rect(11, 22, 10, 9, 'clothShade');
      rect(12, 23, 8, 2, 'clothLight'); rect(14, 26, 4, 1, 'accentDark');
      rect(12, 29, 8, 1, 'metal');
    } else {
      rect(side ? 21 : 16, 21, 1, 10, 'metal');
      rect(side ? 15 : 19, 24, 5, 5, 'clothShade');
      rect(side ? 15 : 19, 24, 5, 1, 'clothLight');
      rect(side ? 14 : 10, 23, 3, 3, 'accentDark');
      rect(side ? 15 : 11, 23, 2, 1, 'accent');
      rect(side ? 15 : 10, 28, 3, 1, 'warm');
    }
    // Arms swing opposite the feet. Hands and gloves remain readable at world scale.
    function arm(x, offset, foreground) {
      rect(x, 21 + offset, 5, 11, 'outline'); rect(x + 1, 22 + offset, 3, 8, 'cloth');
      rect(x + 1, 22 + offset, 1, 6, 'clothLight'); rect(x + 1, 30 + offset, 3, 3, 'skinShade');
      rect(x, 32 + offset, 5, 3, 'boots');
      if (foreground) rect(x + 1, 28 + offset, 3, 1, 'accent');
    }
    if (!side) arm(4, -stride, false);
    arm(side ? 14 : 25, stride, true);
    if (pose.wave && !pose.reduced) {
      rect(side ? 16 : 26, 21, 4, 8, 'cloth'); rect(side ? 17 : 27, 16 + bob, 3, 6, 'skinLight');
    }
    // High collar, loose scarf tail, and a small radio clip.
    rect(side ? 12 : 8, 18, side ? 12 : 16, 4, 'outline');
    rect(side ? 13 : 9, 18, side ? 10 : 14, 2, 'accentDark');
    rect(side ? 16 : 10, 19, side ? 8 : 12, 2, 'accent');
    if (type !== 'aria') { rect(back ? 9 : side ? 9 : 8, 21, 3, 7, 'accentDark'); rect(back ? 10 : side ? 7 - stride : 7, 26, side ? 5 : 4, 2, 'accent'); }
    // Sculpted head, hair, brow, headset, and face lighting.
    rect(side ? 12 : 9, 5, side ? 13 : 15, 14, 'outline');
    rect(side ? 17 : 11, 9, side ? 8 : 11, 8, 'skinShade');
    rect(side ? 19 : 12, 10, side ? 7 : 10, 6, 'skin');
    rect(side ? 23 : 13, 11, side ? 4 : 8, 3, 'skinLight');
    rect(side ? 25 : 13, 16, side ? 3 : 7, 2, 'skin');
    if (side) { rect(26, 12, 2, 3, 'skin'); if (!back) rect(24, blink ? 13 : 12, 2, blink ? 1 : 2, 'outline'); }
    else if (!back) {
      rect(12, blink ? 13 : 12, 3, blink ? 1 : 2, 'outline'); rect(19, blink ? 13 : 12, 3, blink ? 1 : 2, 'outline');
      if (!blink) { rect(13, 12, 1, 1, '#e2f4ee'); rect(20, 12, 1, 1, '#e2f4ee'); }
      rect(16, 14, 1, 2, 'skinShade'); rect(15, 17, 4, 1, 'skinShade');
    }
    if (type === 'aria') {
      rect(side ? 9 : 7, 5, side ? 15 : 18, 7, 'hair'); rect(side ? 11 : 9, 3, side ? 12 : 14, 4, 'hair');
      rect(side ? 10 : 7, 10, 4, 11, 'hair'); rect(side ? 11 : 23, 10, 3, side ? 10 : 8, 'hair');
      rect(side ? 12 : 10, 5, 10, 2, 'hairLight'); rect(side ? 10 : 8, 10, 2, 9, 'hairLight');
      rect(side ? 17 : 12, 8, 6, 3, 'hair'); rect(side ? 21 : 18, 9, 3, 2, 'hairLight');
      if (back) { rect(10, 8, 13, 12, 'hair'); rect(11, 9, 2, 10, 'hairLight'); }
    } else {
      rect(side ? 11 : 8, 6, side ? 13 : 16, 5, 'hair'); rect(side ? 13 : 10, 4, side ? 10 : 13, 3, 'hair');
      rect(side ? 14 : 10, 5, side ? 9 : 12, 2, 'hairLight');
      rect(side ? 18 : 9, 9, side ? 7 : 7, 3, 'hair'); rect(side ? 11 : 8, 10, 3, 5, 'hair');
      if (back) { rect(9, 8, 15, 11, 'hair'); rect(10, 10, 2, 6, 'hairLight'); rect(13, 18, 7, 1, 'clothLight'); }
    }
    // Headset has a tiny cyan status light and a boom microphone.
    const ear = side ? 14 : back ? 22 : 9;
    rect(ear, 11, 4, 6, 'outline'); rect(ear + 1, 12, 2, 3, 'metal'); rect(ear + 1, 12, 1, 2, 'accent');
    if (!back) { rect(ear + 2, 16, 4, 1, 'metal'); rect(ear + 5, 15, 2, 2, 'outline'); }
    target.restore(); target.restore();
  }
  function portrait(type = 'aria', createCanvas) {
    const sheet = createCanvas(128, 144), p = sheet.getContext('2d');
    p.fillStyle = type === 'aria' ? '#30273e' : '#162d40'; p.fillRect(0, 0, 128, 144);
    p.fillStyle = '#6faeb111'; for (let y = 0; y < 144; y += 8) p.fillRect(0, y, 128, 1);
    p.fillStyle = '#8ecbc72a'; p.fillRect(11, 14, 1, 95); p.fillRect(11, 109, 85, 1);
    if (type === 'null') {
      p.fillStyle = '#111425'; p.fillRect(29, 35, 70, 109); p.fillRect(39, 21, 50, 20);
      p.fillStyle = '#302940'; p.fillRect(35, 40, 58, 66); p.fillStyle = '#090f1d'; p.fillRect(43, 46, 42, 43);
      p.fillStyle = '#b48acb'; p.fillRect(49, 62, 9, 3); p.fillRect(72, 62, 9, 3);
      p.fillStyle = '#75648d'; p.fillRect(44, 104, 39, 3); p.fillRect(59, 113, 3, 31);
    } else draw(p, type, { x: 64, y: 207, scale: 4.2, direction: 'down', reduced: true });
    return sheet.toDataURL();
  }
  const api = { draw, portrait, palettes };
  root.CharacterArt = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
