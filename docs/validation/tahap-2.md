# Validasi Tahap 2 — Rencana Belajar Personal

- Status: **Lulus lokal** — ketiga kriteria penerimaan, kontrak database/API,
  persistensi, batas akses, serta render desktop/seluler mempunyai bukti lokal.
- Tanggal: 5 Oktober 2026.
- Keadaan kode: worktree di atas `3395ef6`; perubahan Tahap 2 belum dikomit.
- Lingkungan: Linux, Node.js 24.21.0, Vinext, D1 lokal; satu server dengan
  strict port `3000`. Tutor Adi, Dudin, dan warga belajar uji diuji bergantian
  melalui `.dev.vars` dan restart server, bukan header identitas hosted.
- Identitas awal dipulihkan ke `usr_student_dudin`.
- Tidak ada operasi hosted, push, publikasi, atau deployment.

## Kriteria penerimaan dan bukti

| Kriteria                                      | Artefak dan skenario                                                                                                                            | Hasil                                                                                                                                                                                                                               | Batas                                                                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Dasbor hanya memakai data server              | `server/data/student-read.ts`, `server/data/learning-plans.ts`, `/api/v1/dashboard`; tes domain SQLite dan smoke D1/API untuk dua warga belajar | Rencana/KD, posisi materi, tugas/tenggat, umpan balik, dan total SKK diturunkan dari D1. Dudin melihat dua rencana dan 10 SKK; akun uji satu rencana dan 4 SKK                                                                      | SKK terencana berasal dari alokasi kurikulum, bukan pengakuan pencapaian                                                              |
| Setiap kartu memiliki tindakan yang jelas     | `dashboard-view.tsx`, `active-view.tsx`, `page.tsx`; browser desktop dan seluler                                                                | Kegiatan membuka Rencana; materi membuka ID yang dipilih; tugas membuka tugas yang dipilih; kurikulum dan latihan membuka ruang terkait; konfirmasi umpan balik menulis acknowledgment di server                                    | Latihan yang ditawarkan adalah latihan pertama yang tersedia pada kontrak aplikasi saat ini; pengembangan asesmen penuh tetap Tahap 4 |
| Posisi terakhir dapat dilanjutkan lintas sesi | `material_progress`, `student-read.ts`, pemilihan `resourceId`; API dan browser                                                                 | Posisi berlabel UJI pada materi kedua disimpan 25%; Lanjutkan materi membuka materi kedua dan menampilkan posisi yang sama. Tombol simpan menulis ID materi tersebut. Rencana bertahan setelah refresh dan pergantian proses server | Pembacaan isi/posisi per bagian secara penuh mengikuti Tahap 3; hosted dan perangkat nyata belum diuji                                |

## Cakupan fitur

- Tutor menetapkan rencana mandiri, tutorial, atau tatap muka untuk individu
  atau semua anggota aktif kelas. Penetapan kelas adalah snapshot penerima
  saat disimpan; anggota baru memerlukan penetapan baru.
- Setiap penerima harus memiliki paket/KD yang ditetapkan. Materi harus terbit,
  berada pada penugasan tutor, dan tertaut pada KD yang dipilih. Penetapan kelas
  gagal tanpa menulis sebagian penerima apabila ada anggota yang tidak cocok.
- Daftar KD menampilkan kode versi, paket, dan KD untuk membedakan pemetaan
  yang tujuan sederhananya sama.
- Tutor mencatat arahan pendampingan dan menyesuaikan tenggat tugas per warga
  belajar dengan alasan serta histori. Tenggat efektif dipakai daftar tugas,
  dasbor, dan pemeriksaan server saat pengumpulan; tenggat asli tidak diubah.
- Tutor melihat waktu aktivitas materi terakhir dan rencana mandiri yang
  melewati tenggat. Batas tujuh hari diberi label khusus aktivitas materi,
  bukan klaim tidak aktif pada seluruh aplikasi atau putus belajar.
- Warga belajar membaca tujuan, waktu, instruksi/lokasi, materi, tugas, dan
  umpan balik. Permintaan bantuan disimpan sebagai peristiwa pada rencana;
  tutor dapat membacanya ketika membuka Rencana. Tidak ada email, pesan
  eksternal, atau notifikasi otomatis yang dikirim.
- Konfirmasi umpan balik terikat ke submission dan waktu penilaian. Penilaian
  baru membuat umpan balik muncul lagi; konfirmasi tidak mengubah skor,
  kompetensi, atau SKK.
