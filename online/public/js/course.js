/* Curriculum shared by the solo terminal and the room server. */
(function (root) {
  'use strict';
  const MAPS = ['Central Hub', 'Riverside'];
  const TOPICS = ['Cipher', 'Invers', 'Fungsi', 'Nonfungsi'];
  const KEY = 'cipher-ops-two-maps-v1';
  const MAX_SCORE = 150;
  const words = ['KODE', 'PETA', 'DATA', 'KUNCI', 'SUARA', 'LAMPU', 'ARSIP', 'JALUR'];
  const indices = word => [...word].map(c => c.charCodeAt(0) - 65);
  const letters = values => values.map(n => String.fromCharCode(65 + (n % 26 + 26) % 26)).join('');
  const entry = (id, title, build) => ({ id, title, build });
  const number = (brief, lines, answer, hint) => ({ kind: 'number', brief, lines, answers: [String(answer)], hint, format: 'Bilangan bulat' });
  const code = (brief, lines, answer, hint) => ({ kind: 'code', brief, lines, answers: [answer], hint, format: 'Huruf A–Z tanpa spasi' });
  function choice(v, brief, lines, options, valid, hint) {
    const offset = v % options.length;
    return { kind: 'choice', brief, lines, options: [...options.slice(offset), ...options.slice(0, offset)], answers: valid.map(i => options[i]), hint, format: 'Pilih satu jawaban' };
  }
  const pairs = values => values.map(([x, y]) => `(${x}, ${y})`).join(' · ');
  const BANKS = [
    [
      entry('course-shift', 'Enkripsi tanda panggil', v => code('Geser setiap huruf maju dan kirim hasilnya.', [`Pesan: ${words[v]}`, `Geser ${v + 1} huruf. Setelah Z, lanjutkan lagi dari A.`], letters(indices(words[v]).map(n => n + v + 1)), 'Contoh geser 3: A menjadi D dan Z menjadi C.')),
      entry('course-decode', 'Dekripsi balasan Aria', v => code('Balikkan pergeseran sandi Caesar untuk membaca pesan.', [`Sandi: ${letters(indices(words[v]).map(n => n + v + 2))}`, `Pengirim menggeser ${v + 2} huruf ke depan.`], words[v], 'Geser ke belakang sebanyak langkah yang sama. Sebelum A, lanjutkan dari Z.')),
      entry('course-inverse-input', 'Pulihkan input radio', v => number('Cari input x yang menghasilkan bacaan radio ini.', [`f(x) = 3x + ${v + 2}`, `Bacaan f(x) = ${3 * (v + 4) + v + 2}`], v + 4, 'Kurangi konstanta dari bacaan, lalu bagi tiga.')),
      entry('course-inverse-rule', 'Tentukan rumus invers', v => choice(v, 'Pilih rumus yang mengembalikan keluaran y ke input x.', [`f(x) = ${v + 2}x + 4`], [`(y − 4) ÷ ${v + 2}`, `(y + 4) ÷ ${v + 2}`, `(${v + 2}y) − 4`], [0], 'Urutan invers membatalkan penjumlahan dulu, kemudian perkalian.')),
      entry('course-evaluate', 'Uji keluaran terminal', v => number('Berapa keluaran yang harus ditampilkan terminal?', [`f(x) = 2x + ${v + 3}`, `Masukkan x = ${v + 2}`], 3 * v + 7, 'Ganti x dengan nilai input, kerjakan perkalian, lalu jumlahkan.')),
      entry('course-table', 'Lengkapi tabel fungsi', v => number('Temukan nilai f(4). Tabel mengikuti fungsi linear.', [`x: 1, 2, 3, 4`, `f(x): ${v + 3}, ${v + 6}, ${v + 9}, ?`], v + 12, 'Saat x bertambah satu, perubahan keluaran selalu sama.')),
      entry('course-relation', 'Fungsi atau nonfungsi?', v => {
        const input = v + 1, isFunction = v % 2 === 0;
        const relation = [[input, 3], [input + 1, 3], [isFunction ? input + 2 : input, 5]];
        return choice(v, 'Klasifikasikan relasi dari input ke output.', [pairs(relation)], ['Fungsi', 'Nonfungsi'], [isFunction ? 0 : 1], 'Satu input harus punya tepat satu output. Dua input boleh menuju output yang sama.');
      }),
      entry('course-conflict', 'Temukan input yang bentrok', v => number('Satu input mengarah ke dua output berbeda. Masukkan input yang membuat relasi ini nonfungsi.', [pairs([[v + 2, 8], [v + 4, 8], [v + 3, 1], [v + 2, 5]])], v + 2, 'Bandingkan angka pertama pada setiap pasangan. Keluaran sama pada input berbeda tetap diizinkan.'))
    ],
    [
      entry('course-wrap', 'Sandi kanal dengan modulo', v => number('Hitung kode huruf sesudah digeser. Gunakan A=0 sampai Z=25.', [`Indeks huruf: ${23 + v % 3}`, `E(x) = sisa pembagian (x + ${v + 4}) oleh 26`], (23 + v % 3 + v + 4) % 26, 'Jika jumlah mencapai 26, kurangi 26 untuk kembali ke awal alfabet.')),
      entry('course-check', 'Periksa tanda autentikasi paket', v => number('Hitung digit cek untuk memverifikasi paket yang tiba.', [`Paket: ${v + 2}, 6, 5`, 'Digit cek = sisa (2 × angka pertama + angka kedua + 3 × angka ketiga) dibagi 10.'], (2 * (v + 2) + 21) % 10, 'Kalikan setiap angka dengan bobotnya. Jumlahkan, lalu ambil sisa bagi 10.')),
      entry('course-inverse-double', 'Balik dua mesin pintu air', v => number('Temukan input sebelum dua mesin bekerja.', [`Mesin pertama: kali ${v + 2}, kemudian mesin kedua: tambah 7.`, `Keluaran akhir: ${(v + 2) * (v + 5) + 7}`], v + 5, 'Batalkan mesin kedua dulu. Kurangi 7, lalu bagi dengan faktor mesin pertama.')),
      entry('course-inverse-model', 'Balik hasil kalibrasi', v => number('Sensor linear mengikuti y = ax + b. Berapa input x saat layar menampilkan nilai target?', [`Dua pengukuran (x, y): ${pairs([[1, v + 6], [3, 3 * (v + 2) + 4]])}`, `Target y = ${(v + 2) * 6 + 4}`], 6, 'Temukan a dari perubahan y dibagi perubahan x. Temukan b dari salah satu titik, lalu balik rumus.')),
      entry('course-composition', 'Rangkai dua fungsi relay', v => number('Relay pertama memakai g dan relay kedua memakai f. Hitung f(g(x)).', [`g(x) = 2x + ${v + 1}`, `f(y) = 3y − 2 · input x = ${v + 2}`], 3 * (3 * v + 5) - 2, 'Hitung g(x) terlebih dulu, lalu pakai keluarannya sebagai masukan f.')),
      entry('course-threshold', 'Pilih fungsi pompa', v => choice(v, 'Pilih model yang menghasilkan keluaran sesuai catatan pada kedua input.', [`f(0) = ${v + 3} dan f(2) = ${v + 11}`], [`4x + ${v + 3}`, `3x + ${v + 3}`, `4x + ${v + 4}`], [0], 'Uji kedua input pada tiap model. Satu titik saja belum cukup.')),
      entry('course-deduplicate', 'Perbaiki relasi kanal', v => choice(v, 'Hapus satu baris agar relasi menjadi fungsi. Kedua cara yang valid diterima.', [`Baris A: (${v + 1}, 2)`, `Baris B: (${v + 2}, 2)`, `Baris C: (${v + 1}, 5)`, `Baris D: (${v + 3}, 5)`], ['Baris A', 'Baris B', 'Baris C', 'Baris D'], [0, 2], 'Cari satu input yang memiliki dua keluaran. Hapus salah satu pasangan yang bentrok.')),
      entry('course-domain', 'Cari input tanpa keluaran', v => number('Relasi ini belum menjadi fungsi dari domain yang diberikan karena satu input tidak punya keluaran. Masukkan input tersebut.', [`Domain: {${v + 1}, ${v + 2}, ${v + 3}, ${v + 4}}`, `Relasi: ${pairs([[v + 1, 9], [v + 3, 8], [v + 4, 9]])}`], v + 2, 'Periksa apakah setiap anggota domain muncul sebagai input pada pasangan.'))
    ]
  ];
  const topicFor = index => TOPICS[Math.floor(index / 2)];
  const score = (wrong, hints) => Math.max(0, 100 + (wrong === 0 ? 50 : 0) - 10 * wrong - 25 * hints);
  const total = state => state.records.reduce((sum, record) => sum + record.score, 0);
  const validName = value => typeof value === 'string' && /^[\p{L}\p{M}0-9 .,'_-]{1,40}$/u.test(value) && /[\p{L}0-9]/u.test(value);
  function plan(seed, map) {
    let state = (seed ^ Math.imul(map + 1, 0x9e3779b9)) >>> 0;
    function draw(max) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return Math.floor(state / 4294967296 * max);
    }
    const topics = TOPICS.map((_, i) => i);
    for (let i = topics.length - 1; i > 0; i--) { const j = draw(i + 1); [topics[i], topics[j]] = [topics[j], topics[i]]; }
    const first = topics.map(t => 2 * t + draw(2));
    return [...first, ...first.map(index => index ^ 1)].map(index => ({ index, variant: draw(8) }));
  }
  function question(state) {
    const map = state.records.length;
    if (map >= MAPS.length) return null;
    const { index, variant } = plan(state.seed, map)[state.step];
    const template = BANKS[map][index];
    return { ...template.build(variant), title: template.title, topic: topicFor(index) };
  }
  function normalize(puzzle, input) {
    if (typeof input !== 'string') return null;
    const value = input.trim();
    if (puzzle.kind === 'choice') return puzzle.options.includes(value) ? value : null;
    if (puzzle.kind === 'code') return /^[A-Z]{1,40}$/i.test(value) ? value.toUpperCase() : null;
    return /^[+-]?\d{1,8}$/.test(value) ? String(Number(value)) : null;
  }
  function create(name, seed = Math.floor(Math.random() * 4294967296)) {
    return { name, seed, step: 0, wrong: 0, hinted: [], records: [], completedAt: null };
  }
  function validate(state) {
    if (!state || !validName(state.name) || !Number.isInteger(state.seed) || state.seed < 0 || state.seed > 0xffffffff ||
      !Array.isArray(state.records) || state.records.length > MAPS.length || !Number.isInteger(state.step) || state.step < 0 || state.step >= 8 ||
      !Number.isInteger(state.wrong) || state.wrong < 0 || !Array.isArray(state.hinted) || new Set(state.hinted).size !== state.hinted.length ||
      !state.hinted.every(i => Number.isInteger(i) && i >= 0 && i <= state.step) ||
      !state.records.every(r => r && Number.isInteger(r.score) && r.score >= 0 && r.score <= MAX_SCORE)) return null;
    const finished = state.records.length === MAPS.length;
    if (finished ? typeof state.completedAt !== 'string' || !Number.isFinite(Date.parse(state.completedAt)) : state.completedAt !== null) return null;
    return state;
  }
  function answer(state, input, now = new Date()) {
    const puzzle = question(state);
    if (!puzzle) return 'finished';
    const value = normalize(puzzle, input);
    if (value === null) return 'invalid';
    if (!puzzle.answers.includes(value)) { state.wrong++; return 'wrong'; }
    if (++state.step < 8) return 'correct';
    state.records.push({ score: score(state.wrong, state.hinted.length) });
    state.step = 0; state.wrong = 0; state.hinted = [];
    if (state.records.length === MAPS.length) state.completedAt = now.toISOString();
    return 'map-complete';
  }
  const api = { MAPS, TOPICS, KEY, MAX_SCORE, BANKS, topicFor, create, question, normalize, validate, score, total, answer };
  root.CipherCourse = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
