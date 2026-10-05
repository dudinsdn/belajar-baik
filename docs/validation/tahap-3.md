# Validasi Tahap 3 — Modul Belajar Dinamis

- Status: **Lulus lokal** — ketiga kriteria penerimaan mempunyai bukti D1/API,
  browser desktop/seluler, persistensi, dan koneksi terputus yang relevan.
- Tanggal: 5 Oktober 2026.
- Kode: worktree di atas `7a93a90`, tanpa commit baru. Identitas hash sumber
  dicatat pada handoff setelah semua perubahan aplikasi selesai.
- Lingkungan: Linux, Node.js 24.21.0, Vinext, D1 lokal. Tutor Adi dan Dudin
  diuji bergantian pada satu proses server dengan strict port `3000`.
- Tidak ada identitas/D1 hosted, push, publikasi Sites, atau deployment.

## Kriteria dan bukti

| Kriteria                                            | Artefak dan skenario                                                                                                                                                 | Hasil lokal                                                                                                                                                                                                                                                                                                                                                                                                                 | Batas                                                                                                                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Isi materi berasal dari database                    | `server/data/modules.ts`, `/api/v1/modules/[materialId]`, `module-reader.tsx`; tutor menyimpan dan menerbitkan fixture UJI dua bagian, kemudian Dudin membaca isinya | Teks, judul, urutan, KD, tujuan, mode, estimasi, dan alokasi berasal dari D1. Draf tidak tersedia bagi siswa. Isi materi lama juga dibaca dari D1, tanpa fallback statis                                                                                                                                                                                                                                                    | Materi lama belum dikonversi menjadi bagian; progres lamanya diberi label historis dan tidak ditulis ulang                                                                          |
| Progres dihitung dari bagian yang selesai           | `material_section_progress`, `updateSection`, endpoint PUT; tes domain dan browser menyelesaikan satu dari dua bagian                                                | Server menghasilkan 50%; membuka bagian dan memberi penanda tidak menaikkan persentase. Endpoint persen lama menolak modul baru. Penyelesaian berulang tidak mengubah waktu selesai bagian. Posisi kedua dan penanda pulih setelah restart                                                                                                                                                                                  | Tombol selesai mencatat proses belajar; bukan penilaian, bukti ketuntasan KD, atau pengakuan SKK                                                                                    |
| Modul terbaca pada layar kecil dan koneksi terbatas | `modules.css`, reader desktop 1440×900 dan seluler 390×844; API lambat saat startup, server dihentikan, unduhan teks dan teks lengkap                                | Pada seluler tidak ada overflow horizontal, target interaktif reader minimal 44px, font dapat diubah menjadi 20px dan mode baca berubah. Loading teramati tanpa data contoh. Isi yang sudah dimuat tetap terbaca dan dapat berpindah bagian saat server berhenti; posisi yang gagal disimpan tidak diklaim tersimpan. Pertanyaan gagal tetap berada pada textarea. Berkas unduhan UTF-8 686 byte memuat kedua bagian dan KD | Koneksi terbatas disimulasikan dengan menghentikan server; jeda pemuatan berasal dari runtime lokal, bukan throttling jaringan terukur. Perangkat/jaringan nyata mengikuti Tahap 10 |

## Cakupan dan batas tahap

- Tutor menyusun 1–50 bagian teks, mengatur urutan, jenis bagian, KD, dan mode
  mandiri/tutorial/tatap muka. Jenis mendukung identitas/tujuan, konteks, materi,
  kegiatan, latihan, refleksi, rangkuman, asesmen, bukti, serta media/transkrip.
  Latihan dan asesmen pada tahap ini adalah isi/instruksi modul; mesin
  asesmen, jawaban, dan penilaian lengkap tetap Tahap 4/5.
- Estimasi menit dan bobot SKK rencana modul dikonfigurasi tutor. Bobot opsional
  tidak boleh melampaui alokasi mata pelajaran pada setiap KD bagian. Alokasi
  mata pelajaran ditampilkan terpisah; tidak ada penambahan SKK tercapai atau
  ledger. Jika bobot belum ditetapkan, UI menyatakannya secara eksplisit.