- Rekomendasi berikutnya dipilih server: rencana mandiri yang belum selesai
  atau kegiatan yang waktunya belum lewat. Materi terbaru yang belum selesai
  dapat dilanjutkan; jika belum ada progres, server menawarkan materi awal.
- SKK sedang ditempuh, menunggu validasi, dan tercapai dinyatakan belum tersedia.
  Implementasi keputusan dan ledger SKK berada di Tahap 7. Dasbor Tahap 2
  tidak menebak pencapaian dari persentase baca, skor, atau durasi.

## Pemeriksaan otomatis dan batas akses

- `npm run ci`: format, lint, seluruh suite tes, dan build produksi lulus.
- `npx tsc --noEmit --incremental false`: lulus.
- `npm run db:check`: lulus.
- `npm run test:planning`: tes domain menjalankan modul server sebenarnya
  dengan adapter D1 berbasis SQLite. Meliputi input invalid, KD/materi asing,
  siswa/admin/tutor asing, penerima di luar kelas, penetapan kelas atomik,
  tenggat personal dan histori, pendampingan, kepemilikan permintaan bantuan,
  konfirmasi umpan balik dan versi penilaian baru, total SKK, posisi baca,
  materi selesai, serta pencabutan membership.
- Migrasi `0008` diuji pada database kosong dan database berisi fixture lama;
  foreign key check lulus. Migrasi operasional seed/provision `0001`/`0002`
  tidak dijalankan pada database kosong uji karena tidak mengubah model skema.
- `npm run test:planning:api`: lulus sebagai tutor, Dudin, dan akun warga belajar
  uji pada server yang sama. Tutor ditolak dari dasbor siswa (403), penugasan
  asing ditolak (404), tindakan invalid ditolak (422), siswa tidak boleh
  menetapkan rencana (403), serta bantuan/umpan balik asing ditolak (404).
  Smoke ini tidak membuat catatan baru, tidak mengubah role, dan tidak
  memulai server. Gunakan setelah server port 3000 siap.
- Ketika membership dicabut pada fixture tes, rencana, materi/progres,
  umpan balik, dan SKK kelas tersebut tidak masuk dasbor.
- Administrator ditolak oleh domain/API. Ruang admin tidak ditambahkan.
- `git diff --check`: lulus; review akhir worktree dicatat saat handoff.

## Browser desktop dan seluler

Browser aplikasi menguji desktop 1440×900 dan seluler 390×844:

1. Tutor membuka kondisi rencana kosong, kemudian menetapkan rencana individual
   `UJI Tahap 2 — lanjutkan sejarah` untuk Dudin. Tombol simpan dioperasikan
   menggunakan Enter; status Menyimpan dan keberhasilan teramati.
2. Refresh dan kembali ke menu Rencana membuktikan data tetap tersimpan.
3. Tutor mencoba rencana kelas pada paket 5.2. Karena akun uji hanya memiliki
   paket 5.1, server menolak dengan alert; judul dan instruksi tetap terisi.
   Setelah memilih KD paket 5.1, tutorial kelas menghasilkan dua rencana.
4. Tutor mencatat pendampingan akun uji dan menyesuaikan tenggat tugas berlabel
   UJI menjadi 15 Oktober 2026 pukul 12.00. Status sukses dan catatan terlihat.
5. Pada seluler, formulir tutor mempunyai label untuk seluruh kontrol dan
   halaman tidak melebar melebihi viewport. Warga belajar uji melihat tutorial
   miliknya, 4 SKK, progres awal 0%, tenggat personal, serta kondisi umpan balik
   kosong; rencana individual Dudin tidak terlihat.
6. Tombol Lihat kegiatan membuka rencana. Akun uji mengirim permintaan bantuan
   menggunakan Enter; status sukses dan teks permintaan tersimpan teramati.
7. Dudin melihat 10 SKK, tenggat asli tugas UJI (31 Desember), dan materi kedua
   dengan posisi UJI 25%. Lanjutkan materi membuka judul dan posisi yang benar;
   Simpan progres berhasil. Kerjakan tugas membuka hanya tugas yang dipilih.
8. Dudin mengonfirmasi umpan balik. Kartu hilang dan kondisi tidak ada umpan
   balik yang belum dibaca teramati; histori penilaian tidak diubah.
9. Server sengaja dihentikan untuk menguji pemuatan gagal. Dasbor menampilkan
   alert Indonesia tentang koneksi dan tombol Coba lagi; tidak menggantinya
   dengan data contoh. Setelah server kembali, koneksi HMR memuat ulang halaman dan dasbor pulih
   dengan dua rencana Dudin, posisi materi kedua 25%, 10 SKK, serta konfirmasi
   umpan balik yang tetap tersimpan. Tombol Coba lagi teramati pada kondisi
   gagal; pemulihan yang direkam ini melalui pemuatan ulang otomatis HMR.

