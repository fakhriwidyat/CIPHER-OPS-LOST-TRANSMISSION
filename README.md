# CIPHER OPS: Lost Transmission

Petualangan naratif pixel-art berbahasa Indonesia. Mode solo dan local co-op bisa dibuka langsung dari **index.html** tanpa internet. Mode **Main Bareng** memakai server untuk 2–4 pemain di perangkat masing-masing.

- Enam distrik, enam misi dengan fungsi linear, komposisi, invers, dan perbaikan sinyal.
- Safehouse interaktif, pilihan dialog Aria, archive petunjuk, dan akhir campaign.
- Tiga nyawa per misi; input kosong atau format tidak valid tidak mengurangi nyawa.
- Skor terbaik dan bintang tiap misi disimpan otomatis melalui localStorage. Total campaign adalah jumlah skor terbaik, sehingga replay tidak menggandakan poin.
- Local co-op: tiga ronde, Sender → transmisi → serah-terima → Receiver di satu perangkat.
- Main Bareng: room 2–4 perangkat, kode 6 karakter, lobby siap, enam misi, nyawa/skor bersama, dan sambung ulang setelah refresh.
- Musik ambient orisinal, hujan, dengung mesin, langkah, dan efek interaksi melalui Web Audio. Pengaturan Reduce motion mengikuti preferensi perangkat saat pertama bermain.

## Main Bareng / 2–4 perangkat

Link online: https://cipher-ops-lost-transmission.wavycat8.chatgpt.site

1. Semua membuka link game online dan memilih **MAIN BARENG**.
2. Host mengisi callsign, menekan **BUAT ROOM**, lalu **SALIN UNDANGAN**.
3. Teman mengisi callsign berbeda dan kode 6 karakter, lalu **GABUNG ROOM**.
4. Pilih karakter yang belum dipakai teman. Semua menekan **SAYA SIAP**, lalu host menekan **MULAI MISI**. Bisa mulai dengan dua atau tiga pemain.
5. Kerjakan tugas sesuai operator. Setelah semua kontribusi selesai, tahap selanjutnya terbuka. Host melanjutkan ke distrik berikutnya.

Empat karakter memiliki sprite, perlengkapan, portrait, dan peran berbeda: **KAI** (kurir sinyal, scarf cyan), **NYX** (analis sandi, hood dan visor ungu), **BOLT** (teknisi, kacamata dan lengan mekanik), dan **IRIS** (navigator, mantel hijau dan pemindai). Pilihan karakter unik per room dan terkunci saat misi berjalan; mengganti karakter di lobby membatalkan kesiapanmu.

Setiap tahap memberikan empat jenis tugas berbeda jika tim lengkap. Ada enkripsi, dekripsi, pemilihan paket, komposisi, perbaikan log, dan kalibrasi fungsi dari dua pengukuran. Huruf, koefisien, posisi kesalahan, serta urutan pilihan berubah antar-room dan sesi baru. Paket tetap stabil saat refresh atau retry. Tujuan distrik dan skor tetap dibagi bersama, dengan progres kontribusi tiap anggota ditampilkan di layar. Pembahasan hasil disesuaikan dengan tugas pemain.

Room lama yang sudah menjalankan misi mempertahankan soal lamanya. Untuk mencoba peran dan tugas baru, refresh semua perangkat lalu buat room baru atau buka lobby baru.

Tiga nyawa dibagi per misi. Jawaban salah mengurangi satu nyawa; format kosong/salah tidak. Hint mengurangi 25 poin tim. Setiap distrik memberi maksimal 150 poin tim; total enam distrik maksimal 900. Validasi dan pergantian tahap ditentukan server.

Refresh pada tab yang sama menyambungkan kembali pemain. Setelah 18 detik tanpa kabar, pemain dianggap terputus dan misi dijeda. Host otomatis berpindah ke anggota yang masih tersambung. Host dapat mengeluarkan pemain terputus, tetapi misi tetap membutuhkan dua anggota. Pemain baru hanya masuk di lobby. **Buka lobby baru** mereset progres tim untuk sesi baru.

Sesi pemain tersimpan di sessionStorage per tab. Menutup tab atau menghapus data sesi dapat menghilangkan akses ke slot lama. Room kedaluwarsa setelah enam jam tanpa aktivitas. Campaign solo terpisah.

