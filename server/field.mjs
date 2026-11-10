import { BANKS, parseAnswer } from './field-puzzles.mjs';
import '../js/course.js';

const course = globalThis.CipherCourse;
const isTraining = room => room.mode === 'training';
const bankFor = room => (isTraining(room) ? course.BANKS : BANKS)[room.mission];

const ROLES = ['kai', 'nyx', 'bolt', 'iris'];
const BOUNDS = { minX: 36, minY: 62, maxX: 924, maxY: 483, radius: 8, speed: 160, cell: 10 };
const SPAWN = { x: 122, y: 411 };
const RANGE = 53;
const points = [[255, 405], [174, 177], [763, 174], [686, 406], [855, 393]];
const districts = [
  { base: 'Safehouse', names: ['Terminal Safehouse', 'Arsip', 'Bengkel Relay', 'Panel Menara', 'Pemancar Darurat'], palette: ['#132737', '#1a3542', '#6eebe0'], fault: 'Bengkel kehilangan daya', repair: 0, bypass: 3, prop: [647, 92, 88, 35], goal: 'Pulihkan relay darurat dan kirim jawaban ke markas.' },
  { base: 'Pos Kanal', names: ['Pintu Air', 'Pos Suar', 'Bengkel Pompa', 'Peta Kanal', 'Pemancar Dermaga'], palette: ['#122e37', '#1a4047', '#8fdfc2'], fault: 'Arus balik memutus panel pintu air', repair: 2, bypass: 1, prop: [680, 98, 84, 31], goal: 'Buka jalur kanal dan aktifkan pemancar dermaga.' },
  { base: 'Atrium Data', names: ['Penyandi', 'Arsip Berlapis', 'Rak Verifikasi', 'Peta Rak', 'Terminal Utama'], palette: ['#231e37', '#352a49', '#d0b1fc'], fault: 'Penyaring menyisipkan blok data palsu', repair: 2, bypass: 0, prop: [793, 230, 90, 27], goal: 'Satukan hasil decoding dan isolasi arsip yang tercemar.' },
  { base: 'Pos Lorong', names: ['Radio Lorong', 'Gudang Fragmen', 'Bengkel Antena', 'Papan Simbol', 'Stasiun CABIN'], palette: ['#2e2827', '#43352e', '#ffd29d'], fault: 'Sakelar lorong terjebak dalam siklus', repair: 0, bypass: 2, prop: [648, 225, 100, 28], goal: 'Gabungkan potongan peta untuk menemukan stasiun CABIN.' },
  { base: 'Akses Atap', names: ['Pemancar Atap', 'Spektrometer', 'Panel Daya', 'Peta Antena', 'Menara Skyline'], palette: ['#172637', '#2c3b54', '#ffd280'], fault: 'Beban puncak menurunkan tegangan pemancar', repair: 2, bypass: 3, prop: [659, 222, 116, 28], goal: 'Bagikan beban dan bangunkan menara Skyline.' },
  { base: 'Pos Core', names: ['Otorisasi', 'Konsol Invers', 'Sirkuit Inti', 'Router Cadangan', 'Pemancar Core'], palette: ['#2b2034', '#41304d', '#f5a9cf'], fault: 'Core mengisolasi router setelah alarm', repair: 1, bypass: 2, prop: [815, 223, 76, 32], goal: 'Verifikasi transmisi, stabilkan daya, dan hidupkan jaringan Novaris.' }
];
const commonWalls = [
  { x: 40, y: 244, w: 278, h: 18 },
  { x: 421, y: 244, w: 140, h: 18 },
  { x: 502, y: 65, w: 18, h: 140 },
  { x: 617, y: 307, w: 301, h: 18 }
];
const mapDetails = [
  { walls: [null, null, null, null] },
  { walls: [[42, 226, 240, 30], [410, 244, 153, 18], null, null], stations: [[260, 400], [240, 164], [763, 174], [699, 406], [857, 391]] },
  { walls: [null, [412, 244, 182, 18], [478, 65, 24, 140], null], stations: [[294, 391], [202, 155], [770, 172], [710, 410], [863, 391]] },
  { walls: [[42, 244, 232, 22], [384, 244, 160, 22], [480, 65, 26, 120], null], stations: [[249, 392], [151, 182], [815, 151], [675, 409], [855, 401]] },
  { walls: [[42, 244, 297, 18], null, [514, 65, 16, 129], null], stations: [[276, 392], [216, 151], [773, 173], [680, 416], [866, 406]] },
  { walls: [null, [436, 244, 130, 22], [500, 65, 26, 148], null], stations: [[252, 408], [201, 156], [800, 163], [701, 411], [861, 410]] }
];
const gate = { x: 545, y: 307, w: 72, h: 18 };
const dockGate = { x: 578, y: 244, w: 90, h: 18 };
const DIRECTIONS = ['up', 'down', 'left', 'right'];
const affected = [
  task => task.station === 2,
  task => task.station === 0 || task.index === 6,
  task => task.station === 1 || task.index === 4,
  task => task.index === 6 || task.index === 7,
  task => task.station === 0 || task.index === 5,
  task => task.station === 3 || task.index === 0
];
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function randomFor(room) {
  let seed = room.seed >>> 0;
  for (const c of `field:${room.round}:${room.mission}`) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  return max => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let n = Math.imul(seed ^ seed >>> 15, seed | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return Math.floor(((n ^ n >>> 14) >>> 0) / 4294967296 * max);
  };
}
function shuffle(values, rand) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function layout(room) {
  const spec = districts[room.mission], detail = mapDetails[room.mission], { route, tasks, fault } = room.field;
  const stations = (detail.stations || points).map(([x, y], i) => ({ id: String(i), name: spec.names[i], verb: 'Buka panel', x, y, face: 'up' }));
  const open = isTraining(room) ? tasks[3].done : room.mission === 1 ? route === 'Jembatan' : tasks[1].done || fault.resolved === 'repair';
  const gates = [{ ...gate, open, label: room.mission === 1 ? 'Jembatan' : 'Jalur pintas' }];
  if (room.mission === 1) gates.push({ ...dockGate, open: isTraining(room) ? tasks[2].done : route === 'Dermaga', label: 'Akses dermaga' });
  const [x, y, w, h] = spec.prop;
  const walls = commonWalls.map((wall, i) => {
    const replacement = detail.walls[i];
    return replacement ? { x: replacement[0], y: replacement[1], w: replacement[2], h: replacement[3] } : wall;
  });
  return {
    bounds: BOUNDS, spawn: SPAWN, objects: stations, palette: spec.palette, base: spec.base, gates,
    obstacles: [...walls, { x, y, w, h }, ...gates.filter(g => !g.open)]
  };
}
export function beginField(room, now) {
  const rand = randomFor(room), bank = bankFor(room);
  const crew = room.players;
  const leaders = ROLES.map(role => crew.find(p => p.role === role));
  const load = new Map(crew.map(p => [p.id, 0]));
  function assign(station, avoid) {
    const candidates = crew.filter(p => p.id !== avoid && load.get(p.id) < 3);
    const pool = candidates.length ? candidates : crew.filter(p => load.get(p.id) < 3);
    const player = pool.find(p => p === leaders[station]) || pool.sort((a, b) => load.get(a.id) - load.get(b.id))[0];
    load.set(player.id, load.get(player.id) + 1);
    return player.id;
  }
  const chosen = ROLES.map((_, i) => 2 * i + rand(2));
  // Riverside always includes the bridge/dock decision among its work orders.
  if (!isTraining(room) && room.mission === 1) chosen[3] = 6;
  if (!isTraining(room) && (room.mission === 2 || room.mission === 3)) chosen[1] = 3;
  const alternates = shuffle(chosen.map((index, i) => 4 * i + 1 - index), rand);
  const extra = shuffle([...bank.keys()], rand);
  const count = isTraining(room) ? Math.min(bank.length, crew.length * 3) : crew.length * 3;
  const selection = [...chosen, ...alternates, ...extra].slice(0, count);
  const variants = bank.map(() => rand(8));
  const tasks = [];
  // Reserve each picked operator's first task before redistributing unpicked roles.
  const owners = chosen.map((_, i) => leaders[i] ? assign(i) : null);
  for (const [i, index] of selection.entries()) {
    const station = Math.floor(index / 2);
    const sources = [0, 1, 2, 3].filter(root => root !== station);
    const source = i >= 4 ? sources[(i + rand(sources.length)) % sources.length] : null;
    const owner = owners[i] || assign(station, source === null ? null : tasks[source].owner);
    const variant = variants[index];
    variants[index] = (variant + 1 + rand(7)) % 8;
    const id = bank[index].id;
    const clueAt = id === 'fragments' ? [0, 2][variant % 2] : id === 'split-packet' ? [2, 3][variant % 2] : null;
    tasks.push({ id: 'job-' + i, index, station, variant, owner, source, clueAt, clueRead: false, packet: 1 + rand(9), done: false });
  }
  room.field = { tasks, fault: { active: false, resolved: null, variant: rand(8) }, route: null, weights: shuffle([1, 2, 3, 4], rand), lastPing: {}, result: null };
  for (const p of crew) {
    p.fieldPose = { x: SPAWN.x + 33 * (p.slot % 2), y: SPAWN.y + 22 * Math.floor(p.slot / 2), direction: 'up', moving: false, seq: 0, at: now };
    p.fieldPanel = null; p.fieldHints = []; p.lastAttempt = 0;
  }
}
function clearLine(map, a, b) {
  const { bounds, obstacles } = map, r = bounds.radius;
  const steps = Math.max(1, Math.ceil(distance(a, b) / 3));
  for (let i = 0; i <= steps; i++) {
    const x = a.x + (b.x - a.x) * i / steps, y = a.y + (b.y - a.y) * i / steps;
    if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY ||
      obstacles.some(o => x > o.x - r && x < o.x + o.w + r && y > o.y - r && y < o.y + o.h + r)) return false;
  }
  return true;
}
function near(map, pose, station) {
  const object = map.objects[station];
  return pose && object && distance(pose, object) <= RANGE && clearLine(map, pose, object);
}
function travelDistance(map, from, to) {
  if (clearLine(map, from, to)) return distance(from, to);
  // The local controller slides along walls. Two samples spanning a corner
  // may need a short right-angle path even though their chord hits the wall.
  const xFirst = { x: to.x, y: from.y }, yFirst = { x: from.x, y: to.y };
  if ([xFirst, yFirst].some(corner => clearLine(map, from, corner) && clearLine(map, corner, to))) {
    return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
  }
  return Infinity;
}
export function updatePose(room, p, input, now) {
  const old = p.fieldPose;
  if (!old || !Array.isArray(input?.points) || input.points.length > 18 || !DIRECTIONS.includes(input.direction)) return;
  const map = layout(room);
  let last = old, seq = old.seq, remaining = 16 + map.bounds.speed * Math.min(2.4, (now - old.at) / 1000);
  for (const point of input.points) {
    if (!Number.isSafeInteger(point?.seq) || point.seq <= seq || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    seq = point.seq;
    if (distance(last, point) > remaining) break;
    const step = travelDistance(map, last, point);
    if (step > remaining) break;
    remaining -= step; last = point;
  }
  if (seq === old.seq) return;
  const moved = distance(last, old) > 0.5;
  p.fieldPose = { x: last.x, y: last.y, direction: input.direction, moving: !!input.moving && moved, seq, at: moved ? now : old.at };
  if (p.fieldPanel && !near(map, p.fieldPose, p.fieldPanel.station)) p.fieldPanel = null;
}
function faultPuzzle(room, method) {
  const v = room.field.fault.variant;
  const repairs = [
    [`Baterai 1: ${12 + v} V · baterai 2: 7 V. Berapa tegangan seri total?`, 19 + v, 'Untuk dua baterai seri, jumlahkan tegangannya.'],
    [`Arus harus turun ke ${v + 3} unit. Saat ini ${2 * v + 14}. Berapa unit yang dibuang?`, v + 11, 'Kurangi nilai target dari pembacaan sekarang.'],
    [`Penyaring menerima ${35 + v} blok. Tolak 8 palsu dan 4 duplikat. Berapa yang boleh lewat?`, 23 + v, 'Kurangi kedua kelompok yang harus ditolak.'],
    [`Sakelar kembali setiap 9 detik. Fase saat ini ${v + 1} detik. Berapa detik sampai kembali ke 0?`, 8 - v, 'Kurangi fase saat ini dari panjang siklus.'],
    [`Kapasitas sementara ${30 + v} W · beban ${45 + 2 * v} W. Berapa watt harus dilepas?`, 15 + v, 'Selisih beban dan kapasitas harus dilepas.'],
    [`Alarm normal mengikuti y=3x+2. Log menunjukkan y=${3 * (v + 6) + 2}. Berapa x?`, v + 6, 'Kurangi dua, lalu bagi tiga.']
  ];
  const bypasses = [
    [`Relay cadangan memakai 2x+1. Input ${v + 3}. Berapa keluarannya?`, 2 * v + 7, 'Kalikan input dengan dua sebelum menambah satu.'],
    [`Dermaga alternatif berjarak ${v + 10} petak ditambah 6 petak. Berapa total petak?`, v + 16, 'Jumlahkan kedua bagian jalur.'],
    [`Rak cadangan membuka blok bernomor sisa bagi 9. Nomor ${30 + v}. Berapa sisanya?`, (30 + v) % 9, 'Kurangi kelipatan sembilan terbesar yang tidak melebihi nomor blok.'],
    [`Lorong barat menurunkan y sebanyak 4 dari ${12 + v}. Berapa y baru?`, 8 + v, 'Kurangi empat dari koordinat semula.'],
    [`Dua pemancar cadangan membawa masing-masing ${v + 4} W. Berapa totalnya?`, 2 * v + 8, 'Jumlahkan daya dari dua pemancar.'],
    [`Router manual mengenkripsi 2x+7. Keluaran ${2 * (v + 4) + 7}. Berapa x?`, v + 4, 'Kurangi tujuh, lalu bagi dua.']
  ];
  const [line, answer, hint] = (method === 'repair' ? repairs : bypasses)[room.mission];
  return { title: method === 'repair' ? 'Perbaiki sumber gangguan' : 'Aktifkan jalur cadangan', brief: line, lines: [], kind: 'number', format: 'Bilangan bulat', answers: [String(answer)], hint };
}
function finalPuzzle(room) {
  const packets = room.field.tasks.slice(0, 4).map(t => t.packet), weights = room.field.weights;
  const core = room.mission === 5, modulo = core ? 13 : isTraining(room) && room.mission === 1 ? 11 : 10;
  const checksum = packets.reduce((sum, n, i) => sum + n * weights[i], 0) % modulo;
  const factor = 2 + room.field.fault.variant % 3;
  const offset = room.field.fault.resolved === 'repair' ? 1 : 4;
  const lines = [`Urutan paket: Kai → Nyx → Bolt → Iris · bobot: ${weights.join(', ')}`, `Pembagi: ${modulo}. Nomor paket tersedia di daftar paket tim.`];
  if (core) lines.push(`Sandi pemancar Core: E(s) = ${factor}s + ${offset}. Kirim hasil enkripsi dari sisa s.`);
  return {
    title: room.mission === 5 ? 'Kirim transmisi Novaris' : 'Aktifkan pemancar',
    brief: 'Gabungkan empat paket operator. Kalikan setiap paket dengan bobot di posisi yang sama, jumlahkan, lalu ambil sisa pembagian.',
    lines, kind: 'number', format: 'Bilangan bulat', answers: [String(core ? factor * checksum + offset : checksum)],
    hint: 'Nomor paket mengikuti peran pada pekerjaan asal. Jumlahkan empat hasil perkalian sebelum mencari sisa.'
  };
}
function available(room, p, task, now) {
  const { tasks, fault } = room.field;
  const owner = room.players.find(q => q.id === task.owner);
  const canHelp = !owner || now - owner.seen >= 18000 || !tasks.some(t => t.owner === p.id && !t.done);
  if (task.done) return 'selesai';
  if (fault.active && !fault.resolved && affected[room.mission](task)) return 'gangguan';
  if (task.clueAt != null && !task.clueRead) return 'cari di ' + districts[room.mission].names[task.clueAt];
  if (task.source !== null && !tasks[task.source].done) return 'menunggu paket';
  return task.owner === p.id || canHelp ? 'siap' : 'tugas rekan';
}
function finalReady(field) { return field.tasks.every(t => t.done) && !!field.fault.resolved; }
function optionsAt(room, p, station, now) {
  const { tasks, fault } = room.field, district = districts[room.mission];
  const options = tasks.filter(t => t.station === station).map(t => ({
    id: t.id, title: bankFor(room)[t.index].title, state: available(room, p, t, now), owner: t.owner,
    ...(isTraining(room) ? { topic: course.topicFor(t.index) } : {}),
    ...(t.done && t.source === null ? { packet: t.packet } : {})
  }));
  for (const task of tasks.filter(t => t.clueAt === station)) {
    const template = bankFor(room)[task.index];
    options.unshift({
      id: 'clue-' + task.id, title: 'Baca fragmen · ' + template.title, state: task.clueRead ? 'selesai' : 'siap',
      ...(task.clueRead ? { clue: template.build(task.variant).lines[0] } : {})
    });
  }
  if (fault.active && !fault.resolved && station === district.repair) options.unshift({ id: 'repair', title: 'Perbaiki gangguan', state: 'siap' });
  if (fault.active && !fault.resolved && station === district.bypass) options.unshift({ id: 'bypass', title: 'Aktifkan jalur cadangan', state: 'siap' });
  if (station === 4) options.push({ id: 'final', title: 'Gabungkan paket tim', state: finalReady(room.field) ? 'siap' : 'menunggu tim' });
  return options;
}
function puzzleFor(room, id) {
  if (id === 'repair' || id === 'bypass') return faultPuzzle(room, id);
  if (id === 'final') return finalPuzzle(room);
  const t = room.field.tasks.find(task => task.id === id);
  if (!t) return null;
  const template = bankFor(room)[t.index];
  const puzzle = { title: template.title, ...template.build(t.variant) };
  if (isTraining(room)) puzzle.topic = course.topicFor(t.index);
  if (t.source !== null) {
    const source = room.field.tasks[t.source];
    puzzle.packetSource = `${ROLES[source.station].toUpperCase()} · ${districts[room.mission].names[source.station]}`;
    puzzle.packet = source.packet;
  }
  return puzzle;
}
export function fieldSnapshot(room, p, now) {
  if (room.phase !== 'playing' || !room.field) return null;
  const map = layout(room), district = districts[room.mission], field = room.field;
  const panel = p.fieldPanel && near(map, p.fieldPose, p.fieldPanel.station) ? p.fieldPanel : null;
  const work = map.objects.map((_, i) => optionsAt(room, p, i, now));
  let puzzle = null;
  if (panel?.id && work[panel.station].some(t => t.id === panel.id && t.state === 'siap')) {
    const { answers, packet, hint, ...visible } = puzzleFor(room, panel.id);
    puzzle = { ...visible, hint: p.fieldHints.includes(panel.id) ? hint : null };
  }
  return {
    map, work, panel: panel ? { ...panel, puzzle } : null, goal: district.goal, route: field.route,
    completed: field.tasks.filter(t => t.done).length, total: field.tasks.length, finalReady: finalReady(field),
    fault: { active: field.fault.active, resolved: field.fault.resolved, title: district.fault, repair: district.repair, bypass: district.bypass },
    poses: room.players.map(q => ({ id: q.id, ...q.fieldPose, at: undefined, seq: q.id === p.id ? q.fieldPose.seq : undefined }))
  };
}
export function fieldCommand(room, p, input, now, fail, log) {
  const field = room.field, map = layout(room), district = districts[room.mission];
  const { action, station, taskId } = input;
  const activeCrew = room.players.filter(q => now - q.seen < 18000).length;
  if (action === 'field-close') { p.fieldPanel = null; return {}; }
  if (action === 'field-ping') {
    const object = map.objects[station], message = { help: 'Butuh bantuan', ready: 'Panel siap', go: 'Menuju lokasi' }[input.ping];
    fail(!Number.isInteger(station) || !object || typeof message !== 'string', 'Ping tidak valid.');
    fail(now - (field.lastPing[p.id] ?? -Infinity) < 2200, 'Tunggu sebelum mengirim ping lagi.', 429);
    field.lastPing[p.id] = now; log(room, `${p.name} · ${message}: ${object.name}.`, now); return { message: 'Ping dikirim.' };
  }
  fail(!['field-open', 'field-answer', 'field-hint'].includes(action), 'Perintah distrik tidak dikenal.');
  fail(!Number.isInteger(station) || !near(map, p.fieldPose, station), 'Dekati panel itu sebelum berinteraksi.', 409);
  const options = optionsAt(room, p, station, now);
  if (action === 'field-open' && !taskId) { p.fieldPanel = { station }; return {}; }
  const option = options.find(t => t.id === taskId);
  fail(!option || option.state !== 'siap', 'Tugas ini belum tersedia atau sudah selesai.', 409);
  if (action === 'field-open' && taskId.startsWith('clue-')) {
    const task = field.tasks.find(t => 'clue-' + t.id === taskId);
    task.clueRead = true;
    p.fieldPanel = { station };
    log(room, `${p.name} menemukan fragmen di ${district.names[station]} untuk ${district.names[task.station]}.`, now);
    return { message: 'Fragmen dibagikan. Tim bisa melanjutkan tugas di panel tujuan.' };
  }
  if (action === 'field-open') { p.fieldPanel = { station, id: taskId }; return {}; }
  fail(p.fieldPanel?.id !== taskId || p.fieldPanel.station !== station, 'Buka tugasnya di panel terlebih dulu.', 409);
  const puzzle = puzzleFor(room, taskId);
  if (action === 'field-hint') {
    if (!p.fieldHints.includes(taskId)) { p.fieldHints.push(taskId); room.hints++; }
    return { message: 'Petunjuk terbuka.' };
  }
  fail(activeCrew < 2, 'Butuh minimal dua operator terhubung. Temanmu bisa menyambung kembali.', 409);
  const answer = parseAnswer(puzzle, input.answer);
  fail(answer === null || (puzzle.packetSource && !/^[1-9]$/.test(String(input.packet ?? ''))), 'Isi semua jawaban sesuai format.');
  fail(p.lastAttempt && now - p.lastAttempt < 700, 'Tunggu sebentar sebelum mencoba lagi.', 429);
  p.lastAttempt = now;
  if (!puzzle.answers.includes(answer) ||
    (puzzle.packetSource && Number(input.packet) !== puzzle.packet)) {
    room.errors++;
    return { correct: false, message: 'Sinyal belum cocok. Cek jawaban dan nomor paket, lalu coba lagi.' };
  }
  p.fieldPanel = { station };
  if (taskId === 'final') {
    field.result = { task: puzzle.title, explanation: `Empat paket berbobot menghasilkan kode transmisi ${puzzle.answers[0]}. ${district.goal}` };
    return { correct: true, finish: true, message: 'Transmisi tim berhasil.' };
  }
  if (taskId === 'repair' || taskId === 'bypass') {
    field.fault.resolved = taskId;
    log(room, taskId === 'repair' ? `${p.name} memperbaiki gangguan. Panel dan jalur pintas aktif.` : `${p.name} mengalihkan jaringan. Panel kembali aktif melalui jalur cadangan.`, now);
  } else {
    const task = field.tasks.find(t => t.id === taskId);
    task.done = true;
    if (task.source === null) log(room, `${ROLES[task.station].toUpperCase()} · ${district.names[station]} merilis paket ${task.packet}.`, now);
    else log(room, `${p.name} menyambungkan ${puzzle.title.toLowerCase()} di ${district.names[station]}.`, now);
    if (bankFor(room)[task.index].id === 'canal-cost' && !field.route) { field.route = answer; log(room, `Akses ${field.route} sekarang terbuka.`, now); }
    if (!field.fault.active && field.tasks.filter(t => t.done).length >= 2) {
      field.fault.active = true; log(room, `Gangguan: ${district.fault}. Pilih perbaikan atau jalur cadangan.`, now);
    }
  }
  if (finalReady(field)) log(room, `${district.names[4]} siap. Gabungkan empat paket tim.`, now);
  return { correct: true, message: 'Panel terverifikasi. Status distrik diperbarui.' };
}
