(function () {
  'use strict';
  const SESSION = 'cipher-ops-room-v1';
  const colors = ['#56e4ff', '#ffbf69', '#c29aff', '#6effa8'];
  const portraits = new Map();
  const portrait = type => { if (!portraits.has(type)) portraits.set(type, PixelArt.portrait(type)); return portraits.get(type); };
  const roleFor = p => room.operators.find(r => r.id === p.role);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const button = (name, text, primary = false, extra = '') => `<button type="button" class="button ${primary ? 'primary' : 'ghost'}" data-room-action="${name}" ${extra}>${text}</button>`;
  let view = null, room = null, session = null, timer = null, controller = null, busy = false, mounted = false, key = '', failures = 0, ticket = 0;
  let networkInfo = null, active = false;
  let crewFrame = null;
  const nonce = () => window.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
  const mine = () => room?.players.find(p => p.id === room.you);
  const isHost = () => room?.you === room?.hostId;
  const sound = cue => view?.sound(cue);
  function invitationCode() {
    const code = new URLSearchParams(location.search).get('room')?.trim().toUpperCase() || '';
    return /^[A-Z2-9]{6}$/.test(code) ? code : '';
  }
  function replaceInvitation(code) {
    try {
      const url = new URL(location.href);
      if (!url.searchParams.has('room')) return;
      if (code) url.searchParams.set('room', code); else url.searchParams.delete('room');
      history.replaceState(history.state, '', url);
    } catch (_) {}
  }
  function setActive(value) {
    if (active !== value) { active = value; window.dispatchEvent(new CustomEvent('cipher-room-status', { detail: value })); }
  }
  function clearSession() {
    ticket++; stopPolling(); session = null; room = null; key = ''; busy = false;
    save(); setActive(false);
  }
  function save() { try { if (session) sessionStorage.setItem(SESSION, JSON.stringify(session)); else sessionStorage.removeItem(SESSION); } catch (_) {} }
  function status(text, error = false) {
    const el = view?.game.querySelector('#room-feedback');
    if (el) { el.textContent = text; el.classList.toggle('error', error); }
  }
  async function request(path, body = {}, signal) {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: 'Bearer ' + session.secret } : {}) }, body: JSON.stringify(body), signal, cache: 'no-store' });
    let data;
    try { data = await response.json(); }
    catch (_) { const e = new Error(location.protocol === 'file:' ? 'Main Bareng memerlukan link game online atau server lokal.' : response.status === 404 ? 'API room belum terpasang pada hosting ini. Deploy ulang proyek beserta folder api dan vercel.json.' : 'Server room tidak memberi respons yang valid. Coba lagi sebentar.'); e.status = response.status; throw e; }
    if (!response.ok) { const e = new Error(data.error || 'Koneksi belum berhasil.'); e.status = response.status; throw e; }
    return data;
  }
  async function requestWithTimeout(path, body) {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 12000);
    try { return await request(path, body, abort.signal); }
    catch (error) {
      if (error.name === 'AbortError') throw new Error('Server terlalu lama merespons. Coba lagi sebentar.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  function setNetwork(ok) {
    const el = view?.game.querySelector('#room-network');
    if (el) { el.textContent = ok ? '● LIVE / TERSAMBUNG' : '○ MENGHUBUNGKAN ULANG…'; el.classList.toggle('offline', !ok); }
    const form = view?.game.querySelector('#room-answer');
    if (form) for (const input of form.elements) input.disabled = !ok || !!room?.paused || !!mine()?.solved || busy;
  }
  function stopPolling() { clearTimeout(timer); timer = null; controller?.abort(); controller = null; }
  async function poll() {
    if (!mounted || !session) return;
    const epoch = ticket;
    const abort = new AbortController(); controller = abort; const timeout = setTimeout(() => abort.abort(), 9000);
    try {
      const data = await request(`/api/rooms/${session.code}/command`, { action: 'poll' }, abort.signal);
      if (!mounted || epoch !== ticket) return;
      const recovering = failures > 0; failures = 0; receive(data.room); setNetwork(true); if (recovering) status('Koneksi pulih. Kamu kembali di kanal tim.');
    } catch (error) {
      if (!mounted || epoch !== ticket) return;
      failures++; setNetwork(false);
      if ([401, 404, 410].includes(error.status)) { clearSession(); renderEntry(); status(error.message, true); return; }
      status('Koneksi terputus. Sedang mencoba kembali; jawaban dan progres tim tetap di server.', true);
    } finally {
      clearTimeout(timeout); if (controller === abort) controller = null;
      if (mounted && session && epoch === ticket) timer = setTimeout(poll, Math.min(5000, 1200 + failures * 650));
    }
  }
  function receive(next) {
    if (room && room.code === next.code && room.revision > next.revision) return;
    const previous = room; room = next;
    const nextKey = [room.code, room.phase, room.stageId, mine()?.role, mine()?.solved, mine()?.hinted, mine()?.ready, isHost(), room.phase === 'lobby' ? room.players.map(p => p.id + p.role).join(',') : ''].join(':');
    if (nextKey !== key) { key = nextKey; renderRoom(); }
    else updateLive();
    if (previous && previous.stageId !== next.stageId) sound('success');
    if (previous?.phase !== room.phase && ['result', 'finished'].includes(room.phase)) sound('complete');
    if (previous?.phase !== room.phase && room.phase === 'failed') sound('failure');
    setActive(true);
  }
  function shell(content, art = 'hub') {
    cancelAnimationFrame(crewFrame); crewFrame = null;
    view.game.innerHTML = view.scene(`<div class="room-top"><button class="back-button" type="button" data-room-action="exit">← ${room ? 'KELUAR ROOM' : 'MAIN MENU'}</button><div class="scene-title">TEAM CHANNEL<small>2–4 PLAYERS / MULTIPLAYER</small></div><span id="room-network" class="room-network">${room ? '● LIVE / TERSAMBUNG' : 'NOVARIS / CO-OP'}</span></div>${content}`, 'room-scene');
    view.mount(art);
  }
  function renderEntry() {
    const invitation = invitationCode();
    if (session) {
      shell(`<div class="room-entry"><p class="eyebrow text-cyan">KANAL TERSIMPAN / ${esc(session.code)}</p><h1>Kembali ke tim.</h1><p>Menyambungkan kembali sesi di perangkat ini…</p><p id="room-feedback" class="feedback" role="status" aria-live="polite"></p>${button('forget', 'PAKAI SESI BARU')}</div>`); return;
    }
    shell(`<div class="room-entry"><div class="room-entry-head"><p class="eyebrow text-cyan">SATU KOTA. EMPAT OPERATOR.</p><h1>Masuk satu frekuensi.</h1><p>Temanmu di mana pun. Pecahkan sandi dari layar masing-masing, pulihkan enam distrik bersama.</p></div><div class="room-onboarding"><span><b>01</b> Buat atau gabung room</span><span><b>02</b> Semua tekan Siap</span><span><b>03</b> Host mulai misi</span></div><form id="room-entry-form" novalidate><label class="field-label" for="room-name">CALLSIGN KAMU</label><input id="room-name" name="name" class="text-input" maxlength="16" placeholder="Misalnya: ECHO" autocomplete="nickname" value="${esc(view.callsign === 'RUNNER' ? '' : view.callsign || '')}"><div class="room-entry-columns"><section><p class="eyebrow">BUKA KANAL BARU</p><h2>Ajak timmu.</h2><p>Kamu menjadi host. Bagikan kode room ke maksimal 3 teman.</p><button type="submit" name="intent" value="create" class="button primary">BUAT ROOM <span>＋</span></button></section><section><p class="eyebrow">PUNYA KODE DARI TEMAN?</p><label class="field-label" for="room-code">KODE ROOM / 6 KARAKTER</label><input id="room-code" name="code" class="text-input room-code-input" maxlength="6" placeholder="ABC234" value="${esc(/^[A-Z2-9]{6}$/.test(invitation) ? invitation : '')}" autocomplete="off" autocapitalize="characters" spellcheck="false"><button type="submit" name="intent" value="join" class="button ghost">GABUNG ROOM →</button></section></div><p id="room-feedback" class="feedback" role="status" aria-live="polite">${location.protocol === 'file:' ? 'Mode ini memerlukan server. Buka game melalui link online atau server lokal.' : 'Tidak perlu akun. Callsign dan kode room sudah cukup.'}</p></form><p class="room-fineprint">Mode solo dan co-op satu perangkat tetap tersedia di menu utama.</p></div>`);
  }
  function rosterHTML() {
    return Array.from({ length: 4 }, (_, i) => {
      const p = room.players.find(q => q.slot === i), state = !p ? 'MENUNGGU OPERATOR' : !p.connected ? 'KONEKSI TERPUTUS' : room.phase === 'lobby' ? p.ready ? 'SIAP BERANGKAT' : 'BELUM SIAP' : p.solved ? 'PAKET TERVERIFIKASI' : 'MENGHITUNG…';
      const role = p && roleFor(p);
      return `<div class="room-player ${!p ? 'empty' : p.solved || p.ready && room.phase === 'lobby' ? 'player-ready' : ''}" style="--player-color:${role?.color || colors[i]}"><span class="room-avatar" aria-hidden="true">${p ? `<img src="${portrait(role.id)}" alt="">` : '+'}</span><span class="room-player-copy"><strong>${p ? esc(p.name) : 'SLOT 0' + (i + 1)} ${p?.id === room.you ? '<small>KAMU</small>' : ''}</strong>${role ? `<em>${role.name} / ${esc(role.role)}</em>` : ''}<span>${state}</span></span>${p?.host ? '<b class="host-badge">HOST</b>' : ''}${p && !p.connected && isHost() ? button('remove', 'KELUARKAN', false, `data-player-id="${p.id}"`) : ''}</div>`;
    }).join('');
  }
  const pausedHTML = () => room.paused ? `<strong>MISI DIJEDA</strong> ${room.players.length < 2 ? 'Minimal 2 pemain diperlukan. Host dapat membuka lobby untuk mengundang teman lagi.' : 'Menunggu teman tersambung kembali. Host dapat mengeluarkan pemain yang terputus.'}` : '';
  function footer() { return '<p id="room-feedback" class="feedback" role="status" aria-live="polite"></p>'; }
  function operatorPicker() {
    return `<div class="operator-picker-head"><p class="eyebrow">PILIH OPERATOR / SATU KARAKTER PER PEMAIN</p><p>Tampilan, peralatan, dan tugas matematika setiap operator berbeda.</p></div><div class="operator-picker" role="group" aria-label="Pilih karakter">${room.operators.map(r => {
      const owner = room.players.find(p => p.role === r.id), selected = owner?.id === room.you;
      return `<button type="button" class="operator-card" data-room-action="role" data-role="${r.id}" style="--operator-color:${r.color}" aria-label="Pilih ${r.name}, ${esc(r.role)}" aria-pressed="${selected}" ${owner && !selected ? 'disabled' : ''}><span class="operator-card-tag">${selected ? 'KARAKTERMU' : owner ? esc(owner.name) : 'TERSEDIA'}</span><canvas width="128" height="160" data-operator="${r.id}" aria-hidden="true"></canvas><strong>${r.name}</strong><b>${esc(r.role)}</b><span class="operator-specialty">${esc(r.specialty)}</span><small>${esc(r.gear)}</small></button>`;
    }).join('')}</div>`;
  }
  function teamObjective() {
    return `<div class="team-objective"><p class="eyebrow">TUJUAN BERSAMA / ${room.players.filter(p => p.solved).length} DARI ${room.players.length} KONTRIBUSI</p><p>${esc(room.teamGoal)}</p><div class="team-task-track">${room.players.map(p => { const r = roleFor(p); return `<span class="${p.solved ? 'done' : ''}" style="--operator-color:${r.color}"><b>${p.solved ? '✓' : '○'} ${r.name}</b><small>${esc(p.task)}</small></span>`; }).join('')}</div></div>`;
  }
  function animateOperators() {
    const canvases = [...view.game.querySelectorAll('canvas[data-operator]')];
    if (!canvases.length || !window.CharacterArt) return;
    const reduced = document.body.classList.contains('reduce-motion');
    let last = -100;
    const frame = ms => {
      if (!mounted) return;
      if (ms - last > 100) { last = ms; for (const canvas of canvases) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 128, 160); ctx.fillStyle = '#5a758922'; ctx.fillRect(13, 144, 102, 1); CharacterArt.draw(ctx, canvas.dataset.operator, { x: 64, y: 144, scale: 2.7, time: ms / 1000, reduced, wave: canvas.dataset.operator === mine()?.role && (ms / 1000) % 8 > 6.5 }); } }
      if (!reduced) crewFrame = requestAnimationFrame(frame);
    }; frame(0);
  }
  function renderRoom() {
    const host = isHost(), p = mine();
    const oldForm = view.game.querySelector('#room-answer');
    const draft = oldForm?.dataset.stage === room.stageId ? Array.from(oldForm.elements, input =>
      ({ name: input.name, value: input.value, type: input.type, checked: input.checked })).filter(input => input.name) : [];
    const sidebar = `<aside class="room-sidebar"><div class="room-code-block"><span class="eyebrow">KODE ROOM</span><strong>${esc(room.code)}</strong><span id="room-count">${room.players.length}/4 OPERATOR</span>${button('copy', 'SALIN UNDANGAN')}</div><div id="room-roster" class="room-roster">${rosterHTML()}</div><div class="room-team-stats"><span><small>NYAWA TIM</small><b id="room-health">${'♥'.repeat(room.health)}${'♡'.repeat(3 - room.health)}</b></span><span><small>SKOR TIM</small><b id="room-total">${room.total} PTS</b></span></div><details class="room-guide"><summary>CARA MAIN +</summary><p>Semua tekan Siap, lalu host mulai misi. Setiap pemain mengerjakan paket sendiri. Setelah semua benar, tahap berikutnya terbuka. Jawaban salah mengurangi 1 dari 3 nyawa tim. Hint mengurangi 25 poin tim. Tanpa timer.</p></details><p class="room-save-note">Refresh halaman untuk menyambung kembali. Sesi room tersimpan di tab ini; campaign solo tetap aman.</p></aside>`;
    let main = '';
    if (room.phase === 'lobby') main = `<div class="room-mission-head"><p class="eyebrow text-cyan">THE SAFEHOUSE / TEAM ASSEMBLY</p><h1>Empat peran. Satu tujuan.</h1><p>Bangun timmu untuk memulihkan Novaris. Pilih operator yang masih tersedia, lalu tekan Siap. Setiap orang memegang bagian misi yang berbeda.</p></div>${operatorPicker()}<div class="room-rules"><p><b>6 distrik / 30 tahap</b> / kata, angka, pilihan, dan urutan tugas diacak setiap sesi.</p><p><b>Tugas berganti tiap tahap</b> / enkripsi, dekripsi, perbaikan, pemilihan paket, komposisi, dan kalibrasi.</p><p><b>Satu hasil tim</b> / distrik pulih setelah seluruh anggota menyelesaikan tugas.</p></div><div class="room-action-row">${button('ready', p.ready ? '✓ KAMU SUDAH SIAP / BATAL' : 'SAYA SIAP', !p.ready)}${host ? button('start', 'MULAI MISI →', true, 'id="room-start"') : '<span class="room-host-note">Host akan memulai setelah semua siap.</span>'}</div><p id="room-ready-note" class="room-host-note"></p>${footer()}`;
    else if (room.phase === 'playing') { const r = roleFor(p); main = `<div class="room-mission-head"><p class="eyebrow text-amber">M${String(room.mission + 1).padStart(2, '0')} / ${esc(room.district)} / TAHAP ${room.stage + 1} DARI ${room.stages}</p><h1>${esc(room.title)}</h1></div><div id="room-team-objective">${teamObjective()}</div><div class="operator-assignment" style="--operator-color:${r.color}"><canvas width="128" height="160" data-operator="${r.id}" aria-hidden="true"></canvas><div><p class="eyebrow">${r.name} / ${esc(r.role)}</p><h2>${esc(room.challenge.task || 'Verifikasi paket')}</h2><p>${p.solved ? 'Kontribusimu sudah siap. Bantu teman mengecek hitungan; tim masih membutuhkan semua bagian.' : esc(room.challenge.objective)}</p></div></div><div id="room-paused" class="room-paused" role="status" ${room.paused ? '' : 'hidden'}>${pausedHTML()}</div>${p.solved ? `<div class="room-verified"><span>✓</span><h2>Tugasmu selesai.</h2><p id="room-waiting">${room.players.filter(q => q.solved).length}/${room.players.length} operator selesai.</p><p>Bagianmu sudah tersambung. Misi lanjut ketika seluruh kontribusi lengkap.</p></div>` : challengeHTML(room.challenge)}${footer()}`; }
    else {
      const failed = room.phase === 'failed', final = room.phase === 'finished';
      const original = window.Cipher.missions[room.mission];
      main = `<div class="room-mission-head"><p class="eyebrow ${failed ? 'text-amber' : 'text-green'}">${failed ? 'SIGNAL INTEGRITY / 0 OF 3' : esc(room.district) + ' / CONNECTED'}</p><h1>${failed ? 'Sinyal terputus.' : final ? 'Novaris kembali bersuara.' : 'Distrik tersambung.'}</h1><p>${failed ? 'Nyawa tim habis. Diskusikan rumusnya, lalu host dapat mencoba ulang misi ini. Poin distrik sebelumnya tetap ada.' : esc(original.story)}</p></div><div class="room-result-score"><span>${room.total}<small>POIN TIM</small></span><span>${room.records.length}/6<small>DISTRIK</small></span><span>${room.players.length}<small>OPERATOR</small></span></div>${!failed ? `<div id="room-team-objective">${teamObjective()}</div><div class="math-explanation"><strong>CATATAN ARIA / ${esc(room.debrief?.task || 'CONTOH PEMBAHASAN')}</strong>${esc(room.debrief?.explanation || original.explanation)}<p>Pembahasan ini untuk tugasmu. Temanmu menerima paket sesuai perannya.</p></div>` : ''}<div class="room-action-row">${host ? button(failed ? 'retry' : final ? 'lobby' : 'next', failed ? 'COBA LAGI BERSAMA →' : final ? 'MAIN LAGI / LOBBY' : 'LANJUT KE DISTRIK BERIKUTNYA →', true) : '<p class="room-host-note">Menunggu host melanjutkan…</p>'}</div>${footer()}`;
    }
    shell(`<div class="room-layout">${sidebar}<section class="room-main">${main}<div class="room-channel-log"><p class="eyebrow">CHANNEL LOG / LIVE</p><ol id="room-events"></ol></div>${host && room.phase !== 'lobby' && room.phase !== 'finished' ? button('resetLobby', 'BUKA LOBBY BARU / RESET PROGRES') : ''}</section></div>`, room.phase === 'playing' || room.phase === 'failed' ? 'terminal' : 'hub');
    window.CipherAudio?.setScene(room.phase === 'playing' ? 'puzzle' : room.phase === 'lobby' ? 'hub' : room.phase === 'failed' ? 'failed' : 'result');
    updateLive();
    const newForm = view.game.querySelector('#room-answer');
    if (newForm && draft.length) {
      for (const input of newForm.elements) {
        const saved = draft.find(item => item.name === input.name && item.type === input.type && (input.type !== 'radio' || item.value === input.value));
        if (!saved) continue;
        if (input.type === 'radio') input.checked = saved.checked;
        else input.value = saved.value;
      }
    }
    animateOperators();
  }
  function challengeHTML(c) {
    let fields = '';
    if (c.kind === 'encode') fields = `<p class="transmission-label">OUTGOING MESSAGE / ${c.plain}</p><div class="room-letter-inputs">${[...c.plain].map((char, i) => `<label><span>${char}<small>= ${char.charCodeAt(0) - 64}</small></span><input class="text-input" name="value-${i}" aria-label="Sandi huruf ${char} posisi ${i + 1}" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="?"></label>`).join('')}</div>`;
    else if (c.kind === 'decode') fields = `<p class="transmission-label">INCOMING MESSAGE</p><div class="ciphertext">[${c.cipher.join(', ')}]</div><label class="field-label" for="room-decoded">KATA HASIL DEKRIPSI</label><input id="room-decoded" class="text-input decode-input" name="decoded" aria-label="Kata hasil dekripsi" autocomplete="off" autocapitalize="characters" maxlength="32" placeholder="KETIK KATA…">`;
    else if (c.kind === 'sequence' || c.kind === 'composition') fields = `<div class="options">${c.options.map((option, i) => `<label class="option"><input type="radio" name="option" value="${i}"><span class="option-content"><span class="option-key">0${i + 1}</span><span>${c.kind === 'sequence' ? '[' + option.join(', ') + ']' : `${option.a}x + ${option.b}`}</span></span></label>`).join('')}</div>`;
    else if (c.kind === 'calibrate') fields = `<p class="transmission-label">HASIL PENGUKURAN / DUA TITIK</p><div class="calibration-samples">${c.samples.map((p, i) => `<div><small>SAMPEL 0${i + 1}</small><b>x = ${p.x}</b><span>y = ${p.y}</span></div>`).join('')}</div><div class="calibration-inputs"><label class="field-label">KOEFISIEN a<input class="text-input" name="a" aria-label="Koefisien a" inputmode="numeric" maxlength="6" placeholder="?"></label><label class="field-label">KONSTANTA b<input class="text-input" name="b" aria-label="Konstanta b" inputmode="numeric" maxlength="6" placeholder="?"></label></div>`;
    else fields = `<p class="transmission-label">DIAGNOSTIC LOG / ${c.plain}</p><div class="options">${[...c.plain].map((char, i) => `<label class="option"><input type="radio" name="row" value="${i}"><span class="option-content"><span class="option-key">${char}</span><span>${c.fn.a}(${char.charCodeAt(0) - 64}) + ${c.fn.b} = ${c.values[i]}</span></span></label>`).join('')}</div><label class="field-label" for="room-repair">HASIL YANG BENAR</label><input class="text-input" id="room-repair" name="value" inputmode="numeric" maxlength="6" placeholder="?">`;
    const fn = c.kind === 'composition' ? `f(x) = ${c.f.a}x + ${c.f.b} · g(x) = ${c.g.a}x + ${c.g.b}` : c.kind === 'calibrate' ? 'y = ax + b / tentukan a dan b' : c.kind === 'decode' ? `E⁻¹(y) = (y − ${c.fn.b}) / ${c.fn.a}` : `E(x) = ${c.fn.a}x + ${c.fn.b}`;
    const reference = c.kind === 'calibrate' ? 'Gunakan dua pasangan (x, y) dari pengukuran mesin.' : c.kind === 'composition' ? 'URUTAN: g TERLEBIH DAHULU, LALU f.' : 'A = 1 · B = 2 · … · Z = 26';
    const alphabet = ['calibrate', 'composition'].includes(c.kind) ? '' : `<details class="room-alphabet"><summary>LIHAT NOMOR HURUF +</summary><p>${Array.from({ length: 26 }, (_, i) => `${String.fromCharCode(65 + i)}=${i + 1}`).join(' · ')}</p></details>`;
    return `<div class="room-terminal"><div class="terminal-chrome"><span>PAKET PRIBADI / ${esc(mine().name)}</span><div class="terminal-leds"><i></i><i></i><i></i></div></div><div class="room-terminal-content"><p class="eyebrow text-cyan">${c.type}</p><div class="function-strip">${fn}<small>${reference}</small></div><form id="room-answer" data-stage="${esc(room.stageId)}" novalidate>${fields}<div class="room-action-row"><button type="submit" class="button primary">KIRIM JAWABAN →</button>${button('hint', mine().hinted ? 'HINT TERBUKA' : 'HINT / −25 POIN TIM', false, mine().hinted ? 'disabled' : '')}</div></form>${c.hint ? `<div class="hint-message"><small>ARIA / PETUNJUK PAKETMU</small>${esc(c.hint)}</div>` : ''}${alphabet}</div></div>`;
  }
  function updateLive() {
    if (!view || !room) return;
    const set = (selector, html) => { const el = view.game.querySelector(selector); if (el && el.innerHTML !== html) el.innerHTML = html; };
    set('#room-roster', rosterHTML()); set('#room-count', `${room.players.length}/4 OPERATOR`);
    set('#room-health', '♥'.repeat(room.health) + '♡'.repeat(3 - room.health)); set('#room-total', room.total + ' PTS');
    set('#room-events', room.events.slice(-5).reverse().map(e => `<li>${esc(e.text)}</li>`).join(''));
    set('#room-waiting', `${room.players.filter(p => p.solved).length}/${room.players.length} operator selesai.`);
    set('#room-team-objective', teamObjective());
    const ready = room.players.length >= 2 && room.players.every(p => p.ready && p.connected);
    const start = view.game.querySelector('#room-start'); if (start) start.disabled = !ready || busy;
    set('#room-ready-note', ready ? 'Semua operator siap. Host bisa memulai.' : 'Butuh minimal 2 pemain dan semua menekan Saya Siap.');
    const banner = view.game.querySelector('#room-paused'); if (banner) { banner.hidden = !room.paused; set('#room-paused', pausedHTML()); }
    setNetwork(failures === 0);
  }
  function parseAnswer(form) {
    const f = new FormData(form), c = room.challenge;
    const integer = value => { if (value === null || !/^-?\d+$/.test(String(value).trim()) || !Number.isSafeInteger(Number(value))) throw new Error('Isi semua kolom dengan bilangan bulat. Nyawa tidak berkurang.'); return Number(value); };
    if (c.kind === 'encode') return [...c.plain].map((_, i) => integer(f.get('value-' + i)));
    if (c.kind === 'decode') { const word = String(f.get('decoded') || '').trim().toUpperCase(); if (!/^[A-Z ]{1,32}$/.test(word)) throw new Error('Isi kata menggunakan huruf A–Z. Nyawa tidak berkurang.'); return word; }
    if (c.kind === 'sequence' || c.kind === 'composition') return integer(f.get('option'));
    if (c.kind === 'calibrate') return { a: integer(f.get('a')), b: integer(f.get('b')) };
    return { row: integer(f.get('row')), value: integer(f.get('value')) };
  }
  async function send(action, extra = {}) {
    if (!session || busy) return;
    busy = true; updateLive(); const epoch = ticket;
    try {
      const result = await requestWithTimeout(`/api/rooms/${session.code}/command`, { action, requestId: nonce(), stageId: room.stageId, ...extra });
      if (!mounted || ticket !== epoch) return;
      if (action === 'leave') { clearSession(); replaceInvitation(''); exit(); return; }
      failures = 0; receive(result.room); status(result.message || '', result.correct === false);
      if (result.correct !== undefined) sound(result.correct ? 'success' : 'error');
      if (action === 'hint') sound('hint');
    } catch (error) {
      if (!mounted || ticket !== epoch) return;
      if ([401, 404, 410].includes(error.status)) {
        clearSession();
        if (action === 'leave') { replaceInvitation(''); exit(); return; }
        renderEntry();
      }
      status(error.message || 'Koneksi terputus. Coba lagi.', true);
    }
    finally { if (mounted && ticket === epoch) { busy = false; if (room) updateLive(); } }
  }
  async function enter(form, intent) {
    if (busy) return;
    const f = new FormData(form), name = String(f.get('name') || '').trim().toUpperCase(), code = String(f.get('code') || '').trim().toUpperCase();
    if (!/^[A-Z0-9 _-]{1,16}$/.test(name)) return status('Isi callsign 1–16 huruf, angka, spasi, - atau _.', true);
    if (intent === 'join' && !/^[A-Z2-9]{6}$/.test(code)) return status('Isi kode room 6 karakter dari temanmu.', true);
    busy = true; const epoch = ticket;
    for (const el of form.querySelectorAll('button')) el.disabled = true;
    status(intent === 'join' ? 'Menghubungkan ke room…' : 'Membuka kanal tim…');
    try {
      const result = await requestWithTimeout(intent === 'join' ? `/api/rooms/${code}/join` : '/api/rooms/create', { name });
      if (!mounted || epoch !== ticket) return;
      session = { code: result.room.code, secret: result.secret }; replaceInvitation(session.code); save(); sound('confirm'); failures = 0; receive(result.room); poll();
    } catch (error) { if (mounted && epoch === ticket) { status(error.message, true); for (const el of form.querySelectorAll('button')) el.disabled = false; } }
    finally { if (mounted && ticket === epoch) { busy = false; if (room) updateLive(); } }
  }
  async function copyInvitation() {
    const url = new URL(networkInfo?.shareUrl || location.href); url.search = ''; url.searchParams.set('room', room.code); url.hash = '';
    const text = `Main CIPHER OPS bareng!\n${url.href}\nKode room: ${room.code}`;
    try { await navigator.clipboard.writeText(text); status('Link dan kode room tersalin. Kirim ke temanmu.'); }
    catch (_) { const field = view.game.querySelector('#room-feedback'); field.innerHTML = `<label>Salin undangan:<textarea class="text-input room-invitation" readonly aria-label="Undangan room">${esc(text)}</textarea></label>`; const area = field.querySelector('textarea'); area.focus(); area.select(); }
  }
  function exit() { const callback = view?.exit; destroy(); callback?.(); }
  function destroy() {
    cancelAnimationFrame(crewFrame); crewFrame = null;
    mounted = false; ticket++; stopPolling(); view?.game.removeEventListener('click', onClick); view?.game.removeEventListener('submit', onSubmit); view?.game.removeEventListener('keydown', onKeyDown); view = null; key = ''; busy = false;
    setActive(false);
  }
  function onClick(event) {
    const el = event.target.closest('[data-room-action]'); if (!el || el.disabled) return;
    const action = el.dataset.roomAction; sound('click');
    if (action === 'copy') return copyInvitation();
    if (action === 'exit') {
      if (!session) return exit();
      return view.confirm('KELUAR DARI ROOM?', 'Kamu akan meninggalkan tim. Jika ingin menyambung lagi tanpa keluar, cukup refresh halaman.', 'KELUAR ROOM', () => send('leave'));
    }
    if (action === 'forget') { clearSession(); renderEntry(); return; }
    if (action === 'resetLobby' || action === 'lobby') return view.confirm('BUKA LOBBY BARU?', 'Progres sesi tim akan direset agar pemain dapat bergabung untuk permainan baru.', 'BUKA LOBBY', () => send('lobby'));
    if (action === 'ready') return send('ready', { ready: !mine().ready });
    if (action === 'role') return send('role', { role: el.dataset.role });
    if (action === 'remove') return send('remove', { playerId: el.dataset.playerId });
    return send(action);
  }
  function onSubmit(event) {
    if (!['room-entry-form', 'room-answer'].includes(event.target.id)) return;
    event.preventDefault();
    if (event.target.id === 'room-entry-form') return enter(event.target, event.submitter?.value || (String(new FormData(event.target).get('code') || '').trim() ? 'join' : 'create'));
    try { send('answer', { answer: parseAnswer(event.target) }); } catch (error) { status(error.message, true); }
  }
  function onKeyDown(event) {
    if (event.key !== 'Enter' || event.isComposing || event.target.id !== 'room-code' || !event.target.form) return;
    event.preventDefault();
    return enter(event.target.form, 'join');
  }
  function mount(options) {
    destroy(); mounted = true; ticket++; view = options; room = null; key = ''; failures = 0;
    try { session = JSON.parse(sessionStorage.getItem(SESSION)); if (!session || !/^[A-Z2-9]{6}$/.test(session.code) || typeof session.secret !== 'string') session = null; } catch (_) { session = null; }
    const invitation = invitationCode();
    if (invitation && session?.code !== invitation) session = null;
    networkInfo = null;
    const epoch = ticket;
    view.game.addEventListener('click', onClick); view.game.addEventListener('submit', onSubmit); view.game.addEventListener('keydown', onKeyDown); renderEntry();
    if (session) poll();
    fetch('/api/health', { cache: 'no-store' }).then(r => r.json()).then(data => { if (mounted && ticket === epoch && data?.ok) networkInfo = data; }).catch(() => {});
  }
  const hasSavedSession = () => { try { const saved = JSON.parse(sessionStorage.getItem(SESSION)); return !!saved && /^[A-Z2-9]{6}$/.test(saved.code) && typeof saved.secret === 'string'; } catch (_) { return false; } };
  window.CipherRooms = { mount, destroy, isActive: () => mounted, hasRoom: () => !!session, hasSavedSession, hasInvitation: () => !!invitationCode(), leave: () => view?.game.querySelector('[data-room-action="exit"]')?.click() };
})();