- Prasyarat adalah modul terbit lain pada penugasan yang sama. Server menolak
  pembacaan, unduhan, dan mutasi modul lanjutan sebelum prasyarat selesai.
  Prasyarat ini mengatur urutan belajar, bukan pengakuan kompetensi.
- Publikasi memakai gerbang kurikulum yang sudah ada dan wajib menyertakan
  seluruh KD bagian. Isi, urutan, pengaturan, dan pemetaan terbit terkunci;
  revisi memakai draf dengan ID baru. Trigger database melindungi isi terbit.
- Penanda dan pertanyaan terkait bagian disimpan di D1 per siswa. Tutor melihat
  hingga 100 pertanyaan terbaru, jumlah selesai, jumlah sudah membuka tetapi
  belum selesai, dan jumlah pertanyaan per bagian. Tidak ada pesan eksternal
  atau notifikasi otomatis.
- Lampiran audio/video memakai URL HTTPS tanpa kredensial. Isi/transkrip wajib
  diisi; player menggunakan `preload="none"` tanpa autoplay. Sampel audio/video MDN telah diuji di browser lokal; rincian pada
  tambahan pengujian media di bawah.
- Unduhan melalui endpoint berotorisasi menghasilkan `text/plain` dengan
  `Content-Disposition: attachment` dan `Cache-Control: private, no-store`.
  Teks lengkap yang sudah dimuat juga bisa disalin ketika server berhenti.
  Media tidak ikut diunduh; teks mencantumkan transkrip dan URL lampiran.
- Formulir mempertahankan input ketika simpan gagal. Navigasi/penutupan dengan
  perubahan belum tersimpan memiliki guard. Tidak ada autosave draf offline,
  antrean mutasi, atau sinkronisasi otomatis; itu tetap Tahap 5/9.

## Pemeriksaan otomatis dan isolasi

- `npm run ci`: format, lint, seluruh suite tes, dan build produksi lulus.
- `npx tsc --noEmit --incremental false`: lulus.
- `npm run db:check`: lulus.
- `npm run test:modules`: menjalankan modul domain nyata melalui adapter D1
  SQLite. Meliputi draf/edit/terbit, input invalid, KD asing, URL berbahaya,
  angka boolean, bobot melebihi alokasi, modul terkunci, progres 0/50/100,
  waktu selesai idempoten, penanda terpisah, bantuan dan statistik tutor,
  prasyarat, siswa/tutor/admin, siswa tanpa penetapan, pemisahan dua siswa,
  serta pencabutan membership.
- Migrasi baru diuji pada database kosong dan fixture lama. Foreign key check
  lulus; update langsung pada isi bagian terbit ditolak trigger.
- `npm run test:modules:api`: tutor dan Dudin telah lulus; mencakup JSON rusak
  (422), resource tidak ditemukan (404), larangan siswa mengelola modul (403),
  larangan tutor menulis progres siswa (403), bagian asing (404), penolakan
  persen palsu (422), serta isi/header unduhan. Script tidak menulis catatan
  valid, mengganti role, memulai server, atau melakukan reseed.
- Administrator, guru asing, penetapan kurikulum, dan isolasi dua siswa diuji
  pada domain SQLite; bukan sesi identitas hosted.
- Format, lint, tes suite lama, schema check, build, dan diff diperiksa lagi
  setelah perbaikan penanda dan ekspor. Tidak menjalankan `test:e2e` yang
  mengganti fixture/identitas dan memulai proses sendiri.

## Browser dan persistensi

1. Adi membuka formulir kosong, memilih penugasan/KD, menulis dua bagian UJI,
   menyimpan draf melalui Enter, lalu menerbitkannya. Status memproses, sukses,
   dan seluruh kontrol terkunci setelah terbit teramati.
2. Formulir seluler: semua input/select/textarea memiliki label dan halaman
   tidak melebar melampaui viewport.
3. Dudin memilih modul UJI, membaca teks D1, dan menyelesaikan bagian pertama
   melalui Enter. Progres menjadi 50%; membaca bagian kedua tetap 50%.
4. Pengujian menemukan penanda ikut aktif pada tindakan selesai. Kondisi insert
   diperbaiki agar hanya tindakan bookmark menyalakan penanda; assertion
   regresi ditambahkan. Penanda uji pertama dihapus melalui UI. Penanda bagian
   kedua kemudian disimpan sengaja melalui tindakan penanda tersendiri.
