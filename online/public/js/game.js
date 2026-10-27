(function () {
  'use strict';
  const { math, missions, intro, VERSION, SAVE_KEY, SETTINGS_KEY } = window.Cipher;
  const game = document.querySelector('#game');
  const modal = document.querySelector('#modal');
  const toastElement = document.querySelector('#toast');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const icons = {
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H5m6-6-6 6 6 6"/></svg>',
    coop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h6v6H3zm12 0h6v6h-6zM1 19v-5h10v5m2 0v-5h10v5"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6v3h3v3h3v6h-3v3h-3v3H9v-3H6v-3H3V9h3V6h3zM9 9v6h6V9z"/></svg>',
    hint: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 17v-3L5 9V5h3V2h8v3h3v4l-3 5v3zm1 3h6M9 10h6m-3-4v8"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13l6 6L21 6"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3zm13-2c4 3 4 7 0 10m3-13c6 5 6 11 0 16"/></svg>',
    muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3zm13 0 6 6m0-6-6 6"/></svg>',
    heart: '<svg viewBox="0 0 16 16" class="heart" aria-hidden="true"><path d="M2 2h4v2h4V2h4v2h2v6h-2v2h-2v2h-2v2H6v-2H4v-2H2v-2H0V4h2z"/></svg>'
  };
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const action = (name, label, className = 'button', extra = '') => `<button type="button" class="${className}" data-action="${name}" ${extra}>${label}</button>`;
  const corners = '<i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>';
  let settings = { sound: true, volume: 55, musicVolume: 36, ambienceVolume: 58, effectsVolume: 75, reducedMotion: motionQuery.matches };
  let campaign = null, run = null, coop = null, screen = 'menu', introIndex = 0, selectedMission = 0;
  let dialogueState = null, toastTimer, sceneTimer, lastFocus, saveWarningShown = false, currentArt = 'city';
  let hubController = null, hubPosition = { x: 476, y: 446, direction: 'down' };

  function storageRead(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; } }
  function storageWrite(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { if (!saveWarningShown) { saveWarningShown = true; toast('Penyimpanan browser tidak tersedia. Game tetap bisa dimainkan dalam sesi ini.'); } return false; }
  }
  const validCallsign = value => /^[A-Za-z0-9 _-]{1,16}$/.test(value);
  const validIndex = value => Number.isInteger(value) && value >= 0 && value < missions.length;
  const validRun = value => value && validIndex(value.mission) && Number.isInteger(value.stage) && value.stage >= 0 && value.stage < missions[value.mission].stages.length && Number.isInteger(value.health) && value.health > 0 && value.health <= 3 && Number.isInteger(value.errors) && value.errors >= 0 && value.errors === 3 - value.health && Number.isInteger(value.hints) && value.hints >= 0 && value.hints <= missions[value.mission].stages.length && Number.isInteger(value.penaltyHints) && value.penaltyHints >= 0 && value.penaltyHints <= value.hints && Array.isArray(value.hintedStages) && value.hintedStages.length === value.hints && value.hintedStages.every(s => Number.isInteger(s) && s >= 0 && s <= value.stage);
  function load() {
    const preferences = storageRead(SETTINGS_KEY);
    if (preferences && typeof preferences === 'object') {
      if (typeof preferences.sound === 'boolean') settings.sound = preferences.sound;
      if (typeof preferences.reducedMotion === 'boolean') settings.reducedMotion = preferences.reducedMotion;
      for (const key of ['volume', 'musicVolume', 'ambienceVolume', 'effectsVolume']) if (Number.isFinite(preferences[key])) settings[key] = Math.max(0, Math.min(100, Math.round(preferences[key])));
    }
    const saved = storageRead(SAVE_KEY);
    if (!saved || saved.version !== VERSION || !validCallsign(saved.callsign) || !Array.isArray(saved.completed) || !saved.completed.every(validIndex)) return;
    const complete = [...new Set(saved.completed)].sort((a, b) => a - b);
    // Campaign progression is contiguous. Broken or outdated saves cannot unlock the Core.
    if (complete.some((id, index) => id !== index) || !saved.records || typeof saved.records !== 'object') return;
    const records = {};
    for (const id of complete) {
      const record = saved.records[id];
      if (!record || !Number.isInteger(record.score) || record.score < 0 || record.score > 150 || !Number.isInteger(record.stars) || record.stars < 1 || record.stars > 3) return;
      records[id] = { score: record.score, stars: record.stars };
    }
    const allowedClues = ['log', ...missions.map(m => m.clue.id)];
    const flags = saved.flags && typeof saved.flags === 'object' ? saved.flags : {};
    let active = null;
    if (validRun(saved.active) && saved.active.mission <= complete.length) {
      const a = saved.active;
      active = { mission: a.mission, stage: a.stage, health: a.health, errors: a.errors, hints: a.hints, penaltyHints: a.penaltyHints, hintedStages: [...new Set(a.hintedStages)], freeHintStages: Array.isArray(a.freeHintStages) ? a.freeHintStages.filter(s => Number.isInteger(s) && s >= 0 && s <= a.stage) : [], coop: false, done: false };
    }
    campaign = { version: VERSION, callsign: saved.callsign, completed: complete, records, clues: Array.isArray(saved.clues) ? [...new Set(saved.clues.filter(c => allowedClues.includes(c)))] : [], flags: Object.fromEntries(['logRead', 'hintGranted', 'introSeen', 'endingSeen'].map(key => [key, flags[key] === true])), freeHints: Number.isInteger(saved.freeHints) ? Math.max(0, Math.min(1, saved.freeHints)) : 0, active };
  }
  function persist() { if (campaign) storageWrite(SAVE_KEY, campaign); }
  function syncRun() { if (campaign && run && !run.coop) { campaign.active = run.health > 0 && !run.done ? { ...run } : null; persist(); } }
  const totalScore = () => campaign ? Object.values(campaign.records).reduce((sum, r) => sum + r.score, 0) : 0;
  const totalStars = () => campaign ? Object.values(campaign.records).reduce((sum, r) => sum + r.stars, 0) : 0;
  const nextMission = () => Math.min(campaign?.completed.length || 0, 5);
  const available = id => !!campaign && validIndex(id) && (id === 0 || campaign.completed.includes(id - 1));
  const score = () => run ? math.score(run.errors, run.penaltyHints) : 0;
  function toast(message) { clearTimeout(toastTimer); toastElement.textContent = message; toastElement.classList.add('visible'); toastTimer = setTimeout(() => toastElement.classList.remove('visible'), 3800); }
  function sound(kind = 'click') {
    if (!settings.sound || !window.CipherAudio) return;
    window.CipherAudio.unlock(); window.CipherAudio.play(kind);
  }
  function audioStatus(state) {
    const button = document.querySelector('#sound-toggle');
    const active = state.enabled && state.unlocked && state.context === 'running' && state.visible;
    button.setAttribute('data-audio-state', active ? 'running' : !state.enabled ? 'muted' : 'ready');
    button.title = !state.enabled ? 'Audio dimatikan. Klik untuk mengaktifkan.' : active ? 'Audio aktif · ' + state.label : 'Audio siap. Mulai setelah klik atau tombol pertama.';
    const label = document.querySelector('#audio-status');
    if (label) label.textContent = !state.enabled ? 'AUDIO MUTED / AKTIFKAN AUDIO UNTUK MENDENGAR' : active ? 'NOW PLAYING / ' + state.label : 'AUDIO SIAP / KLIK ATAU TEKAN TOMBOL UNTUK MULAI';
  }
  function settingsUI() {
    document.body.classList.toggle('reduce-motion', settings.reducedMotion);
    const button = document.querySelector('#sound-toggle');
    button.innerHTML = (settings.sound ? icons.sound : icons.muted) + `<span class="sound-state-label">AUDIO ${settings.sound ? 'ON' : 'OFF'}</span>`;
    button.setAttribute('aria-label', settings.sound ? 'Matikan suara' : 'Aktifkan suara');
    button.setAttribute('aria-pressed', String(settings.sound));
    window.CipherAudio?.configure(settings);
  }
  function scene(content, className = '', art = 'city') {
    return `<section class="scene ${className}" aria-label="${escapeHTML(screen)}"><canvas class="scene-canvas" aria-hidden="true"></canvas>${corners}${content}</section>`;
  }
  function top(title, sub = '', back = 'hub', right = '') {
    return `<div class="scene-top">${action(back, icons.back + (back === 'menu' ? 'MAIN MENU' : back === 'leaveCoop' ? 'EXIT CO-OP' : 'SAFEHOUSE'), 'back-button')}<div class="scene-title">${title}${sub ? `<small>${sub}</small>` : ''}</div>${right || '<span class="hud-tag"><i></i> LOCAL / OFFLINE</span>'}</div>`;
  }
  function mount(art = 'city') {
    currentArt = art;
    window.PixelArt.mount(game.querySelector('canvas'), art, { restored: campaign?.completed.length || 0, reduced: settings.reducedMotion, interactive: screen === 'hub', actor: hubController?.position() || hubPosition, callsign: campaign?.callsign || 'RUNNER' });
  }
  function navigate(next, options = {}) {
    if (screen === 'online' && next !== 'online') window.CipherRooms?.destroy();
    if (hubController) { hubPosition = hubController.position(); hubController.destroy(); hubController = null; }
    clearTimeout(sceneTimer); screen = next;
    if (next !== 'dialogue') dialogueState = null;
    const renderers = { online: () => window.CipherRooms?.mount({ game, scene, mount, sound, callsign: campaign?.callsign, confirm: confirmModal, exit: () => navigate('menu') }), menu: menu, intro: renderIntro, hub, map: districtMap, briefing, puzzle: puzzle, result, failed, archive, coopSetup, handoff, transmission, coopResult, ending, dialogue: renderDialogue };
    (renderers[next] || menu)(options);
    window.CipherAudio?.setScene(screen === 'intro' && currentArt === 'hub' ? 'dialogue' : screen);
    if (next === 'transmission') sound('transmission');
    if (next === 'ending') sound('ending');
    if (next === 'dialogue' || next === 'intro' && intro[introIndex]?.character === 'ARIA') sound('radio');
    if (!options.noFocus) game.focus({ preventScroll: true });
  }
  function menu() {
    game.innerHTML = scene(`<div class="menu-vignette"></div>
      <div class="signal-widget"><span>THE GRID: DISCONNECTED</span><div class="signal-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></div></div>
      <div class="menu-content"><div class="location-stamp"><span class="stamp-line"></span><span>NOVARIS</span><span class="location-date">26.10.2149 / 23:47</span></div>
        <h1 class="title-logo"><img src="assets/title.svg" alt="CIPHER OPS"><span class="sr-only">Lost Transmission</span></h1>
        <p class="title-subtitle" aria-hidden="true">LOST TRANSMISSION</p>
        <p class="menu-tagline">Every message holds a secret.<span>Enam distrik terputus. Satu sinyal masih hidup.</span></p>
        <nav class="menu-actions" aria-label="Menu utama">
          ${action('new', '<span>NEW GAME</span><span class="keycap">↵</span>', 'button primary wide')}
          ${action('continue', `<span>CONTINUE</span><small>${campaign ? escapeHTML(campaign.callsign) + ' / ' + campaign.completed.length + ' OF 6' : 'NO SAVED SIGNAL'}</small>`, 'button ghost wide', campaign ? '' : 'disabled')}
          ${action('coopSetup', icons.coop + 'LOCAL CO-OP<span>2 PLAYERS</span>', 'coop-link')}
          ${action('online', icons.coop + 'MAIN BARENG<span>2–4 DEVICE</span>', 'coop-link room-menu-link')}
        </nav>
      </div>
      <div class="distress"><i></i> SIGNAL LOST_</div><div class="frequency">FREQ. 140.85</div>
      <div class="world-caption">THE CITY IS STILL LISTENING.<small>SOMEWHERE, SOMEONE IS TRANSMITTING.</small></div>
      <div class="menu-bottom">${action('settings', icons.settings + ' SETTINGS', 'settings-link')}<span>A PIXEL-ART NARRATIVE ADVENTURE <b> · </b> v1.0</span></div>`, 'menu-scene');
    mount('city');
  }
  function startNew() {
    const start = () => {
      hubPosition = { x: 476, y: 446, direction: 'down' };
      run = null; coop = null; campaign = { version: VERSION, callsign: 'RUNNER', completed: [], records: {}, clues: [], flags: {}, freeHints: 0, active: null };
      introIndex = 0; persist(); navigate('intro');
    };
    if (campaign) confirmModal('START A NEW SIGNAL?', 'Campaign yang tersimpan akan diganti. Pengaturan suara dan gerakan tetap tersimpan.', 'MULAI BARU', start);
    else start();
  }
  function portraitHTML(character) {
    const type = character === 'NULL' ? 'null' : character === 'ARIA' ? 'aria' : 'runner';
    return `<div class="portrait ${type === 'null' ? 'null-portrait' : ''}"><img src="${PixelArt.portrait(type)}" alt="Pixel portrait ${escapeHTML(character)}"></div>`;
  }
  function dialogueHTML(entry, footer) {
    return `<div class="dialogue">${portraitHTML(entry.character)}<div class="dialogue-body"><div class="dialogue-head">${escapeHTML(entry.character)}<small>${escapeHTML(entry.label || 'ENCRYPTED CHANNEL')}</small></div><p class="dialogue-text">${escapeHTML(entry.text)}</p>${footer}</div></div>`;
  }
  function renderIntro() {
    const entry = intro[introIndex];
    const footer = entry.callsign ? `<form id="callsign-form" novalidate><div class="callsign-row"><label><span class="field-label">CALLSIGN / MAKS. 16 KARAKTER</span><input class="text-input" name="callsign" placeholder="RUNNER" maxlength="16" autocomplete="off" aria-label="Callsign pemain"></label><button class="button primary" type="submit">MASUK SAFEHOUSE ${icons.arrow}</button></div><p class="field-error" id="callsign-error" role="status"></p></form>` : `<div class="dialogue-footer"><span class="dialogue-counter">0${introIndex + 1} / 04</span>${action('introNext', 'LANJUTKAN ' + icons.arrow, 'button dialogue-next')}</div>`;
    game.innerHTML = scene(`<div class="intro-location"><p class="eyebrow"><span class="dot"></span>${escapeHTML(entry.label)}</p></div>${action('skipIntro', 'SKIP INTRO ' + icons.arrow, 'back-button skip-button')}${dialogueHTML(entry, footer)}`, 'intro-scene'); mount(entry.art);
  }
  function hub() {
    if (!campaign) return navigate('menu');
    const m = missions[nextMission()];
    const objective = campaign.completed.length === 6 ? 'Semua distrik tersambung. Masih ada pesan untuk dibaca.' : `M${String(m.id + 1).padStart(2, '0')} / ${m.title} — ${m.district}`;
    game.innerHTML = scene(`${top('THE SAFEHOUSE', 'NOVARIS / UNDERGROUND LEVEL B–07', 'menu', `<span class="hud-tag"><i></i> ${escapeHTML(campaign.callsign)} ONLINE</span>`)}
      <div class="hub-overlay"><p class="eyebrow">WELCOME BACK, ${escapeHTML(campaign.callsign)}.</p><p>Dekati terminal untuk membuka soal matematika.</p><div class="exploration-help"><span><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> BERGERAK</span><span><kbd>E</kbd> INTERAKSI</span><span class="click-help">KLIK LANTAI UNTUK BERJALAN</span></div></div>
      ${action('terminal', '<span class="hotspot-label"><b>01</b><span>CENTRAL TERMINAL<small>SOAL MATEMATIKA</small></span></span>', 'hotspot terminal', 'aria-label="Central Terminal"')}
      ${action('map', '<span class="hotspot-label"><b>02</b> DISTRICT MAP</span>', 'hotspot map', 'aria-label="District Map"')}
      ${action('archive', '<span class="hotspot-label"><b>03</b> MESSAGE ARCHIVE</span>', 'hotspot archive', 'aria-label="Message Archive"')}
      ${action('aria', '<span class="hotspot-label"><b>04</b> TALK TO ARIA</span>', 'hotspot aria', 'aria-label="Talk to Aria"')}
      <div class="world-interaction" hidden><button class="interact-button" data-action="hubInteract" type="button"><kbd>E</kbd><span><strong class="interaction-name"></strong><small class="interaction-verb"></small></span>${icons.arrow}</button></div>
      <div class="touch-movement" role="group" aria-label="Kontrol gerak karakter"><button type="button" data-move="up" aria-label="Gerak ke atas">↑</button><button type="button" data-move="left" aria-label="Gerak ke kiri">←</button><span aria-hidden="true">+</span><button type="button" data-move="right" aria-label="Gerak ke kanan">→</button><button type="button" data-move="down" aria-label="Gerak ke bawah">↓</button></div>
      <div class="hub-bottom"><div class="objective"><span>CURRENT OBJECTIVE</span><p>${escapeHTML(objective)}</p></div><div class="hud-stats"><span><b>${campaign.completed.length}/6</b> DISTRICTS</span><span><b>${totalScore()}</b> SCORE</span><span><b>${totalStars()}/18</b> STARS</span></div></div>`, 'hub-scene exploration-scene'); mount('hub');
    if (window.Safehouse) {
      const room = game.querySelector('.exploration-scene');
      hubController = window.Safehouse.mount({ scene: room, canvas: room.querySelector('canvas'), initial: hubPosition,
        onInteract: id => { sound(id === 'aria' ? 'radio' : id); handlers[id]?.(); }, onPose: pose => { PixelArt.setActor(pose); window.CipherAudio?.movement(pose); }, onHint: toast, isBlocked: () => modal.open });
    }
  }
  function districtMap() {
    if (!campaign) return navigate('menu');
    game.innerHTML = scene(`${top('DISTRICT NETWORK', 'THE GRID / LIVE TOPOLOGY')}<div class="map-heading"><p class="eyebrow text-amber">${campaign.completed.length} OF 6 DISTRICTS RESTORED</p><h1>Reconnect Novaris.</h1><p>Pilih distrik untuk membuka mission briefing.</p></div>
      ${missions.map(m => { const done = campaign.completed.includes(m.id), open = available(m.id); return `<button class="map-node ${done ? 'done' : open ? 'available' : 'locked'}" style="left:${m.x}%;top:${Math.max(m.y, 27)}%" data-action="mission" data-id="${m.id}" ${open ? '' : 'disabled'} aria-label="Misi ${m.id + 1} ${m.district}, ${done ? 'selesai' : open ? 'tersedia' : 'terkunci'}"><span class="node-symbol">${done ? '✓' : String(m.id + 1).padStart(2, '0')}</span><span>${escapeHTML(m.district.toUpperCase())}</span><small>${done ? 'SIGNAL RESTORED' : open ? 'AWAITING CONNECTION' : 'CONNECTION LOCKED'}</small>${done ? `<span class="node-stars">${'★'.repeat(campaign.records[m.id].stars)}</span>` : ''}</button>`; }).join('')}
      <div class="map-legend"><span><i class="on"></i> AVAILABLE</span><span><i class="done"></i> RESTORED</span><span><i></i> LOCKED</span></div>`, 'map-scene'); mount('map');
  }
  function selectMission(id) {
    if (!available(id)) return toast('Selesaikan misi sebelumnya untuk membuka distrik ini.');
    selectedMission = id; navigate('briefing');
  }
  function briefing() {
    const m = missions[selectedMission];
    const hasActive = campaign?.active?.mission === m.id;
    game.innerHTML = scene(`${top('MISSION BRIEFING', m.district.toUpperCase())}<div class="briefing-wrap"><p class="eyebrow text-amber">MISSION ${String(m.id + 1).padStart(2, '0')} / ${escapeHTML(m.district.toUpperCase())}</p><h1>${m.title}</h1><p class="subtitle">${escapeHTML(m.subtitle)}</p><p class="briefing-copy">${escapeHTML(m.briefing)}</p><div class="briefing-meta"><span>${icons.heart} 3 SIGNAL INTEGRITY</span><span>${m.stages.length} ${m.stages.length === 1 ? 'STAGE' : 'STAGES'}</span><span>NO TIMER</span></div>${action(hasActive ? 'resume' : 'startMission', (hasActive ? 'LANJUTKAN MISI' : 'ESTABLISH CONNECTION') + icons.arrow, 'button primary')}<p class="briefing-note">A = 1 · B = 2 · … · Z = 26 · SPASI = 0<br>SIMULASI SANDI UNTUK BELAJAR MATEMATIKA</p></div>`, 'briefing-scene'); mount('hub');
  }
  function beginMission(id = selectedMission) {
    if (!available(id)) return toast('Distrik ini belum terbuka.');
    run = { mission: id, stage: 0, health: 3, errors: 0, hints: 0, penaltyHints: 0, hintedStages: [], coop: false, done: false };
    syncRun(); navigate('puzzle');
  }
  function resume() {
    if (!campaign?.active || !validRun(campaign.active)) return beginMission();
    run = { ...campaign.active }; selectedMission = run.mission; navigate('puzzle');
  }
  const coopRounds = [{ plain: 'RADIO', fn: { a: 2, b: 3 } }, { plain: 'GRID', fn: { a: 3, b: 2 } }, { plain: 'WAVE', fn: math.compose({ a: 3, b: 2 }, { a: 2, b: 1 }) }];
  function activeChallenge() {
    if (!run.coop) { const mission = missions[run.mission]; return { mission, stage: mission.stages[run.stage], fn: mission.fn }; }
    const round = coopRounds[coop.round];
    return { mission: { title: 'SHARED FREQUENCY', type: 'LOCAL CO-OP', id: coop.round, district: 'TEAM CHANNEL', stages: [{}, {}] }, fn: round.fn, stage: coop.role === 'sender' ? { kind: 'encode', plain: round.plain, objective: 'Enkripsi pesan ini, lalu kirim ke rekanmu.', hint: 'Ubah setiap huruf ke angka A = 1 sampai Z = 26. Hitung a × x + b untuk setiap angka.' } : { kind: 'decode', cipher: coop.cipher, objective: 'Baca sandi dari Sender dan temukan pesan aslinya.', hint: 'Balikkan fungsi: kurangi setiap angka dengan b, lalu bagi a. Ubah hasil 1–26 kembali menjadi huruf.' } };
  }
  const fnText = fn => `${fn.a}x ${fn.b < 0 ? '− ' + Math.abs(fn.b) : '+ ' + fn.b}`;
  function hearts() { return `<span class="hearts" aria-label="${run.health} dari 3 nyawa">${[0, 1, 2].map(i => icons.heart.replace('class="heart"', `class="heart ${i >= run.health ? 'lost' : ''}"`)).join('')}</span>`; }
  function puzzle() {
    if (!run || run.health <= 0 || run.done) return navigate(run?.health <= 0 ? 'failed' : 'hub');
    const { mission: m, stage: s, fn } = activeChallenge();
    const isReceiver = run.coop && coop.role === 'receiver';
    const role = run.coop ? (isReceiver ? 'RECEIVER / ' + coop.p2 : 'SENDER / ' + coop.p1) : 'ARIA';
    const stageLabel = run.coop ? `ROUND ${coop.round + 1} / 03 · ${isReceiver ? '02' : '01'} / 02` : `STAGE ${run.stage + 1} / ${m.stages.length}`;
    const hintKey = run.coop ? coop.role : run.stage;
    const hinted = run.hintedStages.includes(hintKey);
    let functionLabel = `E(x) = ${fnText(fn)}`, functionSub = s.kind === 'decode' ? `E⁻¹(x) = (x − ${fn.b}) / ${fn.a}` : 'Terapkan fungsi pada setiap huruf secara terpisah.';
    if (s.kind === 'composition') { functionLabel = 'g(x) = 2x + 1'; functionSub = 'f(x) = 3x + 2 · Cari f(g(x))'; }
    else if (m.f && run.stage === 0) functionSub = 'g(x) = 2x + 1 → f(x) = 3x + 2';
    let challengeHTML = '';
    if (s.kind === 'encode') challengeHTML = `<p class="transmission-label">OUTGOING MESSAGE / PLAINTEXT</p><div class="plaintext">${s.plain}</div><p class="transmission-label">MASUKKAN CIPHERTEXT</p><div class="answer-row">${[...s.plain].map((char, i) => `<label class="number-field"><span>${char} <span>→ ${math.charToNumber(char)}</span></span><input class="text-input" name="value-${i}" type="text" inputmode="numeric" pattern="[0-9]+" autocomplete="off" placeholder="_" aria-label="Nilai sandi ${char}" maxlength="6"></label>`).join('')}</div>`;
    if (s.kind === 'sequence' || s.kind === 'composition') challengeHTML = `${s.plain ? `<p class="transmission-label">ACCESS KEY / PLAINTEXT</p><div class="plaintext">${s.plain}</div>` : '<p class="transmission-label">PILIH FUNGSI KOMPOSISI YANG TEPAT</p>'}<div class="options">${s.options.map((option, i) => `<label class="option"><input type="radio" name="option" value="${i}"><span class="option-content"><span class="option-key">${String.fromCharCode(65 + i)}</span>${s.kind === 'sequence' ? math.format(option) : fnText(option)}</span></label>`).join('')}</div>`;
    if (s.kind === 'decode') challengeHTML = `<p class="transmission-label">INCOMING MESSAGE / CIPHERTEXT</p><div class="ciphertext">${math.format(s.cipher)}</div><label class="field-label" for="decoded">RECOVERED MESSAGE / A–Z</label><input class="text-input decode-input" id="decoded" name="decoded" aria-label="Pesan hasil dekripsi" maxlength="32" autocomplete="off" autocapitalize="characters" placeholder="${'_'.repeat(s.cipher.length)}">`;
    if (s.kind === 'repair') {
      const values = math.encrypt(s.plain, fn);
      challengeHTML = `<p class="transmission-label">DIAGNOSTIC LOG / ${s.plain}</p><div class="options repair-options">${[...s.plain].map((char, i) => `<label class="option"><input type="radio" name="repair-row" value="${i}"><span class="option-content"><span class="option-key">${char}</span><span>${fn.a}(${math.charToNumber(char)}) + ${fn.b} = ${i === s.corruptIndex ? s.corruptValue : values[i]}</span><span class="option-key">SELECT</span></span></label>`).join('')}</div><label class="repair-value">HASIL YANG BENAR<input class="text-input" type="text" name="repair-value" inputmode="numeric" aria-label="Hasil perbaikan" placeholder="_" maxlength="6"></label>`;
    }
    const quote = run.coop ? (isReceiver ? 'Giliranmu membaca. Kamu hanya menerima angka—balikkan fungsinya untuk menemukan pesan.' : 'Satu perangkat, dua peran. Setelah pesan terkirim, berikan kendali ke Receiver.') : 'Tidak perlu terburu-buru. Baca polanya, hitung satu per satu. Aku menjaga jalur tetap terbuka.';
    game.innerHTML = scene(`${top(run.coop ? 'CO-OP CHANNEL' : 'MISSION ' + String(m.id + 1).padStart(2, '0'), escapeHTML(m.title), run.coop ? 'leaveCoop' : 'hub', `<div class="mission-hud">${hearts()}<div class="hud-score"><small>${run.coop ? 'TEAM SCORE' : 'POTENTIAL SCORE'}</small>${score() + (run.coop ? coop.total : 0)} PTS</div></div>`)}
      <div class="puzzle-layout"><aside class="operator-panel"><div class="operator-portrait"><img src="${PixelArt.portrait(isReceiver ? 'runner' : 'aria')}" alt="Operator portrait"></div><p class="operator-name">${escapeHTML(role)}</p><span class="operator-status">● CHANNEL OPEN / 140.85</span><p class="operator-quote">“${quote}”</p><div class="mapping-card"><p class="eyebrow">CHARACTER CONVERSION</p><div class="alphabet">${Array.from({ length: 26 }, (_, i) => `<span>${String.fromCharCode(65 + i)} ${String(i + 1).padStart(2, '0')}</span>`).join('')}</div><p class="mapping-foot">SPASI = 0</p></div></aside>
      <div class="terminal-window"><div class="terminal-chrome"><span>${run.coop ? escapeHTML(role.toUpperCase()) : 'NOVARIS TERMINAL / SESSION ' + String(m.id + 1).padStart(3, '0')}</span><div class="terminal-leds"><i></i><i></i><i></i></div></div><div class="terminal-content"><p class="eyebrow text-amber">${escapeHTML(m.type)} <span class="sr-only">${stageLabel}</span></p><h1>${m.title}</h1><p class="objective-copy">${escapeHTML(s.objective)}</p><div class="stage-indicators">${stageLabel}<i class="active"></i><i class="${(run.coop ? isReceiver : run.stage > 0) ? 'active' : ''}"></i></div><div class="function-strip">${functionLabel}<small>${functionSub}</small></div><form id="puzzle-form" novalidate>${challengeHTML}<p class="feedback" id="puzzle-feedback" role="status" aria-live="polite">${run.coop ? 'Shared integrity. Kerja sama menjaga sinyal tetap hidup.' : 'A = 1 · Z = 26 · Spasi = 0. Jalur siap menerima jawaban.'}</p><div class="terminal-actions"><button class="button primary" type="submit">${s.kind === 'repair' ? 'REPAIR SIGNAL' : isReceiver || s.kind === 'decode' ? 'DECODE MESSAGE' : 'TRANSMIT'} ${icons.arrow}</button>${action('hint', icons.hint + (hinted ? 'HINT OPEN' : !run.coop && campaign.freeHints > 0 ? 'FREE HINT' : 'HINT −25'), 'button ghost hint-button', hinted ? 'disabled' : '')}</div></form><div class="hint-message" id="hint-message" ${hinted ? '' : 'hidden'}><small>ARIA / ${run.coop || !run.freeHintStages?.includes(run.stage) ? '−25 POINTS · NO LIFE LOST' : 'FREE HINT TOKEN USED'}</small>${escapeHTML(s.hint)}</div><details class="mapping-mobile"><summary class="field-label" style="cursor:pointer;margin-top:21px">CHARACTER REFERENCE +</summary><p class="mono" style="font-size:10px;line-height:2;color:#7d9dae;margin-top:10px">${Array.from({ length: 26 }, (_, i) => `${String.fromCharCode(65 + i)}=${i + 1}`).join(' · ')} · SPASI=0</p></details></div></div></div><div class="puzzle-footer"><span class="learning-label">${run.coop ? 'SAME DEVICE · SHARED HEALTH · SHARED SCORE' : 'EDUCATIONAL CIPHER SIMULATION'}</span><span>NO TIMER / THINK BEFORE YOU TRANSMIT</span><span>${run.coop ? 'TEAM CHANNEL OPEN_' : 'THE GRID IS LISTENING_'}</span></div>`, 'puzzle-scene'); mount('terminal');
  }
  // Syntax validation is separate from correctness: malformed answers never cost a heart.
  function readAnswer(form, stage) {
    const fields = new FormData(form);
    const integer = (value, label) => {
      const str = String(value ?? '').trim();
      if (!/^-?\d+$/.test(str) || !Number.isSafeInteger(Number(str))) throw new Error(`${label}: isi bilangan bulat terlebih dahulu. Nyawa tidak berkurang.`);
      return Number(str);
    };
    if (stage.kind === 'encode') return [...stage.plain].map((c, i) => integer(fields.get('value-' + i), 'Sandi ' + c));
    if (stage.kind === 'sequence' || stage.kind === 'composition') {
      if (fields.get('option') === null) throw new Error('Pilih satu jawaban terlebih dahulu. Nyawa tidak berkurang.');
      const index = integer(fields.get('option'), 'Pilihan');
      if (index < 0 || index >= stage.options.length) throw new Error('Pilihan tidak valid.');
      return stage.options[index];
    }
    if (stage.kind === 'decode') {
      const word = String(fields.get('decoded') || '').trim().toUpperCase();
      if (!word || !/^[A-Z ]+$/.test(word)) throw new Error('Masukkan kata dengan huruf A–Z atau spasi. Nyawa tidak berkurang.');
      return word;
    }
    if (stage.kind === 'repair') {
      if (fields.get('repair-row') === null) throw new Error('Pilih baris yang salah terlebih dahulu. Nyawa tidak berkurang.');
      return { row: integer(fields.get('repair-row'), 'Baris'), value: integer(fields.get('repair-value'), 'Hasil perbaikan') };
    }
    throw new Error('Challenge tidak dikenal.');
  }
  function isCorrect(answer, stage, fn, mission) {
    if (stage.kind === 'encode' || stage.kind === 'sequence') return math.same(answer, math.encrypt(stage.plain, fn));
    if (stage.kind === 'decode') return answer === math.decrypt(stage.cipher, fn);
    if (stage.kind === 'composition') { const expected = math.compose(mission.f, mission.g); return answer.a === expected.a && answer.b === expected.b; }
    if (stage.kind === 'repair') {
      const expected = math.encrypt(stage.plain, fn);
      const shown = expected.map((value, i) => i === stage.corruptIndex ? stage.corruptValue : value);
      return answer.row >= 0 && answer.row < expected.length && shown[answer.row] !== expected[answer.row] && answer.value === expected[answer.row];
    }
    return false;
  }
  function feedback(message, type = '') { const el = document.querySelector('#puzzle-feedback'); if (el) { el.className = 'feedback ' + type; el.textContent = message; } }
  function submitPuzzle(form) {
    if (screen !== 'puzzle' || !run || run.health <= 0 || run.done) return;
    const challenge = activeChallenge(); let answer;
    try { answer = readAnswer(form, challenge.stage); } catch (error) { feedback(error.message, 'error'); return; }
    if (!isCorrect(answer, challenge.stage, challenge.fn, challenge.mission)) {
      run.health--; run.errors++; sound(run.health <= 0 ? 'failure' : 'error'); syncRun();
      if (run.health <= 0) return navigate('failed');
      // Refresh the HUD without wiping the player's answer.
      document.querySelector('.mission-hud').innerHTML = `${hearts()}<div class="hud-score"><small>${run.coop ? 'TEAM SCORE' : 'POTENTIAL SCORE'}</small>${score() + (run.coop ? coop.total : 0)} PTS</div>`;
      feedback(`Sinyal tidak cocok. Periksa kembali perhitungannya. Sisa ${run.health} nyawa.`, 'error');
      const terminal = document.querySelector('.terminal-window'); terminal.classList.remove('glitch'); void terminal.offsetWidth; terminal.classList.add('glitch'); return;
    }
    sound((run.coop ? coop.role === 'receiver' : run.stage === challenge.mission.stages.length - 1) ? 'complete' : 'success');
    if (run.coop) {
      if (coop.role === 'sender') { coop.cipher = math.encrypt(coopRounds[coop.round].plain, challenge.fn); navigate('transmission'); }
      else { run.done = true; coop.total += score(); navigate('coopResult'); }
      return;
    }
    if (run.stage < challenge.mission.stages.length - 1) {
      const completedKind = challenge.stage.kind;
      run.stage++; syncRun(); navigate('puzzle');
      feedback(completedKind === 'composition' ? 'Komposisi tepat: 3(2x + 1) + 2 = 6x + 5. Sekarang gunakan fungsi itu.' : 'Transmisi terkirim. Sekarang baca respons masuk.', 'success');
      toast('STAGE COMPLETE / Jalur berikutnya terbuka.');
    } else completeMission();
  }
  function useHint() {
    if (screen !== 'puzzle' || !run || run.done || run.health <= 0) return;
    const key = run.coop ? coop.role : run.stage;
    if (run.hintedStages.includes(key)) return;
    run.hintedStages.push(key); run.hints++;
    let free = !run.coop && campaign.freeHints > 0;
    if (free) { campaign.freeHints--; run.freeHintStages ||= []; run.freeHintStages.push(run.stage); }
    else run.penaltyHints++;
    syncRun();
    const hint = document.querySelector('#hint-message'); hint.hidden = false;
    hint.innerHTML = `<small>ARIA / ${free ? 'FREE HINT TOKEN USED · NO POINT PENALTY' : '−25 POINTS · NO LIFE LOST'}</small>${escapeHTML(activeChallenge().stage.hint)}`;
    const button = document.querySelector('[data-action="hint"]'); button.disabled = true; button.innerHTML = icons.hint + 'HINT OPEN';
    document.querySelector('.hud-score').innerHTML = `<small>${run.coop ? 'TEAM SCORE' : 'POTENTIAL SCORE'}</small>${score() + (run.coop ? coop.total : 0)} PTS`;
    feedback(free ? 'Token hint dipakai. Skor tidak dipotong; rating maksimal 1 bintang karena memakai bantuan.' : 'Hint dibuka: −25 poin. Nyawa tetap.', '');
  }
  function completeMission() {
    if (run.done || run.health <= 0) return;
    const m = missions[run.mission], earned = score(), stars = math.stars(run.errors, run.hints);
    run.done = true; run.earned = earned; run.stars = stars;
    const previous = campaign.records[m.id] || { score: 0, stars: 0 };
    campaign.records[m.id] = { score: Math.max(previous.score, earned), stars: Math.max(previous.stars, stars) };
    if (!campaign.completed.includes(m.id)) { campaign.completed.push(m.id); campaign.completed.sort((a, b) => a - b); }
    if (!campaign.clues.includes(m.clue.id)) campaign.clues.push(m.clue.id);
    campaign.active = null; persist(); navigate('result');
  }
  function result() {
    if (!run?.done || run.coop) return navigate('hub');
    const m = missions[run.mission];
    game.innerHTML = scene(`<div class="result-wrap"><div class="result-icon">${icons.check}</div><div class="result-uplink" aria-label="Transmisi terkirim ke distrik"><span>RUNNER</span><i></i><span>${escapeHTML(m.district.toUpperCase())}</span></div><p class="eyebrow text-green">${escapeHTML(m.district.toUpperCase())} / SIGNAL RESTORED</p><h1>MISSION COMPLETE</h1><p class="mission-name">${String(m.id + 1).padStart(2, '0')} / ${m.title}</p><div class="stars" aria-label="${run.stars} dari 3 bintang">${'★'.repeat(run.stars)}<span class="empty">${'★'.repeat(3 - run.stars)}</span></div><div class="result-stats"><div><b>${run.earned}</b><span>POINTS</span></div><div><b>${run.health}/3</b><span>HEARTS LEFT</span></div><div><b>${run.errors}</b><span>INCORRECT</span></div><div><b>${run.hints}</b><span>HINTS USED</span></div></div><p class="result-story">${escapeHTML(m.story)}</p><div class="math-explanation"><strong>DECODE THE MATH</strong>${escapeHTML(m.explanation)}</div><div class="result-actions">${action(run.mission === 5 ? 'ending' : 'nextMission', (run.mission === 5 ? 'THE FINAL SIGNAL' : 'CONTINUE MISSION') + icons.arrow, 'button primary')}${action('hub', 'RETURN TO HUB', 'button ghost')}${action('replay', 'REPLAY MISSION', 'button ghost')}</div><p class="rating-note">★★★ 0 kesalahan, 0 hint · ★★ maks. 1 kesalahan, 0 hint · ★ selesai<br>Skor: 100 + 50 jika tanpa kesalahan − 10/kesalahan − 25/hint berbayar.<br>Campaign menyimpan skor terbaik tiap misi. Replay tidak menggandakan poin.</p></div>`, 'result-scene'); mount(run.mission === 5 ? 'ending' : 'city');
  }
  function failed() {
    if (!run) return navigate('hub');
    game.innerHTML = scene(`<div class="handoff-wrap"><p class="eyebrow" style="color:var(--red)">SIGNAL INTEGRITY / 0 OF 3</p><div class="handoff-icon" style="color:var(--red);margin-top:35px">×</div><h1>CONNECTION LOST</h1><p>${run.coop ? 'Jalur tim terputus. Mulai ulang ronde ini dengan tiga nyawa. Skor ronde yang sudah selesai tetap ada.' : 'Tiga transmisi belum berhasil. Coba lagi dari awal misi dengan tiga nyawa. Progres distrik yang sudah pulih tetap aman.'}</p><div class="result-actions">${action('retry', 'RETRY CONNECTION ' + icons.arrow, 'button primary')}${action(run.coop ? 'leaveCoop' : 'hub', run.coop ? 'KELUAR CO-OP' : 'RETURN TO HUB', 'button ghost')}</div></div>`, 'puzzle-scene'); mount('terminal');
  }
  function aria() {
    if (!campaign) return;
    const count = campaign.completed.length;
    dialogueState = { id: 'aria-checkin', character: 'ARIA', label: 'PRIVATE CHANNEL / 140.85', text: count === 0 ? 'Jalur ke markas hampir siap. Tapi ada sesuatu yang aneh di log sebelum pemadaman. Mau melihatnya, atau butuh bantuan menghitung?' : count < 3 ? 'Sinyal makin jelas. Gangguan ini dimulai dari dalam The Grid. Kita bisa membaca log-nya, atau aku bantu menjaga perhitunganmu.' : count < 6 ? 'NULL menghindari sistem otomatis. Mungkin pesan-pesan ini memang ditujukan untuk kita. Kamu mau mendengar rekamannya, atau butuh bantuan di terminal?' : 'Kota sudah kembali bersuara. Tapi setiap kali aku mendengar rekaman CABIN itu… suaranya terlalu mirip denganku. Kita masih punya satu misteri.', choices: [
      { text: campaign.flags.logRead ? 'Baca lagi log sebelum pemadaman.' : 'Tunjukkan log sebelum pemadaman.', effect: 'log', next: 'Satu detik sebelum The Grid padam, seluruh distrik menerima perintah isolasi yang sah. Tidak ada sistem yang dibobol. Log ini sudah kusimpan ke archive-mu.' },
      { text: campaign.flags.hintGranted ? 'Ingatkan aku cara membaca fungsi.' : 'Aku butuh petunjuk untuk misi berikutnya.', effect: 'freeHint', next: campaign.flags.hintGranted ? 'Ubah huruf ke angka, lalu kerjakan fungsi dari dalam ke luar. Untuk invers, balik urutannya: kurangi konstanta, lalu bagi koefisien.' : 'Satu token hint gratis untukmu. Buka HINT di terminal untuk memakainya. Skor tidak dipotong, tetapi bantuan tetap dicatat dalam rating.' }
    ] };
    navigate('dialogue');
  }
  function renderDialogue() {
    const d = dialogueState;
    if (!d) return navigate('hub');
    const footer = d.choices ? `<div class="choice-actions">${d.choices.map((choice, i) => action('dialogueChoice', escapeHTML(choice.text) + icons.arrow, 'button ghost', `data-id="${i}"`)).join('')}</div>` : `<div class="dialogue-footer"><span class="dialogue-counter">CHANNEL SECURED</span>${action('hub', 'KEMBALI ' + icons.arrow, 'button dialogue-next')}</div>`;
    game.innerHTML = scene(`${top('ARIA / PRIVATE CHANNEL', 'SAFEHOUSE CONNECTION')}${dialogueHTML(d, footer)}`, 'hub-scene'); mount('hub');
  }
  function dialogueChoice(index) {
    const choice = dialogueState?.choices?.[index]; if (!choice) return;
    if (choice.effect === 'log') { campaign.flags.logRead = true; if (!campaign.clues.includes('log')) { campaign.clues.push('log'); toast('ARCHIVE UPDATED / Log sebelum pemadaman.'); } }
    if (choice.effect === 'freeHint' && !campaign.flags.hintGranted) { campaign.flags.hintGranted = true; campaign.freeHints = 1; toast('RECEIVED / 1 free hint token.'); }
    persist(); dialogueState = { id: 'aria-response-' + choice.effect, character: 'ARIA', label: choice.effect === 'log' ? 'CLUE ADDED TO MESSAGE ARCHIVE' : 'OPERATOR SUPPORT', text: choice.next }; navigate('dialogue');
  }
  function archive() {
    if (!campaign) return navigate('menu');
    const entries = [...missions.map(m => m.clue), { id: 'log', title: 'EXTRA / Sebelum pemadaman', sender: 'ARIA / INTERNAL LOG', text: '23:40:59 — protokol isolasi disetujui dari Core. Tidak ada akses ilegal. Perintah menggunakan otorisasi internal. Pemadaman ini disengaja.' }].filter(c => campaign.clues.includes(c.id));
    game.innerHTML = scene(`${top('MESSAGE ARCHIVE', `${entries.length} RECOVERED TRANSMISSIONS`)}<div class="archive-wrap"><div class="archive-header"><p class="eyebrow text-amber">NOTHING IS EVER TRULY LOST</p><h1>Recovered signals.</h1><p>Jejak yang kamu temukan. Pesan yang belum selesai bercerita.</p></div>${entries.length ? entries.map((entry, i) => `<details class="archive-entry" ${i === entries.length - 1 ? 'open' : ''}><summary>${escapeHTML(entry.title)}</summary><div class="entry-body"><p class="entry-sender">FROM: ${escapeHTML(entry.sender)}</p>${escapeHTML(entry.text)}</div></details>`).join('') : '<p class="archive-empty">Belum ada transmisi yang pulih.<br>Selesaikan misi atau bicara dengan Aria untuk menemukan petunjuk.</p>'}</div>`, 'puzzle-scene'); mount('terminal');
  }
  function coopSetup() {
    game.innerHTML = scene(`${top('LOCAL CO-OP', 'ONE DEVICE / TWO SIGNAL RUNNERS', 'menu')}<form id="coop-form" class="coop-setup" novalidate><p class="eyebrow text-amber">SAME DEVICE. SAME FREQUENCY.</p><h1>It takes two<br>to make a signal.</h1><p>Sender mengenkripsi. Receiver membaca kembali. Bergantian memakai perangkat yang sama dalam tiga ronde, dengan nyawa dan skor bersama.</p><div class="coop-fields"><label><span class="coop-role">01 / SENDER</span><span class="field-label">CALLSIGN PEMAIN 1</span><input class="text-input" name="p1" aria-label="Callsign Sender" maxlength="16" placeholder="ECHO" autocomplete="off"></label><label><span class="coop-role receiver">02 / RECEIVER</span><span class="field-label">CALLSIGN PEMAIN 2</span><input class="text-input" name="p2" aria-label="Callsign Receiver" maxlength="16" placeholder="NOVA" autocomplete="off"></label></div><p id="coop-error" class="field-error" role="status"></p><button type="submit" class="button primary">OPEN TEAM CHANNEL ${icons.arrow}</button><p class="settings-info">Co-op lokal, tanpa koneksi online. Serah-terima layar adalah aturan bermain bersama, bukan perlindungan keamanan informasi. Campaign solo tetap tersimpan.</p></form>`, 'briefing-scene'); mount('hub');
  }
  function beginCoop(p1, p2) { coop = { p1, p2, round: 0, role: 'sender', cipher: [], total: 0, errors: 0, hints: 0 }; resetCoopRound(); }
  function resetCoopRound() {
    run = { mission: 0, stage: 0, health: 3, errors: 0, hints: 0, penaltyHints: 0, hintedStages: [], coop: true, done: false };
    coop.role = 'sender'; coop.cipher = []; navigate('puzzle');
  }
  function transmission() {
    game.innerHTML = scene(`<div class="handoff-wrap"><p class="eyebrow text-cyan">UPLINK ESTABLISHED</p><div class="transmission-animation"><span>[ ]</span><span class="packet">▪ ▪ ▪</span><span>[ ]</span></div><h1>TRANSMITTING_</h1><p>Paket sedang menuju Receiver.</p></div>`, 'puzzle-scene'); mount('terminal');
    sceneTimer = setTimeout(() => navigate('handoff'), settings.reducedMotion ? 200 : 1400);
  }
  function handoff() {
    if (!coop || !run?.coop) return navigate('menu');
    game.innerHTML = scene(`<div class="handoff-wrap"><p class="eyebrow text-magenta">ROUND ${coop.round + 1} / RECEIVER HANDOFF</p><div class="handoff-icon">01 → 02</div><h1>YOUR TURN,<br>${escapeHTML(coop.p2)}.</h1><p>Berikan kendali ke Receiver. Pesan asli sudah ditutup.<br>Gunakan fungsi invers untuk membaca paket yang masuk.</p>${action('receiverReady', 'RECEIVER READY ' + icons.arrow, 'button primary')}<p class="settings-info">Nyawa bersama: ${run.health}/3 · Skor bersama: ${coop.total} + ronde ini.</p></div>`, 'puzzle-scene'); mount('terminal');
  }
  function coopResult() {
    if (!coop || !run?.done) return navigate('menu');
    const final = coop.round === coopRounds.length - 1;
    game.innerHTML = scene(`<div class="result-wrap"><div class="result-icon">${icons.check}</div><p class="eyebrow text-green">SENDER + RECEIVER / CONNECTION VERIFIED</p><h1>${final ? 'TEAM CHANNEL RESTORED' : 'TRANSMISSION RECEIVED'}</h1><p class="mission-name">${escapeHTML(coop.p1)} ↔ ${escapeHTML(coop.p2)}</p><div class="stars" aria-label="${math.stars(run.errors, run.hints)} bintang">${'★'.repeat(math.stars(run.errors, run.hints))}</div><div class="result-stats"><div><b>${coop.total}</b><span>TEAM TOTAL</span></div><div><b>${score()}</b><span>ROUND POINTS</span></div><div><b>${run.health}/3</b><span>SHARED HEARTS</span></div><div><b>${coop.round + 1}/3</b><span>ROUNDS</span></div></div><p class="result-story">Pesan “${coopRounds[coop.round].plain}” sampai dengan utuh. Dua kepala, satu frekuensi. ${final ? 'Seluruh jalur tim sudah pulih.' : 'Jalur berikutnya menunggu.'}</p><div class="math-explanation"><strong>SHARED SOLUTION</strong>${math.format(coop.cipher)} → gunakan E⁻¹(x) = (x − ${coopRounds[coop.round].fn.b}) / ${coopRounds[coop.round].fn.a} → ${coopRounds[coop.round].plain}.</div><div class="result-actions">${action(final ? 'finishCoop' : 'nextCoop', (final ? 'KEMBALI KE MAIN MENU' : 'NEXT ROUND') + icons.arrow, 'button primary')}</div><p class="rating-note">+100 selesai · +50 tanpa kesalahan · −10 per kesalahan · −25 per hint.<br>Campaign solo tetap tersimpan terpisah.</p></div>`, 'result-scene'); mount('city');
  }
  function ending() {
    if (!campaign || campaign.completed.length < 6) return navigate('hub');
    campaign.flags.endingSeen = true; persist();
    game.innerHTML = scene(`<div class="menu-vignette"></div><div class="ending-wrap"><p class="eyebrow text-green"><span class="dot" style="background:var(--green)"></span>THE GRID / ALL SYSTEMS ONLINE</p><h1>THE CITY<br>HAS A VOICE AGAIN.</h1><p>“Kamu dengar itu, ${escapeHTML(campaign.callsign)}? Itu suara Novaris.”<br>Aria tersenyum. Untuk pertama kalinya malam ini, tak ada gangguan di antara kata-katanya.</p><div class="ending-stats"><div><b>${totalScore()}</b>CAMPAIGN SCORE</div><div><b>6/6</b>DISTRICTS</div><div><b>${totalStars()}/18</b>STARS</div></div><div class="ending-actions">${action('hub', 'REVISIT SAFEHOUSE ' + icons.arrow, 'button primary')}${action('new', 'NEW CAMPAIGN', 'button ghost')}</div><p class="ending-null">[ UNKNOWN INCOMING TRANSMISSION ]<br>NULL: “Kalau Aria bertanya siapa aku,<br>katakan: kita pernah bertemu.”<br><br>END OF CHAPTER 01 / SIGNAL CONTINUES_</p></div>`, 'menu-scene'); mount('ending');
  }
  function openModal(title, content) {
    hubController?.pause();
    lastFocus = document.activeElement;
    modal.innerHTML = `<div class="modal-header"><h2 id="modal-title">${title}</h2>${action('closeModal', '×', 'icon-button', 'aria-label="Tutup"')}</div><div class="modal-content">${content}</div>`;
    if (!modal.open) modal.showModal();
  }
  function closeModal() { modal.close(); hubController?.resume(); if (lastFocus?.isConnected) lastFocus.focus(); }
  let pendingConfirmation = null;
  function confirmModal(title, message, label, callback) { pendingConfirmation = callback; openModal(title, `<p class="modal-copy">${message}</p><div class="modal-actions">${action('closeModal', 'BATAL', 'button ghost')}${action('confirm', label, 'button danger')}</div>`); }
  function showSettings() {
    const sliders = [['volume', 'Volume utama', 'MASTER'], ['musicVolume', 'Volume musik', 'MUSIC'], ['ambienceVolume', 'Volume ambience', 'AMBIENCE'], ['effectsVolume', 'Volume efek', 'SOUND FX']].map(([key, label, caption]) => `<label class="audio-level"><span>${caption}</span><input type="range" min="0" max="100" step="1" value="${settings[key]}" id="audio-${key}" data-audio-setting="${key}" aria-label="${label}"><output for="audio-${key}" id="audio-value-${key}">${settings[key]}%</output></label>`).join('');
    openModal('SYSTEM SETTINGS', `<p class="eyebrow text-cyan">MAKE YOURSELF AT HOME, RUNNER.</p><label class="setting-row"><span>Audio game<small>Musik ambient, hujan, langkah, dan efek terminal.</small></span><span class="toggle"><input id="setting-sound" type="checkbox" aria-label="Audio game" ${settings.sound ? 'checked' : ''}></span></label><div class="audio-mixer" role="group" aria-label="Pengaturan volume">${sliders}</div><div class="audio-preview-row">${action('audioPreview', icons.sound + ' TES SUARA', 'button ghost audio-preview')}<p id="audio-status" class="audio-status" role="status">AUDIO SIAP</p></div><label class="setting-row"><span>Reduce motion<small>Matikan hujan bergerak dan animasi transisi.</small></span><span class="toggle"><input id="setting-motion" type="checkbox" aria-label="Reduce motion" ${settings.reducedMotion ? 'checked' : ''}></span></label><div class="settings-footer">${action('resetSave', 'RESET SAVE', 'button danger', campaign ? '' : 'disabled')}${action('closeModal', 'KEMBALI ' + icons.arrow, 'button ghost')}</div><p class="settings-info">Suara mulai setelah interaksi pertama dan berhenti sementara saat tab tidak aktif. Musik lebih redup ketika membaca dialog dan mengerjakan puzzle.<br><br>SIMPAN OTOMATIS DI PERANGKAT INI<br>Data campaign dan pengaturan audio tersimpan secara lokal.<br><br>KEYBOARD: WASD/panah untuk berjalan · E untuk interaksi · Tab untuk navigasi · Esc untuk pengaturan.<br><br>EDUCATIONAL CIPHER SIMULATION / v1.0</p>`);
    if (window.CipherAudio) audioStatus(window.CipherAudio.state());
  }
  function leaveCoop() { confirmModal('CLOSE TEAM CHANNEL?', 'Sesi co-op ini akan berakhir. Campaign solo tetap tersimpan.', 'KELUAR', () => { coop = null; run = null; navigate('menu'); }); }
  const handlers = {
    online: () => navigate('online'),
    home: () => { if (screen === 'online' && window.CipherRooms?.hasRoom()) window.CipherRooms.leave(); else if (run?.coop && !run.done) leaveCoop(); else navigate('menu'); }, menu: () => navigate('menu'), new: startNew,
    continue: () => { if (!campaign) return; coop = null; run = null; if (campaign.active) resume(); else navigate('hub'); },
    introNext: () => { introIndex = Math.min(introIndex + 1, intro.length - 1); navigate('intro'); },
    skipIntro: () => { introIndex = intro.length - 1; navigate('intro'); }, hub: () => navigate('hub'), map: () => navigate('map'),
    terminal: () => { selectedMission = campaign.active?.mission ?? nextMission(); navigate('briefing'); }, hubInteract: () => hubController?.interact(),
    mission: el => selectMission(Number(el.dataset.id)), startMission: () => beginMission(), resume,
    nextMission: () => selectMission(Math.min(run.mission + 1, 5)), replay: () => beginMission(run.mission), retry: () => run.coop ? resetCoopRound() : beginMission(run.mission),
    hint: useHint, aria, dialogueChoice: el => dialogueChoice(Number(el.dataset.id)), archive: () => navigate('archive'), settings: showSettings,
    sound: () => { settings.sound = !settings.sound; storageWrite(SETTINGS_KEY, settings); settingsUI(); sound('confirm'); toast(settings.sound ? 'AUDIO ON / Musik, ambience, dan efek aktif.' : 'AUDIO OFF / Semua suara dimatikan.'); },
    audioPreview: () => { settings.sound = true; storageWrite(SETTINGS_KEY, settings); settingsUI(); const toggle = document.querySelector('#setting-sound'); if (toggle) toggle.checked = true; window.CipherAudio?.unlock(); window.CipherAudio?.preview(); },
    resetSave: () => confirmModal('ERASE SAVED SIGNAL?', 'Hapus callsign, skor, petunjuk, dan progres campaign di browser ini? Tindakan ini tidak bisa dibatalkan.', 'HAPUS SAVE', () => {
      campaign = null; run = null; coop = null; try { localStorage.removeItem(SAVE_KEY); } catch (_) {} navigate('menu'); toast('SAVE RESET / Kanal baru siap dibuka.');
    }),
    closeModal, confirm: () => { const callback = pendingConfirmation; pendingConfirmation = null; closeModal(); if (callback) callback(); },
    coopSetup: () => navigate('coopSetup'), leaveCoop,
    receiverReady: () => { if (!coop || screen !== 'handoff') return; coop.role = 'receiver'; navigate('puzzle'); },
    nextCoop: () => { if (!coop || !run.done || coop.round >= 2) return; coop.round++; resetCoopRound(); },
    finishCoop: () => { coop = null; run = null; navigate('menu'); }, ending: () => navigate('ending')
  };
  document.addEventListener('click', event => {
    window.CipherAudio?.unlock();
    if (event.target.closest('summary')) sound('archive');
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    const handler = handlers[button.dataset.action]; if (!handler) return;
    if (screen === 'hub' && hubController && button.classList?.contains?.('hotspot')) { hubController.approach(button.dataset.action); return; }
    const sounds = { new: 'confirm', continue: 'confirm', startMission: 'terminal', resume: 'terminal', map: 'map', archive: 'archive', aria: 'radio', hint: 'hint', retry: 'confirm', receiverReady: 'confirm', nextCoop: 'confirm' };
    if (!['sound', 'audioPreview', 'hubInteract', 'ending'].includes(button.dataset.action)) sound(sounds[button.dataset.action] || 'click'); handler(button);
  });
  document.addEventListener('submit', event => {
    event.preventDefault();
    if (event.target.id === 'puzzle-form') return submitPuzzle(event.target);
    if (event.target.id === 'callsign-form') {
      const callsign = event.target.elements.callsign.value.trim().toUpperCase() || 'RUNNER';
      if (!validCallsign(callsign)) { document.querySelector('#callsign-error').textContent = 'Gunakan 1–16 huruf, angka, spasi, tanda − atau _.'; return; }
      campaign.callsign = callsign; campaign.flags.introSeen = true; persist(); navigate('hub');
    }
    if (event.target.id === 'coop-form') {
      const p1 = event.target.elements.p1.value.trim().toUpperCase() || 'ECHO', p2 = event.target.elements.p2.value.trim().toUpperCase() || 'NOVA';
      if (![p1, p2].every(validCallsign)) { document.querySelector('#coop-error').textContent = 'Callsign: 1–16 huruf, angka, spasi, − atau _.'; return; } beginCoop(p1, p2);
    }
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'setting-sound') settings.sound = event.target.checked;
    else if (event.target.id === 'setting-motion') { settings.reducedMotion = event.target.checked; mount(currentArt); }
    else return;
    storageWrite(SETTINGS_KEY, settings); settingsUI(); if (event.target.id === 'setting-sound') sound();
  });
  document.addEventListener('input', event => {
    const key = event.target.dataset?.audioSetting;
    if (!['volume', 'musicVolume', 'ambienceVolume', 'effectsVolume'].includes(key)) return;
    const value = Number(event.target.value); if (!Number.isFinite(value)) return;
    settings[key] = Math.max(0, Math.min(100, Math.round(value)));
    const output = document.querySelector('#audio-value-' + key); if (output) output.textContent = settings[key] + '%';
    storageWrite(SETTINGS_KEY, settings); settingsUI();
  });
  modal.addEventListener('click', event => { if (event.target === modal) { const bounds = modal.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeModal(); } });
  modal.addEventListener('close', () => hubController?.resume());
  document.addEventListener('pointerdown', () => window.CipherAudio?.unlock(), { passive: true });
  document.addEventListener('keydown', event => { window.CipherAudio?.unlock(); if (event.key === 'Escape' && !modal.open && screen !== 'menu') showSettings(); });
  document.addEventListener('visibilitychange', () => window.CipherAudio?.setVisible(!document.hidden));
  window.addEventListener?.('cipher-room-status', event => { const indicator = document.querySelector('.local-indicator'); if (indicator) indicator.innerHTML = '<i></i> ' + (event.detail ? 'TEAM SESSION / LIVE' : 'LOCAL SESSION'); });
  load(); if (window.CipherAudio) { window.CipherAudio.setStatusListener(audioStatus); window.CipherAudio.setVisible(!document.hidden); } settingsUI(); navigate('menu');
  if (window.CipherRooms && (/^\?room=[A-Z2-9]{6}$/.test(window.location?.search || '') || window.CipherRooms.hasSavedSession())) navigate('online');
})();
