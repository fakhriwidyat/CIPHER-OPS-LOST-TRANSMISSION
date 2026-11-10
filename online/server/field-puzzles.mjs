// All solutions stay on the room server. Each builder takes an explicit variant (0–7).
const words = ['KABEL', 'PINTU', 'SUARA', 'LAMPU', 'KUNCI', 'JALUR', 'KODE', 'ARSIP'];
const letters = word => [...word].map(c => c.charCodeAt(0) - 64);
const cipher = (word, a, b) => letters(word).map(x => a * x + b);
const mod = (n, m) => (n % m + m) % m;
const list = values => values.join(', ');
const number = (brief, lines, answer, hint) => ({ brief, lines, answers: [String(answer)], kind: 'number', format: 'Bilangan bulat', hint });
const series = (brief, lines, answer, hint) => ({ brief, lines, answers: [list(answer)], kind: 'series', length: answer.length, format: answer.length + ' bilangan, pisahkan dengan koma', hint });
const code = (brief, lines, answer, hint) => ({ brief, lines, answers: [answer], kind: 'code', format: 'Huruf A–Z', hint });
function choice(v, brief, lines, options, correct, hint) {
  const offset = v % options.length;
  const rotated = [...options.slice(offset), ...options.slice(0, offset)];
  return { brief, lines, options: rotated, answers: correct.map(i => options[i]), kind: 'choice', format: 'Pilih satu', hint };
}
const entry = (id, title, build) => ({ id, title, build });
// In each district, pairs follow Kai, Nyx, Bolt, Iris. Each pair shares a station and a specialty.
export const BANKS = [
  [
    entry('call', 'Enkripsi panggilan', v => series('Kirim kata panggilan ke kanal darurat.', [`Kata: ${words[v]} · A=1, …, Z=26`, `E(x) = 2x + ${v + 2}`], cipher(words[v], 2, v + 2), 'Ubah setiap huruf menjadi angka, kalikan dua, lalu tambahkan konstanta.')),
    entry('header', 'Buat kepala paket', v => number('Buat digit cek agar penerima tahu paket sampai utuh.', [`Paket: ${v + 4}, 7, 3`, 'Digit cek = sisa dari (1 × angka pertama + 2 × angka kedua + 3 × angka ketiga) dibagi 10.'], (v + 27) % 10, 'Jumlahkan tiga hasil perkalian sebelum mencari sisa.')),
    entry('call-back', 'Baca jawaban markas', v => code('Ubah angka masuk menjadi satu kata.', [`Paket: ${list(cipher(words[v], 3, v + 1))}`, `x = (y − ${v + 1}) ÷ 3 · A=1, …, Z=26`], words[v], 'Hitung x untuk setiap angka secara berurutan.')),
    entry('missing', 'Cari nomor paket hilang', v => number('Isi celah sehingga penerima bisa merakit data.', [`Nomor masuk: ${v + 2}, ${v + 7}, ?, ${v + 17}`, 'Selisih nomor paket selalu sama.'], v + 12, 'Bandingkan dua nomor pertama untuk mendapat langkahnya.')),
    entry('bad-port', 'Temukan port yang salah', v => {
      const ports = [1, 2, 3, 4], bad = v % 4;
      return choice(v, 'Satu port memberi pembacaan yang salah. Pilih port untuk diperbaiki.', [`Pembacaan normal: y = 4x + ${v}`, ...ports.map((p, i) => `Port ${p} → ${4 * p + v + (i === bad ? 3 : 0)}`)], ports.map(p => 'Port ' + p), [bad], 'Uji rumus pada setiap nomor port. Hanya satu pembacaan yang meleset.');
    }),
    entry('battery', 'Bagi daya bengkel', v => number('Hitung cadangan setelah tiga unit diberi daya.', [`Baterai: ${28 + v} unit. Terminal perlu 8, pemancar 7, relay 6.`], 7 + v, 'Kurangi total kebutuhan dari isi baterai.')),
    entry('order', 'Urutkan kiriman', v => {
      const ports = ['A', 'B', 'C', 'D'], ordered = [...ports.slice(v % 4), ...ports.slice(0, v % 4)];
      if (v >= 4) ordered.reverse();
      return code('Susun huruf relay dari cap waktu terkecil ke terbesar.', ports.map(p => `${p} tiba pada detik ${12 + v + 3 * ordered.indexOf(p)}`), ordered.join(''), 'Urutkan cap waktunya, lalu salin hurufnya tanpa pemisah.');
    }),
    entry('relay-cost', 'Bandingkan tiga relay', v => {
      const costs = [5 + v, 6, 16 - v], cheapest = Math.min(...costs);
      return choice(v, 'Pilih relay aktif dengan biaya paling kecil. Jika seri, keduanya boleh.', [`A = 5 + ${v} · B = 2 + 4 · C = 10 + ${6 - v}`], ['Relay A', 'Relay B', 'Relay C'], costs.flatMap((cost, i) => cost === cheapest ? [i] : []), 'Hitung total untuk A, B, dan C, lalu bandingkan.');
    })
  ],
  [
    entry('sluice', 'Balik kode pintu air', v => number('Cari setelan awal x agar pintu air terbuka.', [`Sensor membaca y = ${5 * (v + 3) - 4} · y = 5x − 4`], v + 3, 'Tambah empat ke y, lalu bagi lima.')),
    entry('lamp-command', 'Kirim perintah lampu', v => series('Kirim koordinat lampu setelah digeser mengikuti arus.', [`Lampu di (${v + 1}, ${12 - v})`, 'Geser 3 ke timur (+x) dan 2 ke selatan (−y). Urutan x, y.'], [v + 4, 10 - v], 'Tambahkan 3 pada x dan kurangi 2 pada y.')),
    entry('beacon', 'Baca koordinat suar', v => {
      const x = 2 + v % 4, y = 2 + Math.floor(v / 4);
      return series('Urai kode suar menjadi posisi (x, y).', [`Kode ${10 * x + y} · kode = 10x + y · y hanya satu digit.`], [x, y], 'Digit puluhan adalah x. Digit satuan adalah y.');
    }),
    entry('lamp-order', 'Baca lampu berselang', v => code('Lampu mengirim huruf asli pada ketukan 1, 3, 5, dan seterusnya.', [`Rekaman: ${[...words[v]].map((c, i) => c + 'ZXQJK'[(i + v) % 5]).join(' ')}`], words[v], 'Lewati ketukan ke-2, ke-4, dan ketukan genap lainnya.')),
    entry('bridge-weight', 'Seimbangkan beban jembatan', v => number('Tentukan muatan tambahan maksimum yang boleh lewat.', [`Batas ${45 + v} kg · operator 25 kg · baterai 12 kg`], 8 + v, 'Kurangi dua beban yang sudah tercatat.')),
    entry('pump-cycle', 'Cari saat pompa bertemu', v => {
      const a = v + 2, b = 3;
      let sync = a; while (sync % b !== 0) sync += a;
      return number('Kedua pompa menyala sekarang. Dalam berapa detik keduanya menyala bersama lagi?', [`Pompa A tiap ${a} detik · Pompa B tiap ${b} detik`], sync, 'Cari kelipatan positif pertama yang sama.');
    }),
    entry('canal-cost', 'Pilih rute kanal', v => {
      const fast = 3 + v, steady = 8;
      return choice(v, 'Pilih biaya terkecil. Jembatan butuh suku cadang, Dermaga sudah aktif. Kedua rute diterima jika biayanya sama.', [`Jembatan: jalan 3 + perbaikan ${v} · Dermaga: jalan 5 + jalan 3`], ['Jembatan', 'Dermaga'], fast <= steady ? steady === fast ? [0, 1] : [0] : [1], 'Bandingkan seluruh biaya, termasuk perbaikan.');
    }),
    entry('bridge-flow', 'Bandingkan waktu menyeberang', v => {
      const costs = [v + 3, 9, 12 - v], best = Math.min(...costs);
      return choice(v, 'Pilih lintasan paling cepat yang masih dapat dilalui. Waktu seri boleh dipilih.', [`Utara: 2 + ${v + 1} menit · Tengah: 4 + 5 menit · Selatan: 3 + ${9 - v} menit`, 'Lintasan Barat ditutup oleh arus.'], ['Utara', 'Tengah', 'Selatan', 'Barat'], costs.flatMap((c, i) => c === best ? [i] : []), 'Abaikan lintasan tertutup dan jumlahkan waktu tiap lintasan.');
    })
  ],
  [
    entry('layers', 'Jalankan dua lapisan', v => number('Hitung keluaran setelah data melewati g lalu f.', [`x = ${v + 2} · g(x) = 2x + 1 · f(z) = 3z − 2`], 3 * (2 * (v + 2) + 1) - 2, 'Masukkan x ke g. Masukkan hasil g ke f.')),
    entry('seal', 'Buat segel arsip', v => number('Hitung segel sebagai sisa bagi 11 dari kuadrat nomor paket ditambah 3.', [`Nomor paket = ${v + 3}`], ((v + 3) ** 2 + 3) % 11, 'Kuadratkan nomor, tambah tiga, lalu ambil sisa pembagian oleh sebelas.')),
    entry('unstack', 'Buka lapisan terbalik', v => number('Pulihkan x. Enkripsi mula-mula mengalikan x dengan 3, kemudian menambahkan 5.', [`Keluaran akhir = ${3 * (v + 4) + 5}`], v + 4, 'Batalkan operasi terakhir dulu, baru operasi pertama.')),
    entry('split-packet', 'Rangkai dua potongan data', v => {
      const word = words[v], even = [...word].filter((_, i) => i % 2).join(''), odd = [...word].filter((_, i) => !(i % 2)).join('');
      return code('Gabungkan dua potongan sesuai nomor posisi, dimulai dari posisi 1.', [`Posisi genap: ${even}`, `Posisi ganjil: ${odd}`], word, 'Ambil huruf bergantian dari potongan ganjil dan genap.');
    }),
    entry('fake', 'Tandai paket palsu', v => {
      const numbers = [v + 12, v + 20, v + 33], bad = v % 3;
      return choice(v, 'Tandai paket yang gagal verifikasi.', ['Segel yang benar = sisa nomor paket dibagi 7.', ...numbers.map((x, i) => `Paket ${i + 1}: nomor ${x}, segel ${(x + Number(i === bad)) % 7}`)], ['Paket 1', 'Paket 2', 'Paket 3'], [bad], 'Bandingkan segel pada layar dengan sisa pembagian yang kamu hitung.');
    }),
    entry('duplicate', 'Isolasi blok duplikat', v => {
      const nums = [v + 10, v + 18, v + 26, v + 34], bad = v % 4;
      return number('Hapus blok salinan. Masukkan nomor blok yang tercatat dua kali.', [`Log: ${list([...nums.slice(0, 2), nums[bad], ...nums.slice(2)])}`], nums[bad], 'Perhatikan kemunculan setiap nomor, termasuk entri yang berjauhan.');
    }),
    entry('layer-order', 'Pilih urutan transformasi', v => {
      const x = v + 1, target = v % 2 ? 2 * (x + 3) : 2 * x + 3;
      return choice(v, 'Pilih urutan yang menghasilkan target.', [`Input ${x} → target ${target} · A: tambah 3 · B: kali 2`], ['A lalu B', 'B lalu A'], [v % 2 ? 0 : 1], 'Hitung kedua urutan. Menambah sebelum mengalikan ikut mengalikan tambahannya.');
    }),
    entry('mirror', 'Petakan rak cermin', v => series('Cari lokasi rak cermin untuk menyalin data.', [`Rak (${v + 2}, ${4 + v % 3}) · cerminkan terhadap sumbu y (x=0). Urutan x, y.`], [-v - 2, 4 + v % 3], 'Balik tanda x. Nilai y tetap.'))
  ],
  [
    entry('torn-map', 'Sambung potongan koordinat', v => series('Satukan empat fragmen untuk mengirim lokasi stasiun.', [`Fragmen A: x = 2 × ${v + 2} · B: koreksi x = −3`, `Fragmen C: y = ${19 + v} · D: koreksi y = +4. Urutan x, y.`], [2 * v + 1, 23 + v], 'Terapkan koreksi pada masing-masing sumbu.')),
    entry('step-code', 'Isi kode deret stasiun', v => number('Hitung nomor berikutnya agar pintu stasiun terbuka.', [`Deret: ${v + 1}, ${v + 4}, ${v + 9}, ${v + 16}`, 'Selisih naik 2 pada setiap langkah.'], v + 25, 'Selisih terakhir adalah 7. Selisih selanjutnya 9.')),
    entry('symbols', 'Baca simbol di dinding', v => {
      const glyphs = ['△', '◇', '□', '○'], mapping = 'NOVA', i = v % 4, j = Math.floor(v / 4) + 1;
      const sequence = [i, (i + j) % 4, (i + 2 * j) % 4, (i + 3 * j) % 4];
      return code('Baca simbol pada urutan yang tertera.', [glyphs.map((g, k) => g + ' = ' + mapping[k]).join(' · '), 'Dinding: ' + sequence.map(k => glyphs[k]).join(' ')], sequence.map(k => mapping[k]).join(''), 'Ganti setiap simbol dengan satu huruf sesuai legenda.');
    }),
    entry('fragments', 'Gabungkan catatan lorong', v => {
      const word = words[v], cut = 1 + v % (word.length - 1);
      return code('Dua fragmen ditemukan terpisah. Susun berdasarkan nomor halaman.', [`Lorong belakang / halaman ${12 + v}: ${word.slice(cut)}`, `Gudang / halaman ${11 + v}: ${word.slice(0, cut)}`], word, 'Mulai dari halaman yang lebih kecil, meski tampil di baris kedua.');
    }),
    entry('table', 'Pulihkan tabel antena', v => number('Lengkapi bacaan pada baris keempat.', [`x: 1, 2, 3, 4 · y: ${3 + v}, ${6 + v}, ${9 + v}, ?`, 'Tabel mengikuti fungsi linear.'], 12 + v, 'Perubahan y setiap kenaikan x adalah tetap.')),
    entry('gear', 'Setel roda gigi', v => number('Cari putaran antena untuk memutar dial keluar sebanyak target.', [`1 putaran antena memutar dial keluar 4 langkah · target ${4 * (v + 4)} langkah`], v + 4, 'Bagi jumlah langkah dengan empat.')),
    entry('coordinates', 'Temukan simbol koordinat', v => {
      const grid = ['△', '□', '◇', '○', '☆', '＋', '※', '⊙'];
      return choice(v, 'Pilih simbol pada koordinat yang diminta. Hitung kolom x dari kiri dan baris y dari atas, mulai dari 1.', [`Baris 1: ${grid.slice(0, 4).join('  ')}`, `Baris 2: ${grid.slice(4).join('  ')}`, `Lokasi: (${1 + v % 4}, ${1 + Math.floor(v / 4)})`], grid, [v], 'Gunakan y untuk memilih baris, baru x untuk memilih simbol.');
    }),
    entry('corridor', 'Navigasi lorong buntu', v => series('Tentukan posisi akhir setelah menghindari lorong tertutup.', [`Mulai (${v}, 2) · 3 ke timur, 1 ke utara, 2 ke barat`, 'Timur = +x, utara = +y. Urutan x, y.'], [v + 1, 3], 'Jumlahkan perubahan mendatar dan vertikal secara terpisah.'))
  ],
  [
    entry('frequency', 'Cocokkan frekuensi kirim', v => number('Samakan frekuensi kirim dengan penerima.', [`Penerima ${145 + v} Hz · frekuensi sekarang 132 Hz`, 'Masukkan jumlah Hz yang perlu ditambahkan.'], 13 + v, 'Kurangi frekuensi sekarang dari target.')),
    entry('carrier', 'Sisipkan digit pembawa', v => number('Masukkan digit yang membuat jumlah digit paket menjadi kelipatan 10.', [`Paket: 7, ${v + 1}, ? · digit yang hilang antara 0 dan 9`], mod(-8 - v, 10), 'Tambahkan dua digit yang diketahui. Cari tambahan terkecil agar habis dibagi 10.')),
    entry('bands', 'Deteksi kanal tumpang tindih', v => {
      const center = 90 + 3 * v;
      return choice(v, 'Pilih kanal yang berada di dalam pita terlarang, termasuk batasnya.', [`Pita terlarang: ${center - 1}–${center + 1} Hz`], [center + ' Hz', center + 3 + ' Hz', center - 4 + ' Hz'], [0], 'Nilai harus lebih besar atau sama dengan batas bawah dan tidak lebih besar dari batas atas.');
    }),
    entry('spectral', 'Baca nada bergantian', v => number('Buang pembacaan ekstrem, lalu hitung rata-rata dua pembacaan tengah.', [`Pembacaan: ${100 + v}, ${150 + v}, ${40 + v}, ${108 + v} Hz`], 104 + v, 'Urutkan pembacaan. Sisakan dua nilai di tengah.')),
    entry('calibration', 'Kalibrasi menara dua titik', v => series('Cari koefisien a dan b dalam y = ax + b.', [`Titik (2, ${2 * (v + 2) + 3}) dan (5, ${5 * (v + 2) + 3}). Urutan a, b.`], [v + 2, 3], 'a = perubahan y ÷ perubahan x. Substitusikan salah satu titik untuk mendapat b.')),
    entry('split-power', 'Bagi beban tiga menara', v => {
      const need = 15 + v;
      return choice(v, 'Pilih alokasi (A, B, C) dengan total sesuai kebutuhan dan tanpa melebihi batas.', [`Kebutuhan ${need} unit · batas A=${8 + v}, B=7, C=8`], [`(${6 + v}, 4, 5)`, `(${5 + v}, 5, 5)`, `(${3 + v}, 8, 4)`, `(${7 + v}, 4, 5)`], [0, 1], 'Periksa total alokasi dan batas setiap menara secara terpisah.');
    }),
    entry('capacity', 'Pilih relay yang sanggup', v => {
      const loads = [7, 9 + v, 8 + v], capacities = [8, 10 + v, 11 + v];
      return choice(v, 'Relay mana yang memiliki kapasitas tersisa terbesar?', loads.map((n, i) => `Relay ${'ABC'[i]}: beban ${n}, kapasitas ${capacities[i]}`), ['Relay A', 'Relay B', 'Relay C'], [2], 'Bandingkan kapasitas dikurangi beban.');
    }),
    entry('antenna-angle', 'Arahkan pemancar atap', v => number('Setel sudut akhir dari 0–359 derajat.', [`Sudut awal ${350 + v}° · putar 25° searah jarum jam · satu putaran 360°`], 15 + v, 'Jumlahkan sudut awal dan putaran, lalu kurangi satu putaran penuh.'))
  ],
  [
    entry('authorize', 'Buat otorisasi Core', v => series('Sandi bergeser dengan alfabet A=0 sampai Z=25. Kirim angka hasil enkripsi.', [`Kata ${words[v]} · geser ${v + 3} · gunakan sisa pembagian 26`], letters(words[v]).map(x => (x + v + 2) % 26), 'Kurangi satu dari indeks alfabet biasa sebelum menambahkan geseran.')),
    entry('verify-core', 'Verifikasi respons dua langkah', v => number('Hitung tag Core setelah nilai x diubah menjadi 3x + 2 dan dibagi dengan aturan sisa.', [`x = ${v + 12} · tag = sisa pembagian (3x + 2) oleh 13`], (3 * (v + 12) + 2) % 13, 'Selesaikan operasi di dalam kurung sebelum mengambil sisa.')),
    entry('inverse-core', 'Balik dua mesin Core', v => number('Pulihkan input x. Mesin pertama menghitung 2x + 5, mesin kedua mengalikan hasilnya dengan 4.', [`Keluaran akhir ${4 * (2 * (v + 5) + 5)}`], v + 5, 'Bagi empat, kurangi lima, lalu bagi dua.')),
    entry('core-even', 'Pulihkan paket XOR', v => {
      const key = 1 + v % 7, data = 8 + v;
      return number('Pulihkan data dengan XOR terhadap kunci. Gunakan biner 4 bit. Bit berbeda menjadi 1, bit sama menjadi 0. Jawab dalam desimal.', [`Data terenkripsi: ${(data ^ key).toString(2).padStart(4, '0')} · kunci: ${key.toString(2).padStart(4, '0')}`], data, 'XOR setiap pasangan bit lalu baca bobotnya dari kiri: 8, 4, 2, 1.');
    }),
    entry('balance-core', 'Seimbangkan dua sirkuit', v => number('Pindahkan sejumlah unit dari A ke B sampai dayanya sama. Masukkan jumlah unit yang dipindah.', [`A = ${26 + 2 * v} unit · B = 12 unit`], 7 + v, 'Setiap unit yang dipindah mengecilkan selisih sebanyak dua unit.')),
    entry('broken-output', 'Temukan mesin yang menyimpang', v => {
      const bad = v % 3, inputs = [2, 4, 6];
      return choice(v, 'Pilih mesin yang gagal menjalankan kedua transformasi.', [`Protokol: tambahkan ${v + 1} lalu kalikan dua`, ...inputs.map((x, i) => `Mesin ${i + 1}: ${x} → ${2 * (x + v + 1) + (i === bad ? 1 : 0)}`)], ['Mesin 1', 'Mesin 2', 'Mesin 3'], [bad], 'Jalankan protokol dalam urutan yang ditulis pada setiap input.');
    }),
    entry('live-route', 'Cari rute yang masih hidup', v => {
      const off = v % 3, paths = ['A–B', 'C–D', 'E–F'], costs = [5 + v, 9, 13 - v];
      const best = Math.min(...costs.filter((_, i) => i !== off));
      return choice(v, 'Cari rute aktif termurah. Semua yang seri diterima.', paths.map((p, i) => `${p} · ${i === off ? 'MATI' : 'AKTIF'} · biaya ${costs[i]}`), paths, costs.flatMap((c, i) => c === best && i !== off ? [i] : []), 'Core mengabaikan setiap rute yang mati, berapa pun biayanya.');
    }),
    entry('weighted-core', 'Atur jendela transmisi', v => number('Pilih waktu pertama kedua perangkat bisa mengirim bersamaan. Isi menit setelah mulai.', [`Pemancar tiap 4 menit · router tiap ${v + 3} menit · keduanya aktif saat menit 0. Cari waktu bersama setelah itu.`], Array.from({ length: v + 3 }, (_, i) => 4 * (i + 1)).find(x => x % (v + 3) === 0), 'Cari kelipatan positif bersama terkecil dari kedua interval.'))
  ]
];

export function parseAnswer(puzzle, input) {
  if (typeof input !== 'string' || input.length > 100) return null;
  const value = input.trim();
  if (puzzle.kind === 'choice') return puzzle.options.includes(value) ? value : null;
  if (puzzle.kind === 'code') return /^[A-Z]+$/i.test(value) ? value.toUpperCase() : null;
  const values = value.split(',').map(part => part.trim());
  if (values.length !== (puzzle.length || 1) || !values.every(part => /^[+-]?\d{1,8}$/.test(part))) return null;
  return list(values.map(Number));
}