Server lokal mendukung jaringan yang sama; room hilang saat server dimatikan. Untuk jaringan internet berbeda, gunakan versi hosted dari folder **online/** dengan database D1. Membagikan alamat `127.0.0.1` tidak menghubungkan perangkat lain.

## Deploy ke Vercel

Gunakan root repository ini (`.`), Framework Preset **Other**. Konfigurasi `vercel.json` menetapkan deployment tanpa build/install dan output direktori root. Folder `api/` wajib ikut di-push: `api/gateway.mjs` adalah Vercel Function untuk API multiplayer. Jangan deploy hanya `index.html`, CSS, dan JavaScript.

Alur server: browser → `/api/rooms/...` di domain Vercel yang sama → Vercel Function → server room HTTPS yang sudah tersedia → database D1. Tidak perlu membuat database baru atau menambahkan API key pada frontend. Room tidak disimpan di memori Vercel, sehingga sesi dari perangkat berbeda dan instance function yang berbeda tetap tersinkron.

`/api/health` harus menjawab JSON dengan `ok: true` dan `maxPlayers: 4`. Jika endpoint ini 404, pastikan Root Directory bukan `online/`, folder `api/` dan `vercel.json` ikut pada commit, lalu redeploy. Setelah commit ke branch yang terhubung Vercel, tunggu deployment **Ready** dan refresh game. Tes lengkap: `node tests/smoke-online.mjs https://ALAMAT-VERCEL-KAMU`.

Server room bawaan masih bergantung pada hosting CIPHER OPS yang sudah berjalan. Jika server itu dipindahkan nanti, ubah konstanta `DEFAULT_SERVER` di `api/gateway.mjs` dan redeploy Vercel. Gateway hanya meneruskan endpoint game yang diizinkan; cookie browser tidak diteruskan ke server room.

## Mixer audio

Audio mulai setelah klik, ketukan, atau tombol pertama. Sesi baru memakai audio aktif dengan volume sedang; preferensi mute yang pernah disimpan tetap dihormati. Klik ikon speaker untuk mengaktifkan atau mematikan semua suara.

Di **Settings**, atur **Master**, **Music**, **Ambience**, dan **Sound FX** secara terpisah. **Tes Suara** memainkan contoh terminal, langkah, dan nada keberhasilan. Musik dibuat lebih pelan tanpa melodi utama selama puzzle/dialog, dan playback dijeda ketika tab tidak aktif. Suara langkah hanya muncul saat Runner benar-benar bergerak.

Seluruh musik, hujan, dengung, dan efek dibuat lokal oleh `js/audio.js`; tidak memakai streaming, file jarak jauh, atau layanan suara. `previews/soundcheck.wav` adalah contoh render 18 detik untuk QA, bukan aset wajib game.

## Menggerakkan karakter

- **WASD atau tombol panah:** berjalan di lantai Safehouse.
- **E:** memakai objek terdekat saat petunjuk interaksi muncul.
- **Klik lantai:** berjalan ke titik yang dipilih, dengan rute yang menghindari meja dan peralatan.
- **Klik terminal, peta, archive, atau Aria:** Runner mendekat lalu membuka interaksi tersebut.
- **Ponsel:** tahan tombol D-pad untuk berjalan; ketuk tombol interaksi yang muncul di dekat objek.

Soal matematika dibuka melalui **Central Terminal**, lalu **Establish Connection**. Karakter Runner dan Aria digambar lokal dengan pose empat arah, animasi langkah, idle, dan portrait baru. Pengaturan Reduce motion mengurangi efek tambahan; gerak yang dikendalikan pemain tetap aktif.

## Menjalankan preview dan pengujian

Jika Node.js tersedia, jalankan `node scripts/serve.cjs`, lalu buka http://127.0.0.1:4173. Server diperlukan untuk Main Bareng, sedangkan solo bisa dimainkan langsung dari file.

Jalankan tes dengan `node --test tests/math.cjs tests/game.cjs tests/exploration.cjs tests/controller.cjs tests/audio.cjs tests/rooms.mjs` (Node 24 dipakai untuk tes SQLite). `node tests/smoke-online.mjs http://127.0.0.1:4175` menguji empat sesi HTTP pada hasil build server lokal. Catatan pengujian browser ada di `TESTING.md`.

## Struktur

`js/data.js` menyimpan fungsi matematika, misi, intro, dan narasi. `js/art.js` menggambar lingkungan di canvas 960 × 540. `js/characters.js` menggambar karakter dan portrait, sedangkan `js/exploration.js` menangani gerak, benturan, pencarian rute, dan interaksi dekat objek. `js/audio.js` menyediakan musik, ambience, mixer, dan efek. `js/game.js` menangani state, navigasi, validasi, save, dan co-op. Stylesheet ada di `css/style.css`, `css/exploration.css`, dan `css/audio.css`. Wordmark lokal di `assets/title.svg` dibuat melalui `scripts/create-title.cjs`.

## Aturan skor

Selesai +100; tanpa salah +50; tiap salah −10; tiap hint berbayar −25; minimum 0. ★★★ tanpa kesalahan atau hint, ★★ maksimal satu kesalahan tanpa hint, ★ untuk penyelesaian lainnya. Token dari Aria menghapus penalti 25 poin untuk satu hint tetapi tetap dihitung sebagai bantuan untuk rating.

Save bersifat lokal pada browser dan origin. Browser dapat memisahkan save `file://` dan preview HTTP. Saat penyimpanan tidak tersedia, game tetap bisa dimainkan; progres bertahan selama sesi itu terbuka. Campaign solo disimpan; sesi co-op berlangsung dalam satu sesi browser.

Ini simulasi pembelajaran matematika. Transformasi karakter dan serah-terima layar tidak dimaksudkan sebagai keamanan kriptografi nyata.
