// Operator identities and reproducible, private role assignments.
export const OPERATORS = [
  { id: 'kai', name: 'KAI', role: 'Kurir sinyal', color: '#56e4ff', specialty: 'Mengirim kode dan membuka jalur komunikasi.', gear: 'Scarf cyan / radio lapangan' },
  { id: 'nyx', name: 'NYX', role: 'Analis sandi', color: '#c29aff', specialty: 'Membaca pesan tersembunyi dan lapisan enkripsi.', gear: 'Hood ungu / visor optik' },
  { id: 'bolt', name: 'BOLT', role: 'Teknisi relai', color: '#ffbf69', specialty: 'Memperbaiki hitungan dan mengalibrasi mesin.', gear: 'Jaket tembaga / lengan mekanik' },
  { id: 'iris', name: 'IRIS', role: 'Navigator', color: '#6effa8', specialty: 'Memilih rute aman dan melacak koordinat sinyal.', gear: 'Mantel hijau / pemindai portabel' }
];
export const operatorFor = player => OPERATORS.find(r => r.id === player.role) || OPERATORS[player.slot];
const words = ['KEY', 'MAP', 'LOG', 'ARC', 'SUN', 'SKY', 'FOX', 'NET', 'CAT', 'RED', 'AIR', 'ICE'];
const longWords = ['SAFE', 'CODE', 'LINK', 'WAVE', 'GATE', 'PORT', 'NODE', 'ECHO', 'PATH', 'LOCK'];
const taskKinds = [
  [['encode', 'decode', 'repair', 'sequence']],
  [['sequence', 'decode', 'repair', 'composition']],
  [['composition', 'decode', 'calibrate', 'sequence'], ['encode', 'composition', 'repair', 'decode']],
  [['encode', 'decode', 'calibrate', 'composition']],
  [['composition', 'sequence', 'repair', 'decode']],
  [['encode', 'decode', 'repair', 'calibrate'], ['sequence', 'composition', 'calibrate', 'decode']]
];
const tasks = [
  ['Kirim suar darurat', 'Baca balasan markas', 'Hidupkan relai B–07', 'Pilih frekuensi pembuka'],
  ['Buka gerbang Riverside', 'Baca kunci akses', 'Perbaiki panel dermaga', 'Susun jalur pengalihan'],
  ['Tembus lapisan pertama', 'Baca jejak pengirim', 'Kalibrasi pemancar Spire', 'Pilih kanal cadangan'],
  ['Kirim koordinat relai', 'Temukan lokasi tersembunyi', 'Kalibrasi antena tua', 'Petakan rute menuju CABIN'],
  ['Rangkai jalur Skyline', 'Pilih paket yang utuh', 'Perbaiki sinyal rusak', 'Lacak sumber gangguan'],
  ['Kirim otorisasi Core', 'Baca respons keamanan', 'Stabilkan daya Core', 'Sinkronkan jalur kota']
];
export const TEAM_GOALS = [
  'Sambungkan markas melalui relai B–07. Lengkapi seluruh tugas operator yang hadir.',
  'Buka Riverside dengan menyatukan akses gerbang, kunci, panel, dan jalur pengalihan.',
  'Bongkar dua lapis enkripsi Data Spire dan temukan jejak NULL.',
  'Temukan stasiun CABIN: satukan koordinat, lokasi, antena, dan rute tim.',
  'Pulihkan Skyline dengan jalur stabil, paket utuh, relai sehat, dan sumber sinyal yang jelas.',
  'Hentikan protokol penghapusan Core dan nyalakan seluruh jaringan Novaris.'
];
function randomFor(room, role) {
  let state = Number(room.seed || 1) >>> 0;
  for (const c of `${room.round || 0}:${room.mission}:${room.stage}:${role}`) state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
  if (room.challengeVersion < 3) return max => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % max; };
  return max => {
 state = (state + 0x6D2B79F5) >>> 0;
 let t = Math.imul(state ^ state >>> 15, state | 1);
 t ^= t + Math.imul(t ^ t >>> 7, t | 61);
 return Math.floor(((t ^ t >>> 14) >>> 0) / 4294967296 * max);
};
}
const encrypt = (word, fn) => [...word].map(c => (c.charCodeAt(0) - 64) * fn.a + fn.b);
function shuffledOptions(correct, wrong, rand) {
  const options = [correct, ...wrong];
  for (let i = options.length - 1; i > 0; i--) { const j = rand(i + 1); [options[i], options[j]] = [options[j], options[i]]; }
  return options;
}
export const stageCount = room => room.challengeVersion >= 3 ? [4, 4, 5, 5, 6, 6][room.mission] : (room.mission === 2 || room.mission === 5 ? 2 : 1);
function kindFor(room, index) {
 if (room.challengeVersion < 3) return taskKinds[room.mission][room.stage][index];
 const rand = randomFor({ ...room, stage: 0 }, 'task-order');
 const kinds = ['encode', 'decode', 'repair', 'sequence', 'composition', 'calibrate'];
 for (let n = kinds.length - 1; n > 0; n--) {
  const j = rand(n + 1); [kinds[n], kinds[j]] = [kinds[j], kinds[n]];
 }
 return kinds[(index + room.stage) % kinds.length];
}
export function assignmentFor(room, player) {
  const role = operatorFor(player), i = OPERATORS.indexOf(role), m = room.mission, s = room.stage;
  const rand = randomFor(room, role.id), kind = kindFor(room, i);
  const fn = { a: 2 + rand(m < 2 ? 3 : 5), b: 1 + rand(room.challengeVersion >= 3 ? 20 : 8) };
  const pool = [...(m < 3 ? words : longWords), ...(room.challengeVersion >= 3 ? (m < 3 ? ['BAY', 'JET', 'OWL', 'ASH', 'ION', 'HUB', 'LAB', 'RAM'] : ['BEACON', 'SIGNAL', 'CIPHER', 'RELAY', 'VECTOR', 'ORBIT', 'PULSE', 'NORTH', 'RADAR', 'TRACE']) : [])];
  const plain = m === 0 && i === 0 ? ['HI', 'GO', 'UP', 'OK'][rand(4)] : pool[rand(pool.length)];
  const task = tasks[m][i] + (s > 0 ? ' / paket ' + (s + 1) : '');
  const base = { kind, fn, task, roleId: role.id, contribution: ['Paket transmisi', 'Pesan terdekripsi', 'Relai stabil', 'Rute terverifikasi'][i] };
  if (kind === 'encode') return { ...base, type: 'ENCRYPT / OUTBOUND', plain, objective: `Suar tim membutuhkan kode ${plain}. Ubah huruf ke angka, hitung sandinya, lalu kirim.`, hint: `Huruf pertama ${plain[0]} = ${plain.charCodeAt(0) - 64}. Kalikan ${fn.a}, lalu tambah ${fn.b}. Ulangi untuk setiap huruf.` };
  if (kind === 'decode') return { ...base, type: 'DECRYPT / INBOUND', cipher: encrypt(plain, fn), objective: 'Pesan masuk berisi bagian petunjuk tim. Balikkan fungsi untuk membaca kata yang tersembunyi.', hint: `Kurangi setiap sandi dengan ${fn.b}, lalu bagi ${fn.a}. A=1 sampai Z=26. Kerjakan satu angka per huruf.` };
  if (kind === 'repair') {
    const row = rand(plain.length), values = encrypt(plain, fn); values[row] += 1 + rand(5);
    return { ...base, type: 'REPAIR / RELAY LOG', plain, values, objective: 'Satu baris log mesin tidak sesuai rumus. Tandai baris itu dan perbaiki hasilnya agar relai tim menyala.', hint: `Periksa baris ${plain[row]}: nomor hurufnya ${plain.charCodeAt(row) - 64}. Hitung ${fn.a} × nomor huruf + ${fn.b}.` };
  }
  if (kind === 'sequence') {
    const expected = encrypt(plain, fn), row = rand(plain.length);
    const wrong = [-1, 1, 3].map(delta => expected.map((v, j) => j === row ? v + delta : v));
    return { ...base, type: 'ROUTE / PACKET SELECTION', plain, options: shuffledOptions(expected, wrong, rand), objective: `Hanya satu kanal membawa kode ${plain} dengan utuh. Hitung dan pilih paket yang aman untuk tim.`, hint: `Konversikan ${plain} memakai A=1 sampai Z=26. Terapkan ${fn.a}x + ${fn.b} ke setiap nomor, lalu cocokkan seluruh urutan.` };
  }
  if (kind === 'composition') {
    const f = { a: 2 + rand(3), b: 1 + rand(6) }, g = { a: 2 + rand(3), b: 1 + rand(5) };
    const expected = { a: f.a * g.a, b: f.a * g.b + f.b };
    const options = shuffledOptions(expected, [{ a: expected.a, b: expected.b + 1 }, { a: expected.a + 1, b: expected.b }, { a: expected.a, b: expected.b - 1 }], rand);
    return { ...base, fn: null, type: 'COMPOSE / DOUBLE ENCRYPTION', f, g, options, objective: `Jalur melewati g terlebih dahulu, lalu f. Pilih fungsi gabungan (f ∘ g)(x) untuk membuka jalur.`, hint: `Substitusi g ke f: ${f.a}(${g.a}x + ${g.b}) + ${f.b}. Kalikan koefisien, lalu jumlahkan konstanta.` };
  }
  const x1 = 1 + rand(4), x2 = x1 + 2 + rand(4);
  return { ...base, fn: null, type: 'CALIBRATE / UNKNOWN FUNCTION', samples: [{ x: x1, y: fn.a * x1 + fn.b }, { x: x2, y: fn.a * x2 + fn.b }], objective: 'Label fungsi mesin terhapus. Gunakan dua hasil pengukuran untuk menemukan a dan b pada y = ax + b.', hint: 'a = (y₂ − y₁) ÷ (x₂ − x₁). Setelah a diketahui, b = y₁ − a × x₁.' };
}
export function assignmentAnswer(c) {
  if (c.kind === 'decode') return c.cipher.map(n => String.fromCharCode(64 + (n - c.fn.b) / c.fn.a)).join('');
  if (c.kind === 'calibrate') { const [p, q] = c.samples, a = (q.y - p.y) / (q.x - p.x); return { a, b: p.y - a * p.x }; }
  if (c.kind === 'composition') return c.options.findIndex(v => v.a === c.f.a * c.g.a && v.b === c.f.a * c.g.b + c.f.b);
  if (c.kind === 'sequence') { const expected = encrypt(c.plain, c.fn); return c.options.findIndex(v => v.every((n, i) => n === expected[i])); }
  if (c.kind === 'repair') { const expected = encrypt(c.plain, c.fn), row = expected.findIndex((n, i) => n !== c.values[i]); return { row, value: expected[row] }; }
  return encrypt(c.plain, c.fn);
}
export function explainAssignment(c) {
  const answer = assignmentAnswer(c);
  if (c.kind === 'calibrate') { const [p, q] = c.samples; return `a = (${q.y} − ${p.y}) / (${q.x} − ${p.x}) = ${answer.a}. b = ${p.y} − ${answer.a} × ${p.x} = ${answer.b}. Fungsi mesin: y = ${answer.a}x + ${answer.b}.`; }
  if (c.kind === 'composition') return `f(g(x)) = ${c.f.a}(${c.g.a}x + ${c.g.b}) + ${c.f.b} = ${c.options[answer].a}x + ${c.options[answer].b}.`;
  if (c.kind === 'decode') return `[${c.cipher.join(', ')}] → kurangi ${c.fn.b}, bagi ${c.fn.a} → ${answer}.`;
  if (c.kind === 'repair') return `Baris ${c.plain[answer.row]} rusak: ${c.fn.a} × ${c.plain.charCodeAt(answer.row) - 64} + ${c.fn.b} = ${answer.value}, bukan ${c.values[answer.row]}.`;
  return [...c.plain].map((char, i) => `${char}=${char.charCodeAt(0) - 64} → ${encrypt(c.plain, c.fn)[i]}`).join(' · ') + ` dengan E(x) = ${c.fn.a}x + ${c.fn.b}.`;
}
