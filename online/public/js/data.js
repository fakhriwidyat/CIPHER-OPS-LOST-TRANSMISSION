/* Data dan matematika dipisahkan dari tampilan agar mudah dipelajari. */
(function (root) {
  'use strict';
  const math = {
    charToNumber(char) {
      const c = String(char).toUpperCase();
      if (c === ' ') return 0;
      if (!/^[A-Z]$/.test(c)) throw new Error('Gunakan huruf A–Z atau spasi.');
      return c.charCodeAt(0) - 64;
    },
    numberToChar(number) {
      if (!Number.isInteger(number) || number < 0 || number > 26) throw new Error('Hasil invers harus bilangan bulat 0–26.');
      return number === 0 ? ' ' : String.fromCharCode(number + 64);
    },
    linear(x, fn) {
      if (!Number.isFinite(x) || !Number.isFinite(fn.a) || !Number.isFinite(fn.b) || fn.a === 0) throw new Error('Fungsi linear tidak valid.');
      return fn.a * x + fn.b;
    },
    inverse(y, fn) {
      if (!Number.isFinite(y) || !Number.isFinite(fn.a) || !Number.isFinite(fn.b) || fn.a === 0) throw new Error('Fungsi invers tidak valid.');
      const value = (y - fn.b) / fn.a;
      if (!Number.isInteger(value) || value < 0 || value > 26) throw new Error('Sandi tidak menghasilkan bilangan bulat 0–26.');
      return value;
    },
    compose(f, g) { return { a: f.a * g.a, b: f.a * g.b + f.b }; },
    encrypt(text, fn) { return [...String(text).toUpperCase()].map(c => math.linear(math.charToNumber(c), fn)); },
    decrypt(values, fn) { return values.map(v => math.numberToChar(math.inverse(v, fn))).join(''); },
    format(values) { return '[' + values.join(', ') + ']'; },
    same(a, b) { return a.length === b.length && a.every((v, i) => v === b[i]); },
    score(errors, hints) { return Math.max(0, 100 + (errors === 0 ? 50 : 0) - errors * 10 - hints * 25); },
    stars(errors, hints) { return errors === 0 && hints === 0 ? 3 : errors <= 1 && hints === 0 ? 2 : 1; }
  };
  const f = { a: 3, b: 2 }, g = { a: 2, b: 1 };
  const composed = math.compose(f, g);
  const missions = [
    {
      id: 0, title: 'FIRST CONTACT', district: 'Central Hub', type: 'LINEAR FUNCTION', subtitle: 'Satu pesan. Satu kesempatan untuk terhubung.',
      briefing: 'Markas pusat belum tahu kita masih di sini. Kirim sapaan pertama melalui jalur darurat. Dua huruf sudah cukup untuk menyalakan harapan.',
      fn: { a: 2, b: 3 }, stages: [{ kind: 'encode', plain: 'HI', objective: 'Enkripsi sapaan HI dan kirim ke markas pusat.', hint: 'H = 8 dan I = 9. Masukkan setiap nilai ke E(x) = 2x + 3. Contoh: 2 × 8 + 3.' }],
      explanation: 'H = 8 → 2(8) + 3 = 19. I = 9 → 2(9) + 3 = 21. Setiap huruf dihitung terpisah: [19, 21].',
      story: 'Satu lampu hijau menyala. Markas membalas: “Kami kira kalian sudah hilang.” Tapi ada paket lain yang ikut terkirim. Tanpa identitas.',
      clue: { id: 'first', title: '01 / Sinyal pertama', sender: 'HEADQUARTERS', text: 'Kami menerima [19, 21]. Central Hub kembali tersambung. Paket tambahan terdeteksi pada jalur yang sama. Pengirim: tidak diketahui.' },
      x: 22, y: 67
    },
    {
      id: 1, title: 'SECURE ACCESS', district: 'Riverside', type: 'LINEAR FUNCTION', subtitle: 'Pintu terkunci. Jawabannya ada di dalam pesan.',
      briefing: 'Terminal Riverside menyimpan log sebelum The Grid padam. Kunci aksesnya adalah CAT. Pilih transmisi yang tepat agar pintu terbuka.',
      fn: f, stages: [{ kind: 'sequence', plain: 'CAT', objective: 'Pilih sandi numerik yang benar untuk kata CAT.', options: [[8, 3, 41], [11, 5, 62], [9, 3, 60], [11, 6, 62]], hint: 'C = 3, A = 1, T = 20. Hitung 3x + 2 untuk masing-masing huruf. Jangan menggabungkan hasilnya.' }],
      explanation: 'C: 3(3) + 2 = 11. A: 3(1) + 2 = 5. T: 3(20) + 2 = 62. Kode aksesnya [11, 5, 62].',
      story: 'Pintu terbuka. Log Riverside menunjukkan bahwa pemadaman dimulai dari dalam jaringan. Aria berhenti bicara sejenak. “Ini bukan gangguan biasa.”',
      clue: { id: 'access', title: '02 / Akses dari dalam', sender: 'RIVERSIDE LOG', text: '23:41 — akses internal diterima. 23:42 — protokol isolasi dimulai. Tidak ada percobaan akses eksternal. Siapa pun pelakunya sudah berada di dalam The Grid.' },
      x: 40, y: 40
    },
    {
      id: 2, title: 'DOUBLE AGENT', district: 'Data Spire', type: 'COMPOSITE FUNCTION', subtitle: 'Dua lapis sandi. Satu urutan yang benar.',
      briefing: 'Data Spire mengubah pesan dua kali. Jalankan g terlebih dahulu, lalu f. Ada jejak pengirim asing di antara kedua transformasi itu.',
      fn: composed, f, g, stages: [
        { kind: 'composition', objective: 'Temukan fungsi komposisi (f ∘ g)(x).', options: [{ a: 6, b: 4 }, { a: 5, b: 3 }, { a: 6, b: 5 }, { a: 6, b: 3 }], hint: 'f(g(x)) = 3(2x + 1) + 2. Kalikan 3 ke semua suku di dalam kurung, lalu jumlahkan konstanta.' },
        { kind: 'encode', plain: 'HI', objective: 'Gunakan E(x) = 6x + 5 untuk mengirim HI.', hint: 'Gunakan H = 8 dan I = 9. Hitung 6 × 8 + 5, lalu 6 × 9 + 5.' }
      ],
      explanation: 'f(g(x)) = 3(2x + 1) + 2 = 6x + 5. H → 53 dan I → 59. Untuk pasangan fungsi khusus ini g(f(x)) kebetulan sama, tetapi komposisi fungsi secara umum tidak komutatif.',
      story: 'Layar berkedip magenta. Pesan asing masuk: “Kalian memulihkan jalur yang sengaja kututup.” Tanda tangan digitalnya hanya empat karakter: NULL.',
      clue: { id: 'null', title: '03 / Pengirim tanpa nama', sender: 'NULL', text: 'Kalian memulihkan jalur yang sengaja kututup. Ada sesuatu di dalam Core. Jangan percaya pesan pertama yang kalian terima.' },
      x: 57, y: 31
    },
    {
      id: 3, title: 'INTERCEPTED SIGNAL', district: 'Old Sector', type: 'INVERSE FUNCTION', subtitle: 'Sebuah lokasi tersembunyi di balik angka.',
      briefing: 'NULL meninggalkan koordinat dalam bentuk kata. Balikkan fungsi enkripsinya dan temukan tempat yang sudah lama dihapus dari peta kota.',
      fn: f, stages: [{ kind: 'decode', cipher: [11, 5, 8, 29, 44], objective: 'Dekripsi transmisi dan temukan nama lokasi.', hint: 'Kurangi setiap angka dengan 2, kemudian bagi 3. Angka pertama: (11 − 2) ÷ 3 = 3, yaitu C.' }],
      explanation: '(11−2)/3 = 3 (C), (5−2)/3 = 1 (A), (8−2)/3 = 2 (B), (29−2)/3 = 9 (I), (44−2)/3 = 14 (N). Lokasi: CABIN.',
      story: 'CABIN. Sebuah stasiun relai terbengkalai di Old Sector. Di sana, Aria menemukan rekaman suaranya sendiri—bertanggal besok.',
      clue: { id: 'cabin', title: '04 / Rekaman dari CABIN', sender: 'UNKNOWN / ARIA?', text: '“Jika kamu mendengar ini, jangan matikan jalur cadangan. NULL bukan satu-satunya yang bisa mendengar.” Stempel waktu: 27 Oktober 2149. Satu hari dari sekarang.' },
      x: 59, y: 67
    },
    {
      id: 4, title: 'REPAIR THE SIGNAL', district: 'Skyline', type: 'SIGNAL DIAGNOSTICS', subtitle: 'Satu angka salah bisa mengubah segalanya.',
      briefing: 'Transkrip Skyline tampak normal, tetapi satu perhitungannya tidak cocok. Temukan baris yang rusak, perbaiki hasilnya, dan verifikasi sinyal.',
      fn: { a: 2, b: 3 }, stages: [{ kind: 'repair', plain: 'SAFE', corruptIndex: 2, corruptValue: 12, objective: 'Pilih baris yang salah dan masukkan hasil yang benar.', hint: 'Periksa baris F. F = 6, sehingga 2 × 6 + 3 seharusnya berapa? Perkalian dikerjakan lebih dahulu.' }],
      explanation: 'Baris F salah: 2(6) + 3 = 15, bukan 12. Urutan yang telah diperbaiki adalah [41, 5, 15, 13].',
      story: 'Gangguan itu bukan kerusakan acak. NULL sengaja menyisipkan satu kesalahan agar sistem otomatis tidak bisa membaca pesan. Manusia masih bisa.',
      clue: { id: 'repair', title: '05 / Kesalahan yang disengaja', sender: 'ARIA', text: 'Pola kerusakan terlalu rapi. NULL menyembunyikan pesan dari sistem, bukan dari kita. Ada protokol penghapusan di Core. Kita harus sampai sebelum aktif.' },
      x: 78, y: 44
    },
    {
      id: 5, title: 'FINAL TRANSMISSION', district: 'Core', type: 'COMPOSITE + INVERSE', subtitle: 'Seluruh kota menunggu jawabanmu.',
      briefing: 'Core menunggu sinyal pembuka. Kirim GO menggunakan komposisi kedua fungsi, lalu baca responsnya. Jalur terakhir ini menentukan nasib Novaris.',
      fn: composed, f, g, stages: [
        { kind: 'encode', plain: 'GO', objective: 'Kirim GO dengan E(x) = (f ∘ g)(x) = 6x + 5.', hint: 'G = 7 dan O = 15. Hitung 6(7) + 5 dan 6(15) + 5 secara terpisah.' },
        { kind: 'decode', cipher: [119, 11, 41, 35], objective: 'Balikkan fungsi dan baca respons terakhir dari Core.', hint: 'Gunakan E⁻¹(x) = (x − 5) / 6. Angka pertama: (119 − 5) / 6 = 19 = S.' }
      ],
      explanation: 'GO → [6(7)+5, 6(15)+5] = [47, 95]. Respons [119, 11, 41, 35] dibalik dengan (x−5)/6 menjadi [19, 1, 6, 5], yaitu SAFE.',
      story: 'SAFE. Lampu-lampu kota menyala satu per satu. Protokol penghapusan berhenti. Di antara ribuan ucapan terima kasih, satu pesan masih menunggu: “Sekarang kalian tahu cara mendengarkan.” — NULL',
      clue: { id: 'final', title: '06 / Lost transmission, found', sender: 'NULL', text: 'Sekarang kalian tahu cara mendengarkan. Jaringan sudah aman. Untuk saat ini. Kalau Aria bertanya siapa aku, katakan: kita pernah bertemu.' },
      x: 86, y: 28
    }
  ];
  const intro = [
    { id: 'city', character: 'NOVARIS', label: '26 OKTOBER 2149 · 23:47', text: 'Kota ini tak pernah tidur. Sampai malam ketika semua suaranya menghilang.', art: 'city' },
    { id: 'failure', character: 'EMERGENCY CHANNEL', label: 'THE GRID / CONNECTION LOST', text: 'Enam distrik terputus. Pesan berubah menjadi angka. Dan di suatu tempat, seseorang masih mengirim sinyal.', art: 'city' },
    { id: 'aria', character: 'ARIA', label: 'UNDERGROUND SAFEHOUSE', text: 'Runner, kamu dengar aku? The Grid kehilangan koneksi ke seluruh distrik. Aku butuh seseorang yang bisa membaca apa yang mesin-mesin ini tak pahami.', art: 'hub' },
    { id: 'first-message', character: 'ARIA', label: 'CHANNEL 01 / CONNECTED', text: 'Mulai dari yang kecil. Satu pesan ke markas. Kalau mereka membalas, kita tidak sendirian. Sebelum itu—aku harus memanggilmu siapa?', art: 'hub', callsign: true }
  ];
  root.Cipher = { math, missions, intro, VERSION: 2, SAVE_KEY: 'cipher-ops-save-v2', SETTINGS_KEY: 'cipher-ops-settings-v2' };
  if (typeof module !== 'undefined') module.exports = root.Cipher;
})(typeof window !== 'undefined' ? window : globalThis);