5. Server dihentikan. Pengiriman pertanyaan gagal dengan alert koneksi,
   sementara teks pertanyaan tetap ada. Upaya pindah ke Beranda tidak
   membuang teks. Setelah teks uji dicatat dan sengaja dikosongkan, perpindahan
   ke bagian pertama saat offline tetap menampilkan isi; server tidak menerima
   posisi baru tersebut.
6. Setelah restart, API, dasbor, dan tombol Lanjutkan materi kembali ke bagian
   kedua dengan 50% dan penanda yang benar. Posisi gagal saat offline tidak
   menggantikan posisi otoritatif.
7. Unduhan melalui browser menghasilkan `/home/din/Downloads/modul-belajar.txt`.
   Pembacaan filesystem memverifikasi UTF-8, dua judul bagian, KD, dan teks
   materi (686 byte). Teks lengkap read-only pada reader juga memuat keduanya.
8. Ukuran teks diubah menjadi 20px dan mode baca diaktifkan. Pertanyaan UJI
   dikirim ulang melalui Enter; status sukses teramati dan textarea kosong.
   Progres tetap 50%.
9. Setelah konfigurasi Adi dipulihkan, tutor membuka modul terbit dan melihat
   satu pertanyaan Dudin pada bagian kedua. Statistik menampilkan bagian
   pertama: satu selesai; bagian kedua: satu sudah membuka/belum selesai dan
   satu pertanyaan. Formulir terbit tetap terkunci. Field bobot SKK opsional
   dan keterangan pemisahan ledger juga teramati.

Bukti gambar sementara: `/tmp/tahap3-tutor-mobile.png`,
`/tmp/tahap3-koneksi-putus.png`, `/tmp/tahap3-reader-mobile.png`, dan
`/tmp/tahap3-reader-desktop.png`. Catatan di atas merupakan bukti permanen;
berkas `/tmp` dapat hilang. Ukuran viewport sementara browser dipulihkan.

## Migrasi dan efek lokal

- Migrasi maju `0009`–`0013` menambah bagian, progres, peristiwa, pengaturan
  prasyarat/estimasi/bobot, media, serta trigger penguncian. Skema Drizzle dan
  snapshot/journal diperbarui. Tidak mengubah migrasi terdahulu atau reseed.
- Backup sebelum migrasi: `/tmp/ruangtumbuh-pre-tahap3.sqlite`; sebelum
  tambahan bobot: `/tmp/ruangtumbuh-pre-tahap3-skk.sqlite` (sementara).
- Fixture lokal: modul terbit `dda3803a-c55a-4231-ae18-f41b716c97a4`, judul
  `UJI Tahap 3 — modul sejarah bertahap`, dua bagian dengan KD Paket 5.1 yang
  sudah ditetapkan, estimasi 30 menit, bobot modul belum ditetapkan.
- Catatan Dudin: bagian pertama selesai, bagian kedua ditandai, posisi bagian
  kedua, progres 50%, dan satu pertanyaan UJI. Pengumpulan tugas, nilai,
  histori kurikulum, SKK terencana dasbor, serta materi/progres lama tidak diubah.
- File teks uji ditinggalkan di Downloads. `.dev.vars` dipulihkan byte-for-byte
  dari backup konfigurasi awal tutor Adi. Status server akhir dicatat di handoff.

## Belum diuji dan risiko tersisa

- Identitas produksi, D1 hosted, perangkat/jaringan nyata, belum diuji; tidak ada klaim Lulus produksi.
- Dukungan offline membatasi diri pada bacaan yang sudah dimuat dan ekspor
  teks. Refresh offline tidak menjamin aplikasi terbuka, dan pertanyaan belum
  tersimpan tidak bertahan setelah reload yang sengaja dikonfirmasi.
- Statistik selesai merekam tindakan siswa, bukan kualitas jawaban atau
  ketuntasan. Bobot rencana modul tidak boleh dijumlahkan sebagai kredit;
  rekonsiliasi dan penghargaan SKK tetap Tahap 7.
- Runtime dev mencatat eval React pada Worker, multiple-renderer saat HMR, dan
  startup lambat. Jeda tersebut bukan hasil benchmark produksi.