Bukti sementara: `/tmp/tahap2-tutor-mobile.png`,
`/tmp/tahap2-wb-baru-mobile.png`, `/tmp/tahap2-permintaan-bantuan.png`,
`/tmp/tahap2-dudin-desktop.png`, `/tmp/tahap2-gangguan-koneksi.png`,
`/tmp/tahap2-dudin-final-desktop.png`, `/tmp/tahap2-dudin-final-mobile.png`.
Catatan skenario ini menjadi rekaman permanen karena file `/tmp` dapat hilang.

## Migrasi dan efek state lokal

- Backup sebelum migrasi: `/tmp/ruangtumbuh-pre-stage2.sqlite` (sementara).
- Migrasi maju `0008_breezy_marten_broadcloak.sql` menambah tujuh tabel rencana,
  peristiwa, pendampingan, tenggat personal, dan konfirmasi umpan balik.
  Tidak ada reseed, perubahan migrasi terdahulu, penghapusan submission, atau
  pengubahan nilai/history kurikulum.
- Data UJI yang ditambahkan: tiga rencana (dua untuk Dudin, satu untuk akun
  uji), tiga peristiwa create, satu permintaan bantuan akun uji, satu catatan
  pendampingan dan peristiwanya, serta satu tenggat personal dan peristiwanya.
- Materi lama berlabel `UJI BROWSER Tahap 1 materi` mendapat catatan progres
  Dudin 25% dengan posisi `UJI Tahap 2 — posisi resume materi kedua` untuk
  membuktikan pemilihan materi kedua. Progres materi Surabaya tidak direset.
- Umpan balik Dudin yang sudah ada dikonfirmasi dibaca pada D1 lokal; satu
  acknowledgment ditambahkan. Nilai/isi umpan balik lama tetap sama.
- Foreign key check database lokal setelah tindakan kosong (lulus).
- `.dev.vars` diabaikan Git dan dipulihkan sesuai isi awal.

## Batas dan risiko tersisa

- Identitas produksi, D1 hosted, perangkat nyata, dan jaringan nyata belum
  diuji; masuk Tahap 10. Tidak ada klaim Lulus produksi.
- Reader modular penuh, attempt asesmen penuh, ledger/pengakuan SKK, dashboard
  risiko lintas aktivitas, dan antrean offline mengikuti tahapnya masing-masing.
  Tahap 2 tidak menunggu implementasi tersebut untuk memverifikasi kontraknya.
- Uji koneksi pada tahap ini membuktikan error/muat ulang; tidak membuktikan
  sinkronisasi offline atau keamanan pengiriman ulang pada jaringan nyata.
- Runtime lokal lambat pada startup dan saat build/HMR berlangsung bersamaan;
  beberapa navigasi browser perlu diperiksa setelah timeout. Log dev menyebut
  keterbatasan eval React pada Worker dan multiple-renderer selama HMR. Build
  tetap lulus; ini bukan bukti performa produksi. Build akhir selesai sebelum
  pengujian pemulihan dan handoff.
- Konfirmasi umpan balik berarti sudah dibaca, bukan bukti revisi atau ketuntasan.
- Penetapan ulang rencana dapat menghasilkan entri baru; koreksi/pembatalan
  rencana terstruktur tidak termasuk kontrak Tahap 2 saat ini.

## Handoff akhir

- CI akhir lulus; setelah tambahan assertion tes tentang materi selesai dan
  kegiatan yang sudah lewat, tes planning terfokus juga diulang dan lulus.
  Tidak ada perubahan source aplikasi setelah build/browser akhir.
- TypeScript tanpa incremental, schema check, smoke API Dudin setelah restart,
  formatting, dan diff check lulus. Tombol tindakan baru pada seluler berukuran
  44–50 piksel; tidak ada overflow horizontal. Formulir tutor mempunyai label
  untuk semua kontrol. Pengujian Enter dan perpindahan fokus ke konten utama
  teramati; audit pembaca layar lengkap tetap Tahap 9.
- Worktree awal bersih. Semua perubahan tracked/untracked pada handoff berasal
  dari Tahap 2 ini; tidak ada file tidak terkait yang digabungkan.
- Server tunggal aktif di `http://localhost:3000` sebagai Dudin, dan isi
  `.dev.vars` sama dengan konfigurasi sebelum pengujian. Tidak ada server
  tambahan yang sengaja dimulai pada port lain.
- Tidak ada commit, push, publikasi, atau deployment.
