// Shared authoritative room rules. No browser, network, or storage dependencies.
import { OPERATORS, operatorFor, assignmentFor, assignmentAnswer, explainAssignment, TEAM_GOALS, stageCount } from './assignments.mjs';
export class RoomError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const fail = (condition, message, status) => { if (condition) throw new RoomError(message, status); };
export const TITLES = ['FIRST CONTACT', 'SECURE ACCESS', 'DOUBLE AGENT', 'INTERCEPTED SIGNAL', 'REPAIR THE SIGNAL', 'FINAL TRANSMISSION'];
export const DISTRICTS = ['Central Hub', 'Riverside', 'Data Spire', 'Old Sector', 'Skyline', 'Core'];
export const ONLINE_TIMEOUT = 18000;
export const ROOM_LIFETIME = 6 * 60 * 60 * 1000;
const encode = (word, fn) => [...word].map(c => fn.a * (c.charCodeAt(0) - 64) + fn.b);
const same = (a, b) => Array.isArray(a) && a.length === b.length && a.every((n, i) => n === b[i]);
const points = room => Math.max(0, 100 + (room.errors === 0 ? 50 : 0) - room.errors * 10 - room.hints * 25);
const token = () => crypto.randomUUID().replaceAll('-', '');
const connected = (p, now) => now - p.seen < ONLINE_TIMEOUT;
export function callsign(value) {
  const name = String(value || '').trim().toUpperCase();
  fail(!/^[A-Z0-9 _-]{1,16}$/.test(name), 'Callsign: gunakan 1–16 huruf, angka, spasi, - atau _.');
  return name;
}
export function createRoom(code, name, now = Date.now()) {
  const player = makePlayer(name, 0, now);
  const room = { code, hostId: player.id, created: now, updated: now, phase: 'lobby', challengeVersion: 3, seed: crypto.getRandomValues(new Uint32Array(1))[0], round: 0, mission: 0, stage: 0, stageId: token(), health: 3, errors: 0, hints: 0, total: 0, records: [], players: [player], events: [] };
  log(room, `${player.name} membuka kanal tim.`, now);
  return { room, player };
}
function makePlayer(name, slot, now) { return { id: token(), secret: token(), name: callsign(name), slot, role: OPERATORS[slot].id, seen: now, ready: false, solved: false, hinted: false, lastAttempt: 0, receipts: [] }; }
function log(room, text, now) { room.events.push({ id: token(), text, time: now }); room.events = room.events.slice(-12); }
export function maintain(room, now = Date.now()) {
  fail(now - room.updated > ROOM_LIFETIME, 'Room sudah kedaluwarsa. Buat room baru.', 410);
  const host = room.players.find(p => p.id === room.hostId);
  if (!host || !connected(host, now)) {
    const successor = room.players.find(p => connected(p, now));
    if (successor && successor.id !== room.hostId) { room.hostId = successor.id; log(room, `${successor.name} menjadi host.`, now); }
  }
}
export function joinRoom(room, name, now = Date.now()) {
  maintain(room, now);
  fail(room.phase !== 'lobby', 'Misi sudah berjalan. Tunggu host kembali ke lobby.', 409);
  fail(room.players.length >= 4, 'Room penuh. Maksimal 4 pemain.', 409);
  name = callsign(name);
  fail(room.players.some(p => p.name === name), 'Callsign sudah dipakai di room ini. Pilih nama lain.', 409);
  const slot = [0, 1, 2, 3].find(i => !room.players.some(p => p.slot === i));
  const player = makePlayer(name, slot, now); player.role = OPERATORS.find(r => !room.players.some(p => operatorFor(p).id === r.id)).id; room.players.push(player); room.updated = now;
  log(room, `${player.name} bergabung.`, now); return player;
}
export function authenticate(room, secret) {
  const p = room.players.find(p => p.secret === secret);
  fail(!p, 'Sesi pemain tidak ditemukan. Gabung kembali lewat kode room.', 401); return p;
}
export function challengeFor(room, player) {
  return room.challengeVersion >= 2 ? assignmentFor(room, player) : legacyChallengeFor(room, player);
}
function legacyChallengeFor(room, player) {
  const i = player.slot, m = room.mission, s = room.stage;
  const fn = m === 0 || m === 4 ? { a: 2, b: 3 } : m === 1 || m === 3 ? { a: 3, b: 2 } : { a: 6, b: 5 };
  const word = (m === 1 ? ['CAT', 'KEY', 'MAP', 'LOG'] : m === 3 ? ['CABIN', 'RADIO', 'TOWER', 'NORTH'] : m === 4 || m === 5 && s === 1 ? ['SAFE', 'CODE', 'LINK', 'WAVE'] : ['HI', 'GO', 'UP', 'OK'])[i];
  const common = { fn, type: m === 2 && s === 0 ? 'COMPOSITE FUNCTION' : m === 3 || m === 5 && s === 1 ? 'INVERSE FUNCTION' : m === 4 ? 'SIGNAL DIAGNOSTICS' : 'LINEAR FUNCTION' };
  if (m === 2 && s === 0) return { ...common, kind: 'composition', f: { a: 3, b: 2 }, g: { a: 2, b: 1 }, options: [{ a: 6, b: 4 }, { a: 5, b: 3 }, { a: 6, b: 5 }, { a: 6, b: 3 }], objective: 'Jalankan g(x) = 2x + 1, lalu f(x) = 3x + 2. Pilih (f ∘ g)(x).', hint: 'Substitusi g ke f: 3(2x + 1) + 2. Buka kurung, lalu jumlahkan konstanta.' };
  if (m === 3 || m === 5 && s === 1) return { ...common, kind: 'decode', cipher: encode(word, fn), objective: 'Baca paket masuk memakai fungsi invers. Temukan kata aslinya.', hint: `Kurangi setiap angka dengan ${fn.b}, lalu bagi ${fn.a}. Ubah hasilnya menjadi huruf: A=1, B=2, sampai Z=26.` };
  if (m === 4) {
    const row = i % word.length, values = encode(word, fn); values[row] -= 3;
    return { ...common, kind: 'repair', plain: word, values, objective: 'Pilih baris dengan perhitungan salah, lalu masukkan hasil yang benar.', hint: `Periksa baris huruf ${word[row]}. Hitung ulang 2 × nomor huruf + 3; perkalian lebih dahulu.` };
  }
  if (m === 1) {
    const expected = encode(word, fn), wrong = delta => expected.map((n, j) => j === 1 ? n + delta : n);
    const options = [wrong(-2), wrong(1), wrong(3), wrong(-1)]; options[(i + 1) % 4] = expected;
    return { ...common, kind: 'sequence', plain: word, options, objective: `Pilih urutan sandi yang benar untuk ${word}.`, hint: 'Ubah setiap huruf menjadi nomor urutnya, lalu hitung 3x + 2 secara terpisah.' };
  }
  return { ...common, kind: 'encode', plain: word, objective: `Enkripsi ${word}. Hitung setiap huruf secara terpisah dengan fungsi di bawah.`, hint: `A=1 sampai Z=26. Huruf pertama ${word[0]} = ${word.charCodeAt(0) - 64}. Kalikan dengan ${fn.a}, lalu tambah ${fn.b}.` };
}
function expectedFor(room, p) {
  const c = challengeFor(room, p);
  if (room.challengeVersion >= 2) return assignmentAnswer(c);
  if (c.kind === 'decode') return c.cipher.map(n => String.fromCharCode(64 + (n - c.fn.b) / c.fn.a)).join('');
  if (c.kind === 'composition') return 2;
  if (c.kind === 'sequence') return c.options.findIndex(a => same(a, encode(c.plain, c.fn)));
  if (c.kind === 'repair') return { row: p.slot % c.plain.length, value: encode(c.plain, c.fn)[p.slot % c.plain.length] };
  return encode(c.plain, c.fn);
}
function validAnswer(answer, c) {
  const integer = n => Number.isSafeInteger(n) && Math.abs(n) <= 100000;
  if (c.kind === 'encode') return Array.isArray(answer) && answer.length === c.plain.length && answer.every(integer);
  if (c.kind === 'decode') return typeof answer === 'string' && /^[A-Z ]{1,32}$/.test(answer);
  if (c.kind === 'calibrate') return answer && integer(answer.a) && answer.a !== 0 && integer(answer.b);
  if (c.kind === 'sequence' || c.kind === 'composition') return integer(answer) && answer >= 0 && answer < c.options.length;
  return answer && integer(answer.row) && answer.row >= 0 && answer.row < c.plain.length && integer(answer.value);
}
function paused(room, now) { return room.players.length < 2 || room.players.some(p => !connected(p, now)); }
function resetStage(room) {
  room.stageId = token();
  for (const p of room.players) { p.solved = false; p.hinted = false; p.lastAttempt = 0; }
}
function startMission(room, now) {
  room.phase = 'playing'; room.stage = 0; room.health = 3; room.errors = 0; room.hints = 0; resetStage(room);
  log(room, `M${room.mission + 1} / ${TITLES[room.mission]} dimulai.`, now);
}
function finishStage(room, now) {
  if (paused(room, now) || !room.players.every(p => p.solved)) return;
  if (room.stage + 1 < stageCount(room)) { room.stage++; resetStage(room); log(room, 'Semua paket terverifikasi. Tahap ' + (room.stage + 1) + '/' + stageCount(room) + ' terbuka.', now); }
  else {
    const score = points(room); room.total += score; room.records.push({ mission: room.mission, score }); room.phase = room.mission === 5 ? 'finished' : 'result';
    log(room, `${DISTRICTS[room.mission]} tersambung. +${score} poin tim.`, now);
  }
}
export function command(room, p, input, now = Date.now()) {
  p.seen = now; maintain(room, now); room.updated = now;
  const { action, requestId } = input;
  if (action === 'poll') { if (room.phase === 'playing') finishStage(room, now); return { message: '' }; }
  fail(typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(requestId), 'ID permintaan tidak valid.');
  const previous = p.receipts.find(r => r.id === requestId); if (previous) return previous.reply;
  const hostOnly = () => fail(p.id !== room.hostId, 'Hanya host yang bisa memakai kontrol ini.', 403);
  let reply = { message: '' };
  if (action === 'ready') { fail(room.phase !== 'lobby', 'Kesiapan hanya bisa diubah di lobby.', 409); p.ready = input.ready === true; }
  else if (action === 'role') {
    fail(room.phase !== 'lobby', 'Karakter hanya bisa diganti di lobby.', 409);
    fail(!OPERATORS.some(r => r.id === input.role), 'Karakter tidak dikenal.');
    fail(room.players.some(q => q.id !== p.id && operatorFor(q).id === input.role), 'Karakter itu sudah dipakai teman. Pilih yang masih tersedia.', 409);
    if (operatorFor(p).id !== input.role) { p.role = input.role; p.ready = false; log(room, `${p.name} memilih ${operatorFor(p).name} / ${operatorFor(p).role}.`, now); }
  }
  else if (action === 'start') {
    hostOnly(); fail(room.phase !== 'lobby', 'Misi sudah dimulai.', 409);
    fail(paused(room, now) || !room.players.every(q => q.ready), 'Butuh 2–4 pemain terhubung dan semuanya siap.', 409);
    room.challengeVersion ??= 3; room.seed ??= crypto.getRandomValues(new Uint32Array(1))[0];
    startMission(room, now);
  } else if (action === 'answer' || action === 'hint') {
    fail(room.phase !== 'playing' || input.stageId !== room.stageId, 'Tahap sudah berubah. Jawaban ini tidak mengurangi nyawa.', 409);
    fail(paused(room, now), 'Misi dijeda. Tunggu teman tersambung kembali.', 409);
    fail(p.solved, 'Paketmu sudah benar. Tunggu teman menyelesaikan paket mereka.', 409);
    if (action === 'hint') { if (!p.hinted) { p.hinted = true; room.hints++; log(room, `${p.name} membuka hint (−25 poin tim).`, now); } reply.message = 'Hint terbuka. Nyawa tetap.'; }
    else {
      const c = challengeFor(room, p), answer = input.answer;
      fail(!validAnswer(answer, c), 'Isi jawaban sesuai format. Nyawa tidak berkurang.');
      fail(p.lastAttempt > 0 && now - p.lastAttempt < 900, 'Tunggu sebentar sebelum mengirim ulang.', 429);
      const expected = expectedFor(room, p);
      const correct = c.kind === 'encode' ? same(answer, expected) : c.kind === 'calibrate' ? answer.a === expected.a && answer.b === expected.b : c.kind === 'repair' ? answer.row === expected.row && answer.value === expected.value : answer === expected;
      p.lastAttempt = now;
      if (correct) { p.solved = true; log(room, `${p.name}: paket terverifikasi.`, now); finishStage(room, now); reply = { correct: true, message: 'Jawaban benar. Paketmu sudah terverifikasi!' }; }
      else { room.health--; room.errors++; log(room, `${p.name}: sinyal belum cocok. Sisa ${room.health} nyawa tim.`, now); if (room.health === 0) room.phase = 'failed'; reply = { correct: false, message: 'Belum tepat. Periksa lagi perhitungannya; satu nyawa tim berkurang.' }; }
    }
  } else if (action === 'next') { hostOnly(); fail(room.phase !== 'result', 'Misi belum selesai.', 409); fail(paused(room, now), 'Tunggu semua pemain tersambung.', 409); room.mission++; startMission(room, now); }
  else if (action === 'retry') { hostOnly(); fail(room.phase !== 'failed', 'Retry tersedia ketika nyawa habis.', 409); fail(paused(room, now), 'Tunggu semua pemain tersambung.', 409); startMission(room, now); }
  else if (action === 'lobby') { hostOnly(); room.phase = 'lobby'; room.challengeVersion = 3; room.seed ??= crypto.getRandomValues(new Uint32Array(1))[0]; room.round = (room.round || 0) + 1; room.mission = 0; room.total = 0; room.records = []; resetStage(room); for (const q of room.players) q.ready = false; log(room, 'Host membuka sesi baru. Progres tim direset; paket soal baru disiapkan.', now); }
  else if (action === 'remove') {
    hostOnly(); const target = room.players.find(q => q.id === input.playerId);
    fail(!target || target.id === p.id || connected(target, now), 'Hanya pemain yang terputus yang dapat dikeluarkan.', 409);
    room.players = room.players.filter(q => q !== target); log(room, `${target.name} dikeluarkan dari kanal.`, now);
    if (room.phase === 'playing') finishStage(room, now);
  } else if (action === 'leave') {
    room.players = room.players.filter(q => q !== p); log(room, `${p.name} keluar dari room.`, now); maintain(room, now);
    if (room.phase === 'playing') finishStage(room, now);
  } else throw new RoomError('Perintah tidak dikenal.');
  p.receipts.push({ id: requestId, reply }); p.receipts = p.receipts.slice(-20); return reply;
}
export function snapshot(room, p, now = Date.now()) {
  const c = room.phase === 'playing' ? challengeFor(room, p) : null;
  if (c && !p.hinted) delete c.hint;
  return {
    code: room.code, you: p.id, hostId: room.hostId, phase: room.phase, mission: room.mission, stage: room.stage, stageId: room.stageId,
    title: TITLES[room.mission], district: DISTRICTS[room.mission], stages: stageCount(room),
    health: room.health, errors: room.errors, hints: room.hints, total: room.total, potential: points(room), records: room.records,
    paused: room.phase !== 'lobby' && paused(room, now), challenge: c, events: room.events, operators: OPERATORS, teamGoal: TEAM_GOALS[room.mission],
    debrief: room.challengeVersion >= 2 && ['result', 'finished'].includes(room.phase) ? { task: assignmentFor(room, p).task, explanation: explainAssignment(assignmentFor(room, p)) } : null,
    players: room.players.map(q => ({ id: q.id, name: q.name, slot: q.slot, role: operatorFor(q).id, task: room.challengeVersion >= 2 ? assignmentFor(room, q).task : 'Verifikasi paket', host: q.id === room.hostId, ready: q.ready, solved: q.solved, hinted: q.hinted, connected: connected(q, now) }))
  };
}
