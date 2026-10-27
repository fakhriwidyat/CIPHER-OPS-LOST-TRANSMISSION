/* Hand-drawn 32 × 48 pixel characters. All poses are rendered locally. */
(function (root) {
  'use strict';
  const palettes = {
    runner: { outline: '#081321', hair: '#142238', hairLight: '#36485f', skin: '#dda98b', skinLight: '#f2c5a0', skinShade: '#956b65', cloth: '#284559', clothLight: '#52778a', clothShade: '#172d40', accent: '#70e8e4', accentDark: '#2a899a', pants: '#19283e', pantsLight: '#36485d', boots: '#0b1628', sole: '#6d8b98', metal: '#8faab4', warm: '#e7ad6b' },
    aria: { outline: '#101324', hair: '#392c4c', hairLight: '#a37194', skin: '#dda99c', skinLight: '#f3c8b1', skinShade: '#9e6f7b', cloth: '#b69a7c', clothLight: '#ead0a4', clothShade: '#796b69', accent: '#b9e9dd', accentDark: '#6aaeb0', pants: '#34324c', pantsLight: '#62536a', boots: '#171b30', sole: '#a58f99', metal: '#c1b8bd', warm: '#d69fc2' }
  };
  palettes.kai = { ...palettes.runner, hair: '#1b2940', hairLight: '#536279', cloth: '#29445b', clothLight: '#68849a', accent: '#5ee5fa' };
  palettes.nyx = { ...palettes.runner, hair: '#d1d1e1', hairLight: '#f4edff', skin: '#bd9caa', skinLight: '#e7c6c4', cloth: '#493761', clothLight: '#88719d', clothShade: '#292238', accent: '#c0a0ff', accentDark: '#765ca6', pants: '#242039', pantsLight: '#544564' };
  palettes.bolt = { ...palettes.runner, hair: '#522c26', hairLight: '#b16840', skin: '#a76c4e', skinLight: '#d89e6b', skinShade: '#754b3d', cloth: '#9b613d', clothLight: '#e1a263', clothShade: '#543f32', accent: '#ffd587', accentDark: '#98703f', pants: '#343c42', pantsLight: '#667678', metal: '#b5c4bf' };
  palettes.iris = { ...palettes.runner, hair: '#203c37', hairLight: '#648473', skin: '#b57d63', skinLight: '#e4b08a', skinShade: '#7e5c53', cloth: '#346354', clothLight: '#7ba78b', clothShade: '#1f3c39', accent: '#a9f0b6', accentDark: '#54856c', pants: '#263936', pantsLight: '#516963' };
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
    // Four operators have different silhouettes and equipment, beyond palette swaps.
    if (type === 'kai') {
      rect(11, 2, 8, 3, 'hair'); rect(17, 3, 7, 2, 'hairLight');
      rect(side ? 7 : 6, 20, 4, 11, 'accentDark'); rect(side ? 4 : 4, 28, 6 + (phase % 2), 3, 'accent');
      if (!back) { rect(20, 25, 4, 7, 'outline'); rect(21, 26, 2, 4, 'accentDark'); rect(22, 23, 1, 3, 'metal'); }
    }
    if (type === 'nyx') {
      rect(7, 5, 18, 13, 'clothShade'); rect(10, 2, 12, 4, 'cloth'); rect(8, 4, 16, 3, 'clothLight');
      rect(7, 15, 4, 8, 'cloth'); rect(23, 9, 3, 13, 'clothLight');
      if (!back) { rect(11, 8, 12, 10, 'skinShade'); rect(13, 9, 9, 8, 'skin'); rect(10, 7, 13, 3, 'hair'); rect(12, 8, 3, 4, 'hairLight'); rect(11, 12, 13, 3, 'outline'); rect(12, 12, 11, 2, 'accent'); rect(18, 12, 2, 1, '#f3ecff'); rect(16, 17, 4, 1, 'skinShade'); }
      rect(7, 28, 4, 10, 'clothShade'); rect(23, 29, 3, 9, 'cloth');
      if (!back) { rect(13, 24, 6, 7, 'outline'); rect(14, 25, 4, 4, 'accentDark'); rect(15, 26, 2, 1, 'accent'); }
    }
    if (type === 'bolt') {
      rect(4, 20, 24, 5, 'outline'); rect(5, 21, 22, 3, 'clothLight');
      rect(24, 23, 5, 12, 'metal'); rect(25, 24, 3, 5, 'pantsLight'); rect(25, 30, 4, 2, 'outline'); rect(25, 32, 4, 3, 'metal');
      rect(9, 6, 15, 3, 'clothShade'); rect(8, 8, 17, 2, 'outline');
      if (!back) { rect(10, 8, 6, 4, 'metal'); rect(18, 8, 6, 4, 'metal'); rect(11, 9, 4, 2, 'accentDark'); rect(19, 9, 4, 2, 'accent'); rect(14, 16, 7, 2, 'hair'); }
      rect(10, 23, 2, 9, 'accentDark'); rect(20, 23, 2, 9, 'accentDark');
      rect(5, 32, 4, 8, 'outline'); rect(6, 33, 2, 6, 'metal'); rect(4, 33, 5, 2, 'metal');
    }
    if (type === 'iris') {
      rect(back ? 20 : 24, 4, 5, 7, 'hair'); rect(back ? 22 : 26, 9, 4, 13, 'hair'); rect(back ? 23 : 27, 13, 2, 7, 'hairLight');
      rect(9, 3, 14, 4, 'clothShade'); rect(8, 6, 16, 2, 'clothLight'); rect(11, 4, 9, 1, 'accent');
      rect(5, 29, 4, 10, 'cloth'); rect(23, 30, 4, 9, 'clothShade');
      if (!back) { rect(9, 23, 14, 2, 'clothShade'); rect(18, 25, 2, 9, 'clothLight'); rect(24, 27, 7, 8, 'outline'); rect(25, 28, 5, 5, 'accentDark'); rect(26, 29, 3, 2, 'accent'); rect(29, 24, 1, 4, 'metal'); }
    }
    target.restore(); target.restore();
  }
  function portrait(type = 'aria', createCanvas) {
    const sheet = createCanvas(128, 144), p = sheet.getContext('2d');
    p.fillStyle = palettes[type]?.clothShade || (type === 'aria' ? '#30273e' : '#162d40'); p.fillRect(0, 0, 128, 144);
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
