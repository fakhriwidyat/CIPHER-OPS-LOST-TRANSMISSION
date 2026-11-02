/* Feet-based collision and pathfinding for the Safehouse. No dependencies. */
(function (root) {
  'use strict';
  const ROOM = { minX: 96, maxX: 864, minY: 367, maxY: 489, radius: 8, speed: 130, cell: 8 };
  const OBJECTS = [
    { id: 'terminal', name: 'CENTRAL TERMINAL', verb: 'Buka soal matematika', x: 410, y: 420, face: 'up' },
    { id: 'map', name: 'DISTRICT MAP', verb: 'Pilih misi', x: 621, y: 382, face: 'up' },
    { id: 'archive', name: 'MESSAGE ARCHIVE', verb: 'Baca transmisi', x: 197, y: 383, face: 'up' },
    { id: 'aria', name: 'ARIA', verb: 'Ajak bicara', x: 651, y: 421, face: 'right' }
  ];
  const OBSTACLES = [
    { x: 270, y: 295, w: 235, h: 98 }, // Main computer desk, including its legs.
    { x: 143, y: 199, w: 90, h: 157 },
    { x: 750, y: 304, w: 79, h: 68 },
    { x: 798, y: 410, w: 59, h: 41 },
    { x: 99, y: 383, w: 47, h: 37 },
    { x: 686, y: 350, w: 26, h: 24 } // Aria's occupied floor space.
  ];
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function walkable(x, y) {
    return Number.isFinite(x) && Number.isFinite(y) && x >= ROOM.minX && x <= ROOM.maxX && y >= ROOM.minY && y <= ROOM.maxY && !OBSTACLES.some(o => x > o.x - ROOM.radius && x < o.x + o.w + ROOM.radius && y > o.y - ROOM.radius && y < o.y + o.h + ROOM.radius);
  }
  function clearLine(a, b) {
    const steps = Math.max(1, Math.ceil(distance(a, b) / 3));
    for (let i = 0; i <= steps; i++) if (!walkable(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps)) return false;
    return true;
  }
  const columns = Math.floor((ROOM.maxX - ROOM.minX) / ROOM.cell) + 1;
  const rows = Math.floor((ROOM.maxY - ROOM.minY) / ROOM.cell) + 1;
  const point = index => ({ x: ROOM.minX + index % columns * ROOM.cell, y: ROOM.minY + Math.floor(index / columns) * ROOM.cell });
  function closestCell(target) {
    let best = -1, bestDistance = Infinity;
    for (let i = 0; i < columns * rows; i++) {
      const p = point(i), d = distance(p, target);
      if (d < bestDistance && walkable(p.x, p.y)) { best = i; bestDistance = d; }
    }
    return best;
  }
  function findPath(start, destination) {
    if (!walkable(start.x, start.y) || !Number.isFinite(destination.x) || !Number.isFinite(destination.y)) return [];
    const startCell = closestCell(start), endCell = closestCell(destination);
    const end = walkable(destination.x, destination.y) ? destination : point(endCell);
    if (clearLine(start, end)) return [{ ...end }];
    const queue = [startCell], previous = new Map([[startCell, null]]);
    const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (let head = 0; head < queue.length && !previous.has(endCell); head++) {
      const index = queue[head], col = index % columns, row = Math.floor(index / columns);
      for (const [dx, dy] of offsets) {
        const nx = col + dx, ny = row + dy, next = ny * columns + nx;
        if (nx < 0 || nx >= columns || ny < 0 || ny >= rows || previous.has(next)) continue;
        if (!clearLine(point(index), point(next))) continue;
        previous.set(next, index); queue.push(next);
      }
    }
    if (!previous.has(endCell)) return [];
    const raw = []; for (let i = endCell; i !== null; i = previous.get(i)) raw.unshift(point(i));
    if (clearLine(raw[raw.length - 1], end)) raw.push({ ...end });
    // Remove grid zig-zags while retaining collision-safe corners.
    const smooth = []; let anchor = start, index = 0;
    while (index < raw.length) {
      let furthest = index;
      for (let j = index; j < raw.length; j++) if (clearLine(anchor, raw[j])) furthest = j;
      smooth.push(raw[furthest]); anchor = raw[furthest]; index = furthest + 1;
    }
    return smooth;
  }
  function createNavigator(initial = {}, onInteract = () => {}) {
    const state = { x: walkable(initial.x, initial.y) ? initial.x : 476, y: walkable(initial.x, initial.y) ? initial.y : 446, direction: initial.direction || 'down', moving: false, time: 0, gaitWeight: 0, path: [], destination: null, pending: null };
    let speed = 0;
    function nearest() { return OBJECTS.map(o => ({ ...o, distance: distance(state, o) })).filter(o => o.distance <= 53).sort((a, b) => a.distance - b.distance)[0] || null; }
    function stop() { state.path = []; state.destination = null; state.pending = null; state.moving = false; speed = 0; }
    function moveTo(target, objectId = null) {
      state.path = findPath(state, target); state.destination = state.path.length ? { ...state.path[state.path.length - 1] } : null; state.pending = state.path.length ? objectId : null;
      return state.path.length > 0;
    }
    function interact() {
      const object = nearest();
      if (!object) return false;
      stop(); state.direction = object.face; onInteract(object.id); return true;
    }
    function approach(id) {
      const object = OBJECTS.find(o => o.id === id); if (!object) return false;
      if (distance(state, object) <= 22) { stop(); state.direction = object.face; onInteract(id); return true; }
      return moveTo(object, id);
    }
    function step(seconds, input = {}) {
      const dt = Math.max(0, Math.min(.05, seconds));
      const vx = Number(input.x) || 0, vy = Number(input.y) || 0;
      let dx = 0, dy = 0;
      const wantsMovement = !!(vx || vy || state.path.length);
      speed += ((wantsMovement ? ROOM.speed : 0) - speed) * (1 - Math.exp(-dt / .045));
      if (vx || vy) {
        state.path = []; state.destination = null; state.pending = null;
        const norm = Math.hypot(vx, vy); dx = vx / norm * speed * dt; dy = vy / norm * speed * dt;
      } else if (state.path.length) {
        // Carry unused distance across corners instead of losing a frame at
        // every waypoint. Each segment still follows a collision-safe path.
        let travel = speed * dt, anchor = { x: state.x, y: state.y };
        while (state.path.length && travel > 0) {
          const target = state.path[0], d = distance(anchor, target);
          if (d <= travel) { anchor = { ...target }; travel -= d; state.path.shift(); }
          else { anchor.x += (target.x-anchor.x)/d*travel; anchor.y += (target.y-anchor.y)/d*travel; travel=0; }
        }
        dx = anchor.x-state.x; dy = anchor.y-state.y;
      }
      const before = { x: state.x, y: state.y };
      if (walkable(state.x + dx, state.y)) state.x += dx;
      if (walkable(state.x, state.y + dy)) state.y += dy;
      state.moving = distance(before, state) > .01;
      const travelled = distance(before,state);
      state.gaitWeight += ((state.moving ? 1 : 0)-state.gaitWeight)*(1-Math.exp(-dt/.065));
      if (state.moving) {
        state.time += travelled / ROOM.speed;
        // Keep the current facing near diagonal ties to avoid left/up flicker.
        if (Math.abs(dx)>Math.abs(dy)*1.15) state.direction=dx>0?'right':'left';
        else if (Math.abs(dy)>Math.abs(dx)*1.15) state.direction=dy>0?'down':'up';
        else if (!['left','right','up','down'].includes(state.direction) || (state.direction==='left'&&dx>=0)||(state.direction==='right'&&dx<=0)||(state.direction==='up'&&dy>=0)||(state.direction==='down'&&dy<=0)) state.direction=dx>0?'right':'left';
      }
      if (!state.path.length && state.destination) {
        const pending = state.pending, object = OBJECTS.find(o => o.id === pending);
        state.destination = null; state.pending = null; state.moving = false;
        if (object && distance(state, object) <= 22) { state.direction = object.face; onInteract(object.id); }
      }
      return state;
    }
    return { state, step, nearest, stop, moveTo, approach, interact };
  }
  function mount({ scene, canvas, initial, onInteract, onPose, onHint, isBlocked = () => false }) {
    const navigator = createNavigator(initial, onInteract), keys = new Set();
    let raf = 0, last = 0, paused = false, destroyed = false, lastNearby = '', lastDestination = false;
    const prompt = scene.querySelector('.world-interaction');
    const promptName = scene.querySelector('.interaction-name');
    const promptVerb = scene.querySelector('.interaction-verb');
    const keyNames = { w: 'up', ArrowUp: 'up', s: 'down', ArrowDown: 'down', a: 'left', ArrowLeft: 'left', d: 'right', ArrowRight: 'right' };
    function updateHUD() {
      const nearby = navigator.nearest(), id = nearby?.id || '';
      if (id !== lastNearby) {
        lastNearby = id;
        if (prompt) prompt.hidden = !nearby;
        if (nearby) { promptName.textContent = nearby.name; promptVerb.textContent = nearby.verb; }
        scene.querySelectorAll('.hotspot').forEach(button => button.classList.toggle('in-range', button.dataset.action === id));
      }
      if (lastDestination !== !!navigator.state.destination) { lastDestination = !!navigator.state.destination; scene.classList.toggle('runner-walking', lastDestination); }
      scene.dataset.runnerX = Math.round(navigator.state.x);
      scene.dataset.runnerY = Math.round(navigator.state.y);
      scene.dataset.runnerDirection = navigator.state.direction;
    }
    function frame(now) {
      if (destroyed || !scene.isConnected) return;
      const dt = last ? (now - last) / 1000 : 0; last = now;
      if (!paused && !isBlocked()) navigator.step(dt, { x: Number(keys.has('right')) - Number(keys.has('left')), y: Number(keys.has('down')) - Number(keys.has('up')) });
      if (destroyed) return;
      const width = canvas.clientWidth || 960, height = canvas.clientHeight || 540, verticalScale = height / 540;
      onPose({ ...navigator.state, visualTime: now/1000, scale: (width < 600 ? 70 : 110) / (48 * verticalScale), aspect: verticalScale / (width / 960) }); updateHUD();
      if (!destroyed) raf = requestAnimationFrame(frame);
    }
    function editable(target) { return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable; }
    function keyDown(event) {
      if (paused || isBlocked() || editable(event.target)) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (keyNames[key]) { event.preventDefault(); keys.add(keyNames[key]); }
      if (key === 'e' && !event.repeat) { event.preventDefault(); if (!navigator.interact()) onHint('Dekati terminal, peta, archive, atau Aria. Tekan E saat petunjuk interaksi muncul.'); }
    }
    function keyUp(event) { const key = event.key.length === 1 ? event.key.toLowerCase() : event.key; if (keyNames[key]) keys.delete(keyNames[key]); }
    function clearKeys() { keys.clear(); }
    function pointerDown(event) {
      if (paused || isBlocked() || event.button > 0) return;
      const direction = event.target.closest('[data-move]');
      if (direction) { event.preventDefault(); keys.add(direction.dataset.move); direction.setPointerCapture?.(event.pointerId); return; }
      if (event.target.closest('button, a, input, details, .scene-top, .hub-bottom')) return;
      const bounds = canvas.getBoundingClientRect();
      const target = { x: (event.clientX - bounds.left) / bounds.width * 960, y: (event.clientY - bounds.top) / bounds.height * 540 };
      if (target.y < 355 || target.y > 506) return;
      event.preventDefault(); keys.clear(); navigator.moveTo(target);
    }
    function pointerUp(event) { const direction = event.target.closest('[data-move]'); if (direction) keys.delete(direction.dataset.move); }
    document.addEventListener('keydown', keyDown); document.addEventListener('keyup', keyUp);
    window.addEventListener('blur', clearKeys);
    scene.addEventListener('pointerdown', pointerDown); scene.addEventListener('pointerup', pointerUp); scene.addEventListener('pointercancel', clearKeys);
    raf = requestAnimationFrame(frame); updateHUD();
    return {
      approach(id) { if (!paused && !isBlocked()) { keys.clear(); navigator.approach(id); } },
      interact() { if (!paused && !isBlocked()) navigator.interact(); },
      position() { return { x: navigator.state.x, y: navigator.state.y, direction: navigator.state.direction }; },
      pause() { paused = true; keys.clear(); navigator.stop(); }, resume() { paused = false; last = 0; },
      destroy() { destroyed = true; cancelAnimationFrame(raf); keys.clear(); document.removeEventListener('keydown', keyDown); document.removeEventListener('keyup', keyUp); window.removeEventListener('blur', clearKeys); scene.removeEventListener('pointerdown', pointerDown); scene.removeEventListener('pointerup', pointerUp); scene.removeEventListener('pointercancel', clearKeys); }
    };
  }
  const api = { ROOM, OBJECTS, OBSTACLES, walkable, clearLine, findPath, createNavigator, mount };
  root.Safehouse = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
