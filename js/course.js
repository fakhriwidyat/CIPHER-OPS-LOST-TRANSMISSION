/* Curriculum shared by the solo terminal and the room server. */
(function (root) {
  'use strict';
  const MAPS = ['Central Hub', 'Riverside'];
  const TOPICS = ['Cipher', 'Invers', 'Fungsi', 'Nonfungsi'];
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
  const QUESTIONS = [
    [
      {
        kind: 'list', topic: 'Cipher', title: 'Enkripsi Sederhana (Penjumlahan)',
        brief: 'Berapa deretan angka ciphertext untuk pesan NO?',
        lines: ['A = 1, B = 2, …, Z = 26', 'N = 14 dan O = 15', 'E(x) = x + 3'],
        format: 'Dua angka dipisahkan koma, dengan atau tanpa kurung siku',
        answers: ['17, 18'], hint: 'Tambahkan 3 pada nomor setiap huruf.',
        explanation: 'N menjadi 14 + 3 = 17. O menjadi 15 + 3 = 18. Ciphertext yang dihasilkan adalah [17, 18].'
      },
      {
        ...choice(0, 'Tentukan rumus fungsi invers E⁻¹(x) untuk mengembalikan pesan ke bentuk semula.',
          ['E(x) = 2x + 4'], ['(x + 4) / 2', '(x − 4) / 2', 'x / 2 − 2', '2x − 4'], [1, 2], 'Misalkan keluarannya y, lalu isolasi x.'),
        topic: 'Invers', title: 'Menentukan Invers Fungsi Linear',
        explanation: 'Dari y = 2x + 4, diperoleh 2x = y − 4 lalu x = (y − 4) / 2. Jadi E⁻¹(x) = (x − 4) / 2 = ½x − 2.'
      },
      {
        ...choice(0, 'Tentukan rumus fungsi komposisi (f ∘ g)(x).',
          ['f(x) = x + 5', 'g(x) = 2x'], ['2x + 10', 'x + 7', '2x + 5', '3x + 5'], [2], 'Kerjakan g dulu, kemudian masukkan hasilnya ke f.'),
        topic: 'Komposisi', title: 'Komposisi Fungsi Dasar',
        explanation: '(f ∘ g)(x) = f(g(x)) = f(2x) = 2x + 5.'
      }
    ],
    [
      {
        ...code('Berapakah huruf asli dari pesan ini?', ['Angka sandi: 10', 'E(x) = 3x + 1', 'A = 1, B = 2, …, Z = 26'], 'C', 'Kurangi 1 dari angka sandi, bagi dengan 3, lalu cocokkan dengan abjad.'),
        topic: 'Invers', title: 'Dekripsi Pesan Singkat',
        explanation: 'E⁻¹(x) = (x − 1) / 3. Untuk angka 10, hasilnya (10 − 1) / 3 = 3. Huruf ke-3 adalah C.'
      },
      {
        ...number('Tentukan nilai (f + g)(4).', ['f(x) = 3x', 'g(x) = x + 2'], 18, 'Jumlahkan f(4) dan g(4), atau jumlahkan rumusnya dulu.'),
        topic: 'Aljabar Fungsi', title: 'Operasi Aljabar Fungsi',
        explanation: '(f + g)(x) = 3x + (x + 2) = 4x + 2. Untuk x = 4, hasilnya 4(4) + 2 = 18.'
      },
      {
        ...code('Kata apa yang dihasilkan setelah angka sandi didekripsi?', ['Angka sandi: [10, 11]', 'D(x) = x − 2', 'A = 1, B = 2, …, Z = 26'], 'HI', 'Kurangi setiap angka dengan 2, lalu cocokkan hasilnya dengan abjad.'),
        topic: 'Cipher', title: 'Kriptografi Mini (Teka-teki Sandi Huruf)',
        explanation: '10 − 2 = 8, yaitu H. 11 − 2 = 9, yaitu I. Pesan aslinya adalah HI.'
      }
    ]
  ];
  function normalize(puzzle, input) {
    if (typeof input !== 'string') return null;
    const value = input.trim();
    if (puzzle.kind === 'choice') return puzzle.options.includes(value) ? value : null;
    if (puzzle.kind === 'code') return /^[A-Z]{1,40}$/i.test(value) ? value.toUpperCase() : null;
    if (puzzle.kind === 'list') {
      const entries = value.replace(/^\[(.*)\]$/, '$1').split(',').map(part => part.trim());
      return entries.length === 2 && entries.every(part => /^\d{1,8}$/.test(part)) ? entries.map(Number).join(', ') : null;
    }
    return /^[+-]?\d{1,8}$/.test(value) ? String(Number(value)) : null;
  }
  const api = { MAPS, BANKS, QUESTIONS, topicFor, normalize };
  root.CipherCourse = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