## Handoff akhir

- CI, TypeScript tanpa incremental, schema check, dan diff check akhir lulus.
  Setelah CI, ditambahkan assertion tes bahwa penerbitan ditolak ketika KD
  yang dipilih tidak mencakup KD bagian. Tes modul, eksekusi tes langsung,
  lint terfokus, serta format terfokus diulang dan lulus. Pada handoff awal tidak ada perubahan aplikasi setelah build/browser akhir.
  Perbaikan pemutar dan validasi ulang berikutnya dicatat pada tambahan di bawah.
- Batas tahap ditinjau: tidak mengimplementasikan mesin asesmen Tahap 4,
  portofolio/autosave Tahap 5, ledger SKK Tahap 7, atau sinkronisasi Tahap 9.
  Dependensi dan kontrak grading lama tidak diubah.
- Manifest 34 file aplikasi/migrasi/tes/scripts/package yang berubah memiliki
  SHA-256 `93ff29a509f7f38e3d769ce21d962e0e8c8148ef15acc154eefea06d7ad3dd0c`.
  Dibuat dari daftar `git ls-files --modified --others --exclude-standard`,
  mengabaikan `docs/`, lalu mengurutkan pasangan SHA-256 file dan path.
  Manifest sementara: `/tmp/tahap3-source-manifest.txt`.
- Worktree awal bersih. File modified dan untracked pada handoff berasal dari
  Tahap 3; tidak ada perubahan tidak terkait yang digabungkan.
- Identitas awal tutor Adi dipulihkan byte-for-byte. Server tunggal port 3000
  dihentikan setelah pengujian, sesuai keadaan awal; tidak ada server
  tambahan yang dimulai pada port lain.
- Tidak ada commit, push, operasi hosted, publikasi Sites, atau deployment.

## Tambahan pengujian media eksternal — 5 Oktober 2026

Status Tahap 3 tetap **Lulus lokal**, dengan bukti media eksternal berikut.
Lingkungan dan worktree sama; pengujian memakai identitas Dudin di server
port 3000, browser Chromium dalam aplikasi, desktop 1440×900 dan seluler
390×844. Ini bukan pengujian pada ponsel fisik atau produksi.

- Fixture terbit lokal `cac1dc82-5cbf-458e-bc5e-0c4a0aa21e3a`,
  `UJI Tahap 3 — media eksternal`, berisi tiga bagian teknis dengan label UJI.
  Sampel [audio MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/audio)
  dan [video MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video)
  dipakai untuk memeriksa player, bukan materi faktual kurikulum.
- Audio: `https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3`.
  Space pada player memainkan sampai akhir 2,074218 detik; readyState 4.
  Diulang pada seluler setelah perbaikan dan lulus.
- Video: `https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4`.
  Frame bunga terlihat, ukuran sumber 960×540, pemutaran sampai akhir
  5,055 detik dengan readyState 4. Space memutar/menjeda; ArrowRight
  mengubah waktu 0 menjadi 0,05055 detik saat dijeda. Desktop dan seluler lulus.
  Player seluler lebar 301px, sisi kanan 338px, lebar dokumen 375px pada
  viewport 390px; tidak ada overflow. `playsInline` aktif pada video.
- Sebelum pemutaran, player paused, waktu 0, readyState 0, tanpa autoplay,
  dengan controls dan preload none. Audio mempunyai deskripsi suara,
  video mempunyai deskripsi visual tanpa dialog. Teks tetap terlihat.
- URL audio sengaja tidak tersedia menghasilkan HTTP 404. Pengujian awal
  menemukan tidak ada penjelasan kegagalan. `ModuleMedia` pada reader
  diperbaiki: status pemuatan, alert kegagalan, dan tombol Coba lagi media.
  Setelah perbaikan, pemutaran URL tersebut memunculkan alert; Enter pada
  tombol menghapus error dan menyiapkan player baru. Memutar lagi kembali
  menghasilkan alert yang sesuai. Pindah ke audio valid menghapus error
  lama dan audio berhasil diputar. Tidak memakai event sintetis.
- Menonton/mendengarkan tidak menyelesaikan bagian: progres modul tetap 0%.
  Setelah server dihentikan, pemilihan bagian tetap menampilkan transkrip,
  sementara kegagalan simpan posisi ditampilkan sebagai error.
