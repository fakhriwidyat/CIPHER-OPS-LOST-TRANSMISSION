/* Original pixel environments: drawn locally at 960 × 540, never fetched. */
(function () {
  'use strict';
  const W = 960, H = 540;
  const P = { sky: '#0b1020', far: '#142039', mid: '#1b2c46', ink: '#0b1324', cyan: '#70e5eb', blue: '#31506e', pink: '#d77ca2', amber: '#ffbf69', green: '#6effa8' };
  let canvas, ctx, frame = 0, raf = 0, mode = 'city', reduced = false, restored = 0, interactive = false;
  let actor = { x: 476, y: 446, direction: 'down', moving: false, time: 0, scale: 1.85 };
  let callsign = 'RUNNER';
  let base = document.createElement('canvas'); base.width = W; base.height = H;
  let c = base.getContext('2d');
  let seed = 2149;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const r = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function line(points, color, width = 1) {
    c.strokeStyle = color; c.lineWidth = width; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
  }
  function text(label, x, y, color, size = 8) { c.fillStyle = color; c.font = `bold ${size}px monospace`; c.fillText(label, x, y); }
  function glow(x, y, radius, color) {
    const gradient = c.createRadialGradient(x, y, 0, x, y, radius); gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent'); c.fillStyle = gradient; c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  function windows(x, y, w, h, stepX, stepY, lit, color) {
    for (let bx = x + 5; bx < x + w - 5; bx += stepX) for (let by = y + 8; by < y + h - 4; by += stepY) {
      const chance = random(); r(bx, by, stepX < 9 ? 2 : 4, 2, chance < lit ? color : '#20334d');
      if (chance < lit * 0.2) r(bx, by + 3, 4, 1, '#577f8d');
    }
  }
  function building(x, y, w, h, layer) {
    const color = layer === 0 ? '#15223a' : layer === 1 ? '#1d304a' : '#122037';
    r(x, y, w, h, color); r(x, y, w, 2, layer === 0 ? '#24354f' : '#37516a');
    r(x + w - 5, y + 2, 5, h, '#101b30');
    const roof = 7 + Math.floor(random() * 15); r(x + 8, y - roof, w * 0.4, roof, color); r(x + 12, y - roof - 2, w * 0.28, 2, '#30445e');
    windows(x, y, w, h, layer === 0 ? 6 : 9, layer === 0 ? 8 : 12, layer === 0 ? 0.26 : 0.55, layer === 0 ? '#33516b' : random() < 0.65 ? '#7097a0' : '#b28a8e');
    if (w > 40) { r(x + w - 12, y + 5, 2, h - 8, '#243d55'); r(x + 3, y + h * 0.6, w - 8, 2, '#2c4159'); }
  }
  function people(target, time = 0, showPlayerLabel = false) {
    const nearAria = Math.hypot(actor.x - 697, actor.y - 365) < 110;
    const ariaDirection = nearAria ? actor.x < 697 ? 'left' : 'right' : 'down';
    if (mode !== 'riverside') CharacterArt.draw(target, 'aria', { x: 700, y: 369, scale: actor.scale * .93, aspect: actor.aspect, direction: ariaDirection, time, reduced, wave: interactive && nearAria && time % 6 < 1 });
    if (interactive && actor.destination) {
      const { x, y } = actor.destination;
      target.fillStyle = '#ffbf6999';
      target.fillRect(Math.round(x - 7), Math.round(y), 14, 1); target.fillRect(Math.round(x), Math.round(y - 4), 1, 9);
      target.fillStyle = '#ffbf6933'; target.fillRect(Math.round(x - 9), Math.round(y - 2), 18, 5);
    }
    if (showPlayerLabel) {
      target.strokeStyle = '#78dcd36e'; target.lineWidth = 1;
      target.strokeRect(Math.round(actor.x - 17), Math.round(actor.y - 3), 34, 5);
    }
    CharacterArt.draw(target, 'runner', { ...actor, time: actor.time, reduced });
    if (showPlayerLabel) {
      const y = Math.round(actor.y - 48 * actor.scale - 5);
      target.save(); target.translate(Math.round(actor.x), y); target.scale(actor.aspect || 1, 1);
      target.font = 'bold 7px monospace'; target.textAlign = 'center';
      const width = target.measureText(callsign).width + 10;
      target.fillStyle = '#0a1725dc'; target.fillRect(Math.round(-width / 2), -8, width, 12);
      target.fillStyle = '#95dacf'; target.fillText(callsign, 0, 0); target.restore();
    }
  }
  function city() {
    r(0, 0, W, H, '#111c31');
    const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0b1426'); sky.addColorStop(0.65, '#23354b'); sky.addColorStop(1, '#21384b'); c.fillStyle = sky; c.fillRect(0, 0, W, H);
    // A heavy cloud deck, cut into long pixel bands.
    for (let i = 0; i < 50; i++) { const x = random() * W, y = 30 + random() * 220; r(x, y, 30 + random() * 150, 2 + random() * 4, '#17253b'); }
    r(745, 50, 30, 2, '#607380'); r(752, 46, 16, 2, '#607380');
    for (let x = -10; x < W; x += 24 + random() * 12) { const h = 40 + random() * 90; building(x, 290 - h, 22 + random() * 25, h + 150, 0); }
    // Distant elevated rail line and concrete supports.
    r(0, 326, W, 5, '#22374a'); r(0, 331, W, 2, '#3b5061');
    for (let x = 40; x < W; x += 120) r(x, 333, 8, 90, '#182a3e');
    for (let x = 200; x < W; x += 48 + random() * 25) { const h = 95 + random() * 130; building(x, 390 - h, 40 + random() * 38, h + 70, 1); }
    // Far transmission mast.
    r(527, 119, 3, 133, '#4b6577'); r(518, 170, 23, 3, '#4b6577'); r(514, 186, 31, 2, '#4b6577'); r(527, 117, 3, 3, '#ea9bb5');
    // Hero tower, authored silhouette and glass face.
    r(690, 118, 86, 315, '#1a2c43'); r(696, 118, 74, 3, '#577a8a'); r(700, 108, 66, 10, '#233c51');
    r(706, 96, 54, 12, '#2b4356'); r(714, 83, 38, 13, '#304a60'); r(731, 41, 3, 45, '#627f8a'); r(730, 39, 5, 3, '#ffb5c0');
    r(692, 125, 5, 302, '#314e65'); r(771, 125, 5, 302, '#0d1c30');
    windows(702, 124, 61, 267, 8, 9, 0.62, restored > 0 ? '#88daca' : '#779aa6');
    r(735, 129, 5, 290, '#3d6878'); r(735, 160, 2, 75, '#99d7d8'); r(735, 264, 2, 108, '#82bdbf');
    r(682, 190, 19, 91, '#172337'); r(684, 192, 15, 87, '#ad637d'); r(687, 195, 9, 81, '#cc8499');
    ['N', 'O', 'V', 'A'].forEach((v, i) => text(v, 688, 212 + i * 18, '#342d42', 10));
    glow(693, 228, 55, '#d7819a22');
    r(692, 317, 84, 5, '#3d6074'); r(690, 323, 89, 3, '#132237');
    // Right-hand apartment block with exterior fire stairs.
    building(826, 223, 115, 255, 2); windows(831, 229, 103, 220, 13, 14, 0.6, '#7b8e9b');
    for (let j = 0; j < 10; j++) { r(821, 250 + j * 18, 17, 2, '#486176'); line([[823, 252 + j * 18], [836, 266 + j * 18]], '#4d6577'); }
    r(871, 191, 3, 34, '#506779'); r(864, 205, 19, 2, '#506779');
    // Rooftop service station; cyan doorway is the eye's destination.
    r(554, 374, 201, 94, '#17283b'); r(549, 369, 214, 6, '#466474'); r(551, 376, 209, 3, '#0c182a');
    r(571, 387, 55, 54, '#0a1727'); r(574, 390, 49, 47, '#224457'); r(577, 392, 43, 2, '#8adce0');
    for (let i = 0; i < 4; i++) { r(579, 401 + i * 8, 37, 2, '#385c6c'); r(579, 404 + i * 8, 25, 1, '#4b6e7b'); }
    r(664, 388, 34, 73, '#0b1627'); r(665, 389, 3, 71, '#8edbda'); r(665, 388, 33, 3, '#93e8e0'); r(694, 390, 3, 70, '#4c999f');
    r(669, 396, 23, 64, '#193340'); r(684, 431, 3, 2, '#b4e3d6'); glow(682, 418, 59, '#5effd614');
    r(706, 401, 33, 27, '#314a58'); r(709, 404, 27, 20, '#142a3b'); text('01', 713, 417, '#85c6c9', 8);
    r(585, 357, 43, 12, '#2a4054'); r(581, 352, 50, 5, '#57717c'); r(592, 343, 6, 9, '#324e61');
    // Antenna, railings, cables, air conditioners.
    r(737, 321, 3, 48, '#7d97a0'); line([[727, 335], [750, 335]], '#8aa4a8', 2); line([[720, 346], [756, 346]], '#6c8a94', 2);
    line([[740, 353], [787, 392], [834, 399], [960, 354]], '#0b1728', 2);
    for (let i = 0; i < 2; i++) { r(779 + i * 35, 423, 29, 27, '#344c5c'); r(782 + i * 35, 426, 23, 20, '#1a2e40'); for (let j = 0; j < 4; j++) r(784 + i * 35, 428 + j * 4, 19, 1, '#4f6772'); }
    // Foreground, with wet reflections rather than a flat ground plane.
    r(0, 467, W, 73, '#0c1728'); r(0, 467, W, 4, '#3e5868'); r(0, 471, W, 2, '#152a3d');
    for (let i = 0; i < 90; i++) { const x = random() * W, y = 475 + random() * 65; r(x, y, 3 + random() * 25, 1, random() < 0.15 ? '#397083' : '#1b3042'); }
    r(665, 474, 30, 2, '#61c4c077'); r(660, 482, 41, 1, '#61c4c044'); r(671, 491, 20, 1, '#61c4c033');
    // Big foreground architecture creates depth on the right.
    r(884, 394, 76, 146, '#0d192a'); r(880, 389, 80, 7, '#33495c'); r(893, 402, 6, 137, '#17283b');
    r(910, 418, 50, 33, '#1c2c3f'); r(914, 422, 46, 25, '#a67c77'); text('信 号', 921, 440, '#2b2b39', 13);
    // A small city train sits beneath the central skyline.
    r(388, 319, 54, 8, '#799ba2'); for (let i = 0; i < 5; i++) r(392 + i * 9, 321, 6, 3, '#e8d2ab');
    CharacterArt.draw(c, 'runner', { x: 660, y: 470, scale: 1.65, direction: 'left', reduced: true });
    if (restored > 0) { glow(735, 180, 100, '#66ffd416'); r(700, 119, 64, 2, '#8bdfd3'); }
    // Dark street-level foreground on the left is intentional space for title typography.
    r(0, 501, 185, 39, '#091322'); r(163, 488, 8, 52, '#172b3b'); r(160, 485, 15, 4, '#304b5a');
  }
  function monitor(x, y, w, h, color = P.cyan) {
    r(x - 3, y - 3, w + 6, h + 6, '#496277'); r(x - 1, y - 1, w + 2, h + 2, '#0a1525'); r(x, y, w, h, '#173c4c');
    for (let i = 0; i < Math.floor(h / 6); i++) r(x + 4, y + 4 + i * 5, 4 + random() * (w - 12), 1, color);
    r(x + w / 2 - 3, y + h + 3, 6, 6, '#496277'); r(x + w / 2 - 12, y + h + 9, 24, 2, '#496277');
  }
  function hub() {
    r(0, 0, W, H, '#0b1525');
    // Back walls and the angled floor make the room a place, not a menu grid.
    r(74, 72, 812, 288, '#1d3044'); r(74, 72, 812, 5, '#40576c'); r(74, 77, 9, 278, '#2d465d'); r(878, 77, 8, 278, '#112238');
    r(84, 94, 793, 12, '#14243a');
    for (let x = 102; x < 880; x += 44) { r(x, 111, 1, 237, '#2c4055'); r(x + 1, 111, 2, 237, '#17283c'); }
    c.fillStyle = '#1a2b3f'; c.beginPath(); c.moveTo(74, 353); c.lineTo(886, 353); c.lineTo(960, 540); c.lineTo(0, 540); c.fill();
    for (let y = 366; y < 540; y += 28) line([[0, y], [960, y]], '#263a50');
    for (let x = -500; x < 1500; x += 80) line([[480 + (x - 480) * 0.68, 354], [x, 540]], '#263a50');
    r(85, 346, 790, 8, '#3c5467'); r(85, 354, 790, 4, '#0d1d30');
    // Overhead pipes.
    line([[74, 125], [162, 125], [162, 96], [807, 96], [807, 304]], '#101e31', 11); line([[74, 122], [162, 122], [162, 93], [807, 93], [807, 301]], '#475c6b', 6);
    r(325, 100, 300, 7, '#101c2c'); r(340, 107, 270, 3, '#b9cbc3'); glow(470, 142, 150, '#7ee1d810');
    // The map wall and six districts.
    r(517, 145, 220, 130, '#3d5969'); r(521, 149, 212, 122, '#0d2336');
    for (let x = 526; x < 733; x += 12) r(x, 150, 1, 120, '#183a49');
    for (let y = 150; y < 271; y += 12) r(522, y, 210, 1, '#183a49');
    const nodes = [[548, 239], [584, 205], [624, 175], [623, 244], [671, 211], [707, 172]];
    nodes.forEach(([x, y], i) => { if (i) line([nodes[i - 1], [x, nodes[i - 1][1]], [x, y]], i <= restored ? '#6acdbd' : '#36515f', 2); r(x - 4, y - 4, 8, 8, i < restored ? '#6effa8' : i === restored ? P.amber : '#4f6a77'); });
    text('NOVARIS / DISTRICT NETWORK', 531, 164, '#9cc3c8', 7);
    // Main workstation, with many small but coherent details.
    r(278, 276, 218, 22, '#3c5768'); r(270, 295, 235, 12, '#536f7c'); r(279, 307, 218, 10, '#122438'); r(287, 317, 12, 74, '#2c4357'); r(475, 317, 12, 74, '#2c4357');
    monitor(300, 224, 78, 55); monitor(393, 232, 74, 46, '#91b9a7');
    r(334, 299, 70, 5, '#809a9d'); r(334, 299, 70, 2, '#253e51'); r(420, 299, 12, 4, '#aec2b6');
    r(311, 328, 58, 44, '#233c50'); for (let i = 0; i < 6; i++) r(319, 333 + i * 5, 40, 2, '#3f5f70'); r(357, 331, 3, 3, P.cyan);
    // Archive rack, its warm screen contrasts with the main terminal.
    r(143, 199, 90, 157, '#15263a'); r(141, 196, 94, 5, '#4a6172');
    for (let i = 0; i < 5; i++) { r(149, 205 + i * 28, 78, 23, '#2e4659'); r(155, 210 + i * 28, 46, 2, '#17283d'); r(155, 216 + i * 28, 46, 2, '#17283d'); r(215, 212 + i * 28, 4, 4, i % 2 ? '#95a4a4' : P.amber); }
    monitor(147, 162, 80, 29, '#d4b282');
    // Aria's station.
    r(750, 304, 79, 10, '#435d70'); r(756, 314, 9, 58, '#2b4356'); r(813, 314, 9, 58, '#2b4356'); monitor(762, 267, 57, 31, '#ce9fb9');
    // Loose cables and crates ground the room.
    line([[326, 372], [326, 413], [178, 413], [178, 359]], '#091728', 4); line([[475, 391], [520, 391], [520, 439], [786, 439], [786, 372]], '#091728', 4);
    r(798, 410, 59, 41, '#263e51'); r(798, 410, 59, 4, '#536a76'); r(803, 419, 49, 26, '#30495c'); r(818, 419, 4, 26, '#172b40');
    r(99, 383, 47, 37, '#263e51'); r(99, 383, 47, 4, '#536a76'); text('NO.04', 105, 406, '#7b929d', 7);
    // Foreground door frame.
    r(0, 0, 55, H, '#091222'); r(905, 0, 55, H, '#091222'); r(0, 0, W, 42, '#091222');
    for (let y = 98; y < 480; y += 72) { r(45, y, 9, 25, '#3c566a'); r(905, y, 9, 25, '#3c566a'); }
    text('S A F E H O U S E   /   B – 0 7', 370, 67, '#7796a6', 8);
    glow(360, 249, 97, '#56e4ff0d'); glow(629, 215, 108, '#56e4ff0b');
  }
  function map() {
    r(0, 0, W, H, '#0c1b2a');
    for (let x = 0; x < W; x += 20) r(x, 0, 1, H, '#142a3a');
    for (let y = 0; y < H; y += 20) r(0, y, W, 1, '#142a3a');
    // A schematic pixel city, cut by a meandering river.
    for (let i = 0; i < 190; i++) {
      const x = Math.floor(random() * 44) * 20 + 12, y = Math.floor(random() * 23) * 20 + 40;
      if (x > 440 && x < 530 + (y - 260) * 0.3) continue;
      r(x, y, 12 + Math.floor(random() * 3) * 8, 9 + Math.floor(random() * 2) * 9, '#1a3041'); r(x, y, 12, 1, '#29485a');
    }
    line([[470, 0], [470, 140], [500, 140], [500, 260], [540, 260], [540, 360], [580, 360], [580, 540]], '#163b4c', 28);
    line([[470, 0], [470, 140], [500, 140], [500, 260], [540, 260], [540, 360], [580, 360], [580, 540]], '#29566a', 1);
    const nodes = window.Cipher.missions;
    nodes.forEach((node, i) => {
      if (!i) return;
      const prev = nodes[i - 1], x = node.x / 100 * W, y = node.y / 100 * H, px = prev.x / 100 * W, py = prev.y / 100 * H;
      line([[px, py], [x, py], [x, y]], i <= restored ? '#73cbb9' : '#385061', 2);
    });
    text('N', 46, 88, '#728f9c', 11); line([[49, 100], [49, 122]], '#728f9c'); line([[43, 106], [49, 100], [55, 106]], '#728f9c');
    text('NOVARIS MUNICIPAL NETWORK', 40, 487, '#668694', 8); text('35° 41′ N / SECTOR 09', 40, 501, '#3d5b6e', 7);
  }
  function terminal() {
    hub();
    people(c);
    r(0, 0, W, H, '#080f1dcc');
    glow(480, 255, 360, '#22495538');
  }
  function riverside() {
    r(0, 0, W, H, '#0f1b2c');
    for (let x = 0; x < W; x += 46) { const height = 36 + random() * 110; building(x, 235 - height, 39, height, 0); }
    r(0, 236, W, 4, '#3b5867'); r(0, 240, W, 140, '#102e43');
    for (let i = 0; i < 125; i++) r(random() * W, 245 + random() * 128, 4 + random() * 53, 1 + random() * 3, i % 4 ? '#25455a' : '#40616d');
    r(58, 345, 846, 150, '#294254'); r(58, 345, 846, 4, '#688289'); r(58, 493, 846, 5, '#79918b');
    for (let y = 362; y < 492; y += 19) r(58, y, 846, 1, '#182e40');
    for (let x = 75; x < 902; x += 48) r(x, 345, 3, 10, '#9c8260');
    r(348, 300, 140, 91, '#0e1e2b'); r(350, 298, 134, 7, '#6f8c91');
    r(364, 311, 106, 53, '#395867'); r(369, 315, 96, 41, '#153344');
    for (let i = 0; i < 4; i++) r(378, 321 + i * 7, 63 - i * 8, 2, '#71ddd3');
    text('TERMINAL / 02', 369, 379, '#e5b37b', 9);
    r(544, 249, 198, 77, '#162e3e'); r(548, 253, 189, 69, '#233e4e');
    line([[564, 305], [607, 305], [607, 278], [676, 278], [676, 292], [721, 292]], '#72bbbd', 2);
    r(777, 384, 62, 54, '#354b55'); r(777, 384, 62, 5, '#76908c'); r(787, 398, 42, 22, '#243844');
    text('RIVERSIDE / QUAI 02', 104, 397, '#a4b9ba', 10);
  }
  function redraw() { seed = 2149; c.clearRect(0, 0, W, H); ({ city, hub, map, terminal, riverside, ending: city }[mode] || city)(); }
  function animate() {
    if (!canvas || !canvas.isConnected) return;
    ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, W, H); ctx.drawImage(base, 0, 0);
    if (mode === 'hub' || mode === 'riverside') people(ctx, reduced ? 0 : actor.visualTime ?? frame / 60, interactive);
    if ((mode === 'city' || mode === 'ending') && !reduced) {
      ctx.strokeStyle = '#91b5c125'; ctx.lineWidth = 1;
      for (let i = 0; i < 100; i++) { const x = (i * 97 + frame * 1.1) % W, y = (i * 67 + frame * 4) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 7); ctx.stroke(); }
      if (frame % 150 < 75) { ctx.fillStyle = '#e0a1b8'; ctx.fillRect(730, 39, 5, 2); }
    }
    if ((mode === 'hub' || mode === 'terminal') && !reduced && frame % 120 < 60) { ctx.fillStyle = '#6effa8'; ctx.fillRect(357, 331, 3, 3); }
    frame++; if ((!reduced || interactive) && !((mode === 'hub' || mode === 'riverside') && interactive)) raf = requestAnimationFrame(animate);
  }
  function mount(element, scene, options = {}) {
    cancelAnimationFrame(raf); canvas = element; if (!canvas) return;
    ctx = canvas.getContext('2d'); const density=Math.max(1,Math.min(2,(window.devicePixelRatio||1)*(canvas.clientWidth||W)/W)); canvas.width=Math.round(W*density);canvas.height=Math.round(H*density);ctx.setTransform(density,0,0,density,0,0); mode = scene; restored = options.restored || 0; reduced = !!options.reduced;
    interactive = !!options.interactive;
    const width = canvas.clientWidth || W, height = canvas.clientHeight || H, verticalScale = height / H;
    const fillRoom = !!canvas.closest('.hub-scene');
    actor = { x: 476, y: 446, direction: 'down', moving: false, time: 0, scale: fillRoom ? (width < 600 ? 70 : 110) / (48 * verticalScale) : 1.85, aspect: fillRoom ? verticalScale / (width / W) : 1, ...options.actor };
    callsign = options.callsign || 'RUNNER';
    redraw(); animate();
  }
  function portrait(type = 'aria') {
    return CharacterArt.portrait(type, (width, height) => { const sheet = document.createElement('canvas'); sheet.width = width; sheet.height = height; return sheet; });
  }
  // Navigation drives the interactive room's paint in the same animation frame;
  // a second independent RAF previously displayed the preceding movement pose.
  function setActor(pose) { actor = { ...actor, ...pose }; if ((mode === 'hub' || mode === 'riverside') && interactive && canvas?.isConnected) animate(); }
  window.PixelArt = { mount, portrait, setActor };
})();
