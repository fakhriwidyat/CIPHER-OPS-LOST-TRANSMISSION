# CIPHER OPS: Lost Transmission

Petualangan naratif pixel-art berbahasa Indonesia. Buka **index.html** langsung di browser modern untuk bermain. Tidak perlu instalasi, build, akun, atau internet.

- Enam distrik, enam misi dengan fungsi linear, komposisi, invers, dan perbaikan sinyal.
- Safehouse interaktif, pilihan dialog Aria, archive petunjuk, dan akhir campaign.
- Tiga nyawa per misi; input kosong atau format tidak valid tidak mengurangi nyawa.
- Skor terbaik dan bintang tiap misi disimpan otomatis melalui localStorage. Total campaign adalah jumlah skor terbaik, sehingga replay tidak menggandakan poin.
- Local co-op: tiga ronde, Sender → transmisi → serah-terima → Receiver. Skor dan nyawa ronde dibagi bersama. Tidak menggunakan multiplayer online.
- Musik ambient orisinal, hujan, dengung mesin, langkah, dan efek interaksi melalui Web Audio. Pengaturan Reduce motion mengikuti preferensi perangkat saat pertama bermain.

## Suara

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

Jika Node.js tersedia, jalankan `node scripts/serve.cjs`, lalu buka http://127.0.0.1:4173. Ini hanya kemudahan untuk development; server tidak dibutuhkan untuk bermain.

Jalankan semua tes dengan `node --test tests/math.cjs tests/game.cjs tests/exploration.cjs tests/controller.cjs tests/audio.cjs`. Catatan pengujian browser ada di `TESTING.md`.

## Struktur

`js/data.js` menyimpan fungsi matematika, misi, intro, dan narasi. `js/art.js` menggambar lingkungan di canvas 960 × 540. `js/characters.js` menggambar karakter dan portrait, sedangkan `js/exploration.js` menangani gerak, benturan, pencarian rute, dan interaksi dekat objek. `js/audio.js` menyediakan musik, ambience, mixer, dan efek. `js/game.js` menangani state, navigasi, validasi, save, dan co-op. Stylesheet ada di `css/style.css`, `css/exploration.css`, dan `css/audio.css`. Wordmark lokal di `assets/title.svg` dibuat melalui `scripts/create-title.cjs`.

## Aturan skor

Selesai +100; tanpa salah +50; tiap salah −10; tiap hint berbayar −25; minimum 0. ★★★ tanpa kesalahan atau hint, ★★ maksimal satu kesalahan tanpa hint, ★ untuk penyelesaian lainnya. Token dari Aria menghapus penalti 25 poin untuk satu hint tetapi tetap dihitung sebagai bantuan untuk rating.

Save bersifat lokal pada browser dan origin. Browser dapat memisahkan save `file://` dan preview HTTP. Saat penyimpanan tidak tersedia, game tetap bisa dimainkan; progres bertahan selama sesi itu terbuka. Campaign solo disimpan; sesi co-op berlangsung dalam satu sesi browser.

Ini simulasi pembelajaran matematika. Transformasi karakter dan serah-terima layar tidak dimaksudkan sebagai keamanan kriptografi nyata.