- Pengujian koneksi terputus hanya memutus server lokal. Tidak mematikan
  jaringan komputer, melakukan throttling terukur, atau membuktikan media
  eksternal tersedia saat seluruh jaringan offline. Media tidak disalin ke
  cache aplikasi dan tidak menjadi unduhan offline otomatis.
- CI lengkap (format/lint/semua tes/build), TypeScript tanpa incremental,
  schema check, dan smoke API siswa lulus setelah perbaikan. Log sementara:
  `/tmp/tahap3-media-ci.log`, `/tmp/media-tsc.log`,
  `/tmp/tahap3-media-api.log`, `/tmp/tahap3-media-schema.log`.
- Bukti gambar: `/tmp/tahap3-media-video-desktop.png`,
  `/tmp/tahap3-media-video-mobile.png`, `/tmp/tahap3-media-error-mobile.png`.
  Berkas sementara dapat hilang; hasil skenario dicatat permanen di sini.
- Tidak ada migrasi tambahan atau perubahan materi terbit lama. Fixture
  media dan catatan kunjungan Dudin tetap berada pada D1 lokal; tidak ada
  completion, nilai, atau SKK diberikan oleh pengujian ini. Konfigurasi tutor
  Adi dipulihkan byte-for-byte dan server dihentikan. Belum commit/push/deploy.
- Pengujian ini membuktikan dua berkas HTTPS langsung MP3/MP4 pada satu
  penyedia. Embed YouTube, streaming berautentikasi, DRM, caption bertiming,
  kualitas audio melalui speaker fisik, browser lain, hosted identity/D1,
  dan perangkat/jaringan nyata belum diuji; tidak ada klaim Lulus produksi.

## Pemeriksaan hosted awal — 5 Oktober 2026

- Pemeriksaan read-only lewat Sites menemukan Site aktif pada
  `https://ruangtumbuh-belajar-baik.dudinsdn.chatgpt.site` dengan akses custom.
  Tidak mengubah audience, akun, konfigurasi runtime, atau data hosted.
- Deployment versi 5 berstatus `succeeded`, terakhir diperbarui 20 September
  2026, commit `9c8651dc19cb2ea87c5ed1429b3916968c9414dd`. Ini versi lama,
  bukan worktree Tahap 3 yang diuji lokal pada 5 Oktober.
- `read_database_overview` berhasil membaca binding `DB` dan nama tabel D1
  hosted, tanpa membaca baris privat. Tabel `material_sections`,
  `material_section_progress`, `material_section_events`, dan
  `material_module_settings` tidak tersedia. Tahap 3 belum dapat diuji pada
  skema hosted ini. Tidak ada migrasi hosted yang dijalankan.
- Browser tanpa sesi menampilkan `Log in to access`; akses anonim tertutup.
  Link Continue with ChatGPT sempat menampilkan verifikasi keamanan
  auth.openai.com, kemudian pemilih akun muncul otomatis. Akun Dudin yang
  tersedia dipilih, login berhasil, dan UI hosted menampilkan profil Dudin
  serta dasbor versi lama. Tidak melewati verifikasi keamanan atau memakai
  identitas simulasi lokal. Navigasi langsung ke `/api/v1/me` diblokir browser
  dengan `ERR_BLOCKED_BY_CLIENT`, sehingga kontrak respons API identitas
  belum diperiksa. UI lama juga masih menampilkan tanggal 20 September 2026
  dan rangkaian belajar; itu bukan bukti perilaku worktree Tahap 3.
  Screenshot sementara `/tmp/tahap3-hosted-login.png`.
- Status tetap **Lulus lokal**; pengujian Tahap 3 hosted belum lulus.
  Kelanjutannya memerlukan deployment kode Tahap 3, migrasi maju hosted
  dengan backup/recovery, lalu sesi pengguna hosted yang sah. Perubahan
  produksi tersebut terpisah dari permintaan pengujian dan membutuhkan
  persetujuan eksplisit sesuai AGENTS.md. Tidak ada commit/push/deploy atau
  perubahan data hosted pada pemeriksaan ini. Server lokal tetap berhenti.
