/* District scene. A single navigation frame paints local and remote operators. */
(function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
  const act = (action, label, attrs = '') => `<button type="button" class="field-button" data-room-action="${action}" ${attrs}>${label}</button>`;
  const stationName = (map, n) => esc(map.objects[n].name);

  function markup(room) {
    return `<div class="field-layout">
      <section class="field-main" aria-label="Operasi distrik">
        <header class="field-brief"><div><p class="eyebrow text-cyan">${room.mode === 'training' ? 'PETA ' + (room.mission + 1) + '/2' : 'M' + String(room.mission + 1).padStart(2, '0')} / NOVARIS</p><h1>${esc(room.district)}</h1></div><p>${esc(room.field.goal)}</p></header>
        <div class="field-alert" role="status" hidden></div>
        <div class="field-map" aria-label="Peta distrik">
          <canvas class="field-canvas" width="960" height="540" aria-hidden="true"></canvas>
          ${room.field.map.objects.map((o, i) => act('field-walk', `<b>0${i + 1}</b> <span class="field-station-name">${esc(o.name)}</span>`, `data-station="${i}" style="--x:${o.x / 9.6}%;--y:${(o.y - 56) / 5.4}%"`)).join('')}
        </div>
        <div class="field-controls">
          <div class="field-dpad" aria-label="Kontrol gerak"><button type="button" data-move="up" aria-label="Atas">↑</button><button type="button" data-move="left" aria-label="Kiri">←</button><button type="button" data-move="down" aria-label="Bawah">↓</button><button type="button" data-move="right" aria-label="Kanan">→</button></div>
          <p>WASD / panah untuk bergerak. Klik lantai untuk berjalan atau pilih panel untuk mendekat.</p>
          ${act('field-interact', '<kbd>E</kbd> Buka panel terdekat')}
        </div>
        <p id="room-feedback" class="feedback" role="status" aria-live="polite"></p>
      </section>
      <aside class="field-ops" aria-label="Tugas dan radio">
        <header><p class="eyebrow">PETA & TUGAS</p><strong id="field-progress"></strong><progress aria-label="Progres pekerjaan tim"></progress>${room.mode === 'training' ? '<span id="field-score" class="field-score"></span>' : ''}</header>
        <div id="field-jobs"></div>
        <section class="field-radio"><p class="eyebrow">RADIO TIM / ${esc(room.code)}</p>
          <label class="sr-only" for="field-ping-station">Lokasi ping</label><select id="field-ping-station">${room.field.map.objects.map((o, i) => `<option value="${i}">${esc(o.name)}</option>`).join('')}</select>
          <div class="field-pings">${act('field-ping', 'Butuh bantuan', 'data-ping="help"')}${act('field-ping', 'Panel siap', 'data-ping="ready"')}${act('field-ping', 'Menuju lokasi', 'data-ping="go"')}</div>
          <ol id="field-log"></ol>
        </section>
        <details class="field-crew"><summary>Operator & undangan</summary><div id="field-crew-list"></div>${act('copy', 'Salin undangan')}<span id="field-host-tools"></span></details>
      </aside>
      <dialog class="field-panel" aria-labelledby="field-panel-title"><div class="field-panel-head"><div><p class="eyebrow text-cyan">PANEL DISTRIK</p><h2 id="field-panel-title"></h2></div>${act('field-close', 'Tutup ×')}</div><div id="field-panel-body"></div><p id="field-panel-feedback" class="feedback" role="status" aria-live="polite"></p></dialog>
    </div>`;
  }

  function paintMap(ctx, field, mission) {
    const map = field.map, [dark, light, ink] = map.palette;
    const box = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
    box(0, 0, 960, 540, '#0a131e');
    box(24, 42, 912, 459, '#47616d'); box(29, 49, 902, 444, dark);
    [[40, 70, 442, 168], [533, 70, 384, 170], [40, 277, 483, 197], [628, 335, 287, 141]].forEach(([x, y, w, h]) => {
      box(x, y, w, h, light); box(x + 4, y + 4, w - 8, h - 8, dark);
    });
    for (let x = 36; x < 930; x += 24) box(x, 58, 1, 431, '#7892a216');
    for (let y = 58; y < 489; y += 24) box(36, y, 888, 1, '#7892a216');
    box(31, 491, 899, 4, '#050b15');
    ctx.font = '12px monospace'; ctx.fillStyle = ink;
    ctx.fillText(map.base.toUpperCase() + ' / NOVARIS', 48, 31);
    ctx.textAlign = 'right'; ctx.fillText('SEKTOR ' + (mission + 1) + ' / ' + String(field.completed).padStart(2, '0') + ' PANEL', 913, 31); ctx.textAlign = 'left';
    box(54, 407, 147, 52, '#8cbaac1a'); box(54, 456, 147, 3, '#8cbaac4d');
    ctx.fillStyle = '#91b0ae'; ctx.fillText('POS AWAL', 64, 450);
    // Each district uses the same readable corridors with distinct equipment and signals.
    for (const [i, o] of map.obstacles.entries()) {
      box(o.x + 4, o.y + 8, o.w, o.h, '#080e1b8c');
      box(o.x, o.y, o.w, o.h, i < 4 ? '#293f51' : light);
      box(o.x, o.y, o.w, 3, '#688698');
      if (i === 4) for (let j = 0; j < o.w - 14; j += 13) box(o.x + 7 + j, o.y + 9, 6, o.h - 17, ink + '62');
    }
    for (const gate of map.gates) {
      if (!gate.open) for (let x = gate.x + 5; x < gate.x + gate.w - 5; x += 10) box(x, gate.y + 6, 4, 5, '#eda162');
      else { box(gate.x, gate.y + 2, gate.w, 2, ink); box(gate.x, gate.y + gate.h - 2, gate.w, 2, ink); }
    }
    for (const [i, object] of map.objects.entries()) {
      const { x, y } = object, options = field.work[i];
      const offline = options.some(t => t.state === 'gangguan');
      const ready = options.some(t => t.state === 'siap'), complete = options.every(t => t.state === 'selesai');
      const status = offline ? '#eea36f' : ready ? ink : complete ? '#82cb9b' : '#607b93';
      box(x - 25, y - 10, 50, 18, '#070e19a3'); box(x - 18, y - 29, 36, 30, '#324959');
      box(x - 22, y - 39, 44, 21, '#577183'); box(x - 19, y - 36, 38, 14, '#0d1928');
      box(x - 15, y - 33, 26, 2, status); box(x - 15, y - 27, 16, 2, status);
      box(x + 7, y - 8, 5, 3, status); box(x - 24, y + 11, 48, 2, status);
    }
  }

  function mount(game, room, { send, status, sound }) {
    const root = game.querySelector('.field-layout'), scene = root.querySelector('.field-map'), canvas = scene.querySelector('canvas');
    const dialog = root.querySelector('dialog'), body = root.querySelector('#field-panel-body');
    const ctx = canvas.getContext('2d'), terrain = document.createElement('canvas');
    const bg = terrain.getContext('2d');
    const layout = { ...room.field.map, obstacles: [...room.field.map.obstacles] };
    const actors = new Map();
    const reduce = () => document.body.classList.contains('reduce-motion');
    let state = room, history = [], seq = room.field.poses.find(p => p.id === room.you).seq;
    let sampled = null, sampleTime = -Infinity, lastFrame = 0, panelKey = '', mapKey = '';
    const set = (sel, value) => { const el = root.querySelector(sel); if (el && el.innerHTML !== value) el.innerHTML = value; };
    const findPose = () => state.field.poses.find(p => p.id === state.you);
    const buttons = [...scene.querySelectorAll('[data-station]')];

    function size() {
      const scale = clamp((window.devicePixelRatio || 1) * scene.clientWidth / 960, 1, 2);
      canvas.width = terrain.width = Math.round(960 * scale);
      canvas.height = terrain.height = Math.round(540 * scale);
      for (const context of [ctx, bg]) { context.setTransform(scale, 0, 0, scale, 0, 0); context.imageSmoothingEnabled = false; }
      paintMap(bg, state.field, state.mission);
    }
    function sample(pose, now, force) {
      if (!force && now - sampleTime < 70) return;
      const previous = sampled || findPose();
      if (Math.hypot(pose.x - previous.x, pose.y - previous.y) < 0.15 &&
        pose.direction === previous.direction && !!pose.moving === !!previous.moving) return;
      if (history.length >= 80) return;
      sampleTime = now;
      sampled = { x: pose.x, y: pose.y, direction: pose.direction, moving: !!pose.moving, seq: ++seq };
      history.push(sampled);
    }
    function frame(pose) {
      const now = performance.now(), dt = clamp((now - lastFrame) / 1000, 0, .05);
      lastFrame = now; sample(pose, now, false);
      ctx.drawImage(terrain, 0, 0, 960, 540);
      const reduced = reduce(), width = canvas.clientWidth, height = canvas.clientHeight;
      const aspect = width && height ? (height / 540) / (width / 960) : 1;
      const scale = width < 500 ? 1.66 : 1.28;
      const poses = [{ ...pose, player: state.players.find(p => p.id === state.you) }];
      for (const actor of actors.values()) {
        const dx = actor.to.x - actor.x, dy = actor.to.y - actor.y;
        const mix = reduced ? 1 : 1 - Math.exp(-dt / .14);
        const distance = Math.hypot(dx, dy) * mix;
        actor.x += dx * mix; actor.y += dy * mix; actor.time += distance / layout.bounds.speed;
        actor.gaitWeight += ((distance > .15 ? 1 : 0) - actor.gaitWeight) * (1 - Math.exp(-dt / .09));
        poses.push({ ...actor, direction: actor.to.direction, moving: actor.gaitWeight > .1 });
      }
      for (const p of poses.sort((a, b) => a.y - b.y || Number(a.player.id === state.you) - Number(b.player.id === state.you))) {
        const own = p.player.id === state.you;
        ctx.fillStyle = own ? '#80ecd67a' : '#0a101bac';
        ctx.fillRect(p.x - 12, p.y - 3, 24, 5);
        CharacterArt.draw(ctx, p.player.role, { ...p, scale, aspect, reduced });
        ctx.save(); ctx.translate(p.x, p.y - (35 * scale + 16)); ctx.scale(clamp(aspect, .85, 2), 1);
        ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
        const width = ctx.measureText(p.player.name).width + 10;
        ctx.fillStyle = '#0b1626e6'; ctx.fillRect(-width / 2, -12, width, 17);
        ctx.fillStyle = own ? '#c1fff0' : '#d6dfef'; ctx.fillText(p.player.name, 0, 0); ctx.restore();
      }
      for (const [i, el] of buttons.entries()) {
        const o = layout.objects[i];
        el.classList.toggle('field-near', Math.hypot(o.x - pose.x, o.y - pose.y) <= 53);
      }
      if (pose.moving && !reduced) window.CipherAudio?.movement(pose);
    }
    const motion = Safehouse.mount({ scene: root, canvas, layout, initial: findPose(),
      onInteract: id => { sound('confirm'); send('field-open', { station: Number(id) }); }, onPose: frame,
      onHint: status, isBlocked: () => dialog.open || !!document.getElementById('modal')?.open
    });
    const resize = new ResizeObserver(size);
    resize.observe(scene); size();
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('keydown', event => { if (event.key === 'Escape') event.stopPropagation(); });
    function close() {
      return send('field-close');
    }
    function panel(field, busy, online) {
      const open = field.panel;
      if (!open) {
        if (dialog.open) dialog.close();
        panelKey = '';
        return;
      }
      dialog.querySelector('[data-room-action="field-close"]').disabled = busy;
      const jobs = field.work[open.station], puzzle = open.puzzle;
      const key = puzzle ? open.station + ':' + open.id : open.station + ':' + jobs.map(t => t.id + t.state).join(',');
      if (!dialog.open) {
        motion.pause(); motion.resume(); dialog.showModal();
        root.querySelector('#field-ping-station').value = open.station;
        window.CipherAudio?.setScene('puzzle');
      }
      if (key !== panelKey) {
        panelKey = key;
        set('#field-panel-title', stationName(field.map, open.station));
        set('#field-panel-feedback', '');
        body.innerHTML = puzzle ? `${puzzle.topic ? `<p class="eyebrow text-cyan">${esc(puzzle.topic)}</p>` : ''}<h3>${esc(puzzle.title)}</h3><p>${esc(puzzle.brief)}</p>
          ${puzzle.lines.length ? `<ul class="field-data">${puzzle.lines.map(line => `<li>${esc(line)}</li>`).join('')}</ul>` : ''}
          <form id="field-answer" data-station="${open.station}" data-task="${esc(open.id)}">
          ${puzzle.options ? `<fieldset><legend>Pilih jawaban</legend>${puzzle.options.map(value => `<label><input type="radio" name="answer" value="${esc(value)}" required> <span>${esc(value)}</span></label>`).join('')}</fieldset>` : `<label class="field-answer-input">${esc(puzzle.format)}<input class="text-input" name="answer" maxlength="100" required autocomplete="off" ${puzzle.format === 'Bilangan bulat' ? 'inputmode="numeric"' : ''}></label>`}
          ${puzzle.packetSource ? `<label class="field-answer-input">Nomor paket dari ${esc(puzzle.packetSource)}<input class="text-input" name="packet" inputmode="numeric" pattern="[1-9]" maxlength="1" required autocomplete="off"></label>` : ''}
          ${puzzle.packetSource || open.id === 'final' ? '<details class="field-panel-packets"><summary>Lihat paket yang sudah dibagikan tim</summary><ul id="field-panel-packets"></ul></details>' : ''}
          <div class="field-panel-actions"><button class="button primary" type="submit">VERIFIKASI →</button>${act('field-hint', 'Petunjuk / −25 poin')}${act('field-panel-back', 'Daftar tugas')}</div>
          </form><p class="field-hint" id="field-hint"></p>` : `<p>Pilih pekerjaan yang sudah terbuka di panel ini.</p><ul class="field-panel-list">${jobs.map(t => `<li>${act('field-task', esc(t.title), `data-task="${esc(t.id)}" ${t.state !== 'siap' ? 'disabled' : ''}`)}<small>${t.packet ? 'Paket ' + t.packet : esc(t.clue || t.state)}</small></li>`).join('')}</ul>`;
      }
      set('#field-panel-packets', field.work.flatMap((jobs, i) => jobs.filter(t => t.packet).map(t => `<li>${['KAI', 'NYX', 'BOLT', 'IRIS'][i]} / ${stationName(field.map, i)} · ${t.packet}</li>`)).join(''));
      set('#field-hint', puzzle?.hint ? 'ARIA · ' + esc(puzzle.hint) : '');
      const submit = body.querySelector('[type=submit]');
      if (submit) submit.disabled = busy || !online;
      const hint = body.querySelector('[data-room-action="field-hint"]');
      if (hint) hint.disabled = busy || !online || !!puzzle.hint;
    }
    function update(next, busy, online) {
      state = next;
      const field = state.field, own = findPose();
      const acknowledged = history.find(p => p.seq === own.seq);
      if (acknowledged && Math.hypot(acknowledged.x - own.x, acknowledged.y - own.y) > .5) {
        history = []; sampled = own; motion.reposition(own);
      }
      seq = Math.max(seq, own.seq);
      history = history.filter(p => p.seq > own.seq);
      const ids = new Set();
      for (const to of field.poses) {
        const player = state.players.find(p => p.id === to.id);
        if (to.id === state.you || !player?.connected) continue;
        ids.add(to.id);
        const actor = actors.get(to.id) || { x: to.x, y: to.y, time: 0, gaitWeight: 0 };
        Object.assign(actor, { to, player }); actors.set(to.id, actor);
      }
      for (const id of actors.keys()) if (!ids.has(id)) actors.delete(id);
      const key = JSON.stringify([field.work.map(tasks => tasks.map(t => t.state)), field.map.gates, field.fault.resolved, field.completed]);
      if (key !== mapKey) {
        mapKey = key;
        layout.obstacles.splice(0, layout.obstacles.length, ...field.map.obstacles);
        paintMap(bg, field, state.mission);
      }
      for (const [i, el] of buttons.entries()) {
        const available = field.work[i].some(t => t.state === 'siap');
        el.classList.toggle('field-ready', available);
        el.classList.toggle('field-out', field.work[i].some(t => t.state === 'gangguan'));
      }
      const alert = root.querySelector('.field-alert'), f = field.fault;
      const waiting = state.players.filter(p => p.connected).length < 2;
      alert.hidden = !waiting && !f.active;
      alert.classList.toggle('resolved', !waiting && !!f.resolved);
      const notice = waiting ? 'Tim menunggu satu operator lagi untuk memverifikasi tugas. Kamu masih bisa menjelajahi peta.' :
        f.resolved ? (f.resolved === 'repair' ? 'Gangguan teratasi · Perbaikan selesai.' : 'Gangguan teratasi · Sinyal lewat jalur cadangan.') :
        `${f.title}. Perbaiki di ${field.map.objects[f.repair].name} atau alihkan lewat ${field.map.objects[f.bypass].name}.`;
      if (alert.textContent !== notice) alert.textContent = notice;
      set('#field-progress', field.finalReady ? 'Pemancar siap diaktifkan' : `${field.completed} / ${field.total} pekerjaan selesai`);
      set('#field-score', `${state.total}/300 poin tim · ${state.potential}/150 potensi peta ini`);
      const progress = root.querySelector('progress');
      progress.max = field.total; progress.value = field.completed;
      set('#field-jobs', field.work.map((jobs, i) => `<section class="field-job-group"><h3>${act('field-walk', `<b>0${i + 1}</b> ${stationName(field.map, i)}`, `data-station="${i}"`)}</h3><ul>${jobs.map(t => {
        const owner = state.players.find(p => p.id === t.owner), own = owner?.id === state.you;
        return `<li class="${t.state === 'selesai' ? 'field-done' : t.state === 'siap' ? 'field-open' : ''}"><span>${t.topic ? '<b>' + esc(t.topic) + ' · </b>' : ''}${esc(t.title)}${own ? ' <b>· Kamu</b>' : ''}</span><small>${t.packet ? 'PAKET ' + t.packet : esc(t.state)}${owner && !own ? ' · ' + esc(owner.name) : ''}</small></li>`;
      }).join('')}</ul></section>`).join(''));
      set('#field-log', state.events.slice(-7).reverse().map(event => `<li>${esc(event.text)}</li>`).join(''));
      set('#field-crew-list', state.players.map(p => `<div class="field-operator"><span>${esc(p.name)} · ${esc(p.role.toUpperCase())} ${p.connected ? '' : '· TERPUTUS'}</span>${state.you === state.hostId && !p.connected ? act('remove', 'Keluarkan', `data-player-id="${esc(p.id)}"`) : ''}</div>`).join(''));
      set('#field-host-tools', state.you === state.hostId ? act('resetLobby', 'Buka lobi baru') : '');
      const wasOpen = dialog.open;
      panel(field, busy, online && !waiting);
      if (wasOpen && !dialog.open) window.CipherAudio?.setScene('hub');
    }
    return {
      update,
      pose() {
        const position = motion.position();
        sample({ ...position, moving: sampled?.moving }, performance.now(), true);
        if (!history.length) return;
        const points = history.slice(0, 18).map(({ x, y, seq }) => ({ x, y, seq }));
        return { direction: sampled.direction, moving: sampled.moving, points };
      },
      action(el) {
        const action = el.dataset.roomAction, open = state.field.panel;
        if (action === 'field-walk') return motion.approach(el.dataset.station);
        if (action === 'field-interact') return motion.interact();
        if (action === 'field-close') return close();
        if (action === 'field-ping') return send(action, { station: Number(root.querySelector('#field-ping-station').value), ping: el.dataset.ping });
        if (action === 'field-panel-back') return send('field-open', { station: open.station });
        if (action === 'field-task') return send('field-open', { station: open.station, taskId: el.dataset.task });
        if (action === 'field-hint') return send(action, { station: open.station, taskId: open.id });
      },
      answer(form) {
        const values = new FormData(form);
        return send('field-answer', { station: Number(form.dataset.station), taskId: form.dataset.task, answer: values.get('answer'), packet: values.get('packet') });
      },
      destroy() { resize.disconnect(); motion.destroy(); if (dialog.open) dialog.close(); }
    };
  }
  window.CipherField = { markup, mount };
})();
