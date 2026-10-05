# Validasi Tahap 1 — Fondasi Kurikulum dan SKK

- Status: **Lulus lokal** — kriteria kurikulum/SKK, database/API, dan alur
  browser tutor/warga belajar telah memiliki bukti lokal.
- Tanggal: 5 Oktober 2026.
- Keadaan kode: worktree di atas commit dasar `700eafa`; perubahan belum
  dikomit. Rekaman ini berlaku untuk perubahan Tahap 1 dalam worktree tersebut.
- Lingkungan: lokal Linux, Node.js 24.21.0, Vinext, SQLite/D1 lokal.
- Port: `3000`, dikunci melalui `server.strictPort` pada `vite.config.ts`.
- Peran akhir: warga belajar `usr_student_dudin`; konfigurasi tutor hanya
  digunakan sementara dengan izin pengguna lalu dikembalikan.
- Pemeriksaan lanjutan: pengguna kemudian meminta akun pembanding baru.
  Akun `usr_student_uji_baru` telah diuji, dan pengguna mengonfirmasi perbedaan
  tampilannya melalui Firefox. Server kemudian dikembalikan ke
  `usr_student_dudin` sesuai permintaan; lihat
  [rekaman warga belajar baru](warga-belajar-baru.md).
- Hosted/produksi: belum diuji; tidak ada push atau deployment.

## Kriteria penerimaan dan bukti

| Kriteria                                                      | Hasil dan bukti                                                                                                                                                                                                                 | Batas                                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Rekonsiliasi SKK per paket, mata pelajaran, dan warga belajar | Lulus pada tes domain SQLite dan API D1 lokal. Paket 5.1 mempunyai dua KD dengan alokasi 4 SKK yang dihitung sekali; paket 5.2 mempunyai 6 SKK. Penetapan warga belajar menghasilkan total 10 SKK.                              | Alokasi merupakan data uji berlabel, bukan ketetapan PKBM.                                                  |
| Penerbitan modul/asesmen memerlukan kompetensi                | Lulus untuk materi, kuis, dan tugas: daftar KD kosong atau KD asing ditolak 422; penerbitan dengan KD yang sesuai lulus; pemetaan yang sudah terbit tidak dapat diganti (409). Trigger juga menolak penerbitan tanpa tautan KD. | Konten lama tanpa KD tetap disimpan, tetapi ditahan oleh gerbang baca/akses warga belajar sampai dipetakan. |
| Versi baru tidak merusak histori angkatan lama                | Lulus pada tes database, domain, dan API. Versi V2 dengan 20 SKK tidak mengubah penetapan 10 SKK yang lama. Versi aktif dan struktur di bawahnya dikunci oleh trigger; penetapan menyimpan ID versi/paket serta pelaku.         | Lifecycle pensiun kurikulum dan pemindahan cohort tidak ditambahkan pada tahap ini.                         |

Artefak implementasi utama: `server/data/curriculum.ts`,
`server/data/curriculum-input.ts`, `server/data/competency-access.ts`,
`app/api/v1/curriculum/route.ts`, `app/learning/views/curriculum-view.tsx`,
skema kurikulum pada `db/schema/`, dan migrasi `0004` sampai `0007`.

## Fitur yang tersedia

- Tutor membuat kelas Paket C dan tahun ajaran, menambahkan mata pelajaran
  kelas, menyusun versi dengan tingkatan/paket, KI/KD, tujuan sederhana, kelompok
  mata pelajaran, bobot SKK, dan proporsi tiga mode belajar.
- Beberapa KD dalam mata pelajaran/paket yang sama memakai alokasi tunggal;
  alokasi, proporsi mode, dan deskripsi KI harus konsisten.
- Tutor mengaktifkan versi, menetapkan paket pada anggota kelas aktif, dan
  menerbitkan pembelajaran dengan satu atau beberapa KD dari kelas/mata
  pelajaran yang sesuai. Pemetaan dapat disalin ke versi baru untuk revisi.
- Warga belajar membaca versi/paket yang ditetapkan kepadanya, kompetensi dengan
  bahasa sederhana, proporsi mode belajar, dan SKK terencana.
- Tindakan menyimpan peristiwa dengan pelaku, waktu, tindakan, serta rujukan
  sumber daya pada `curriculum_events`.
- SKK yang dicapai, mastery, dan buku besar SKK tetap mengikuti tahap lanjut.

## Pemeriksaan otomatis

- `npm run ci`: lulus (format, lint, seluruh suite tes, build produksi).
- `npx tsc --noEmit --incremental false`: lulus.
- `npm run db:check`: lulus.
- `npm run test:curriculum`: lulus.
- Eksekusi langsung tes database membuktikan lima skenario migrasi, histori,
  penerbitan, akses, dan input invalid.
- Tes domain menjalankan kode server sebenarnya dengan adapter D1 berbasis
  SQLite: tutor asing ditolak, warga belajar/admin tidak dapat mengelola,
  mata pelajaran di luar penugasan ditolak, paket draf tidak dapat ditetapkan,
  penetapan duplikat ditolak, dan pencabutan membership menutup akses.
- Tes migrasi memakai database kosong dan database berisi fixture lama.
  Progres, submission, dan pertanyaan kuis lama tetap ada; pemeriksaan foreign
  key lulus. Tidak ada reseed database pengguna.
- `git diff --check`: diperiksa pada handoff; semua perubahan aplikasi berada
  dalam cakupan Tahap 1 dan penguncian runtime port 3000.

## API dan persistensi pada D1 lokal

Identitas produksi dari header tidak dapat disimulasikan per permintaan pada
preview Sites: middleware membuang header identitas masuk. Karena itu pengujian
API menggunakan pergantian `.dev.vars` dan restart satu server pada port 3000.
Ini tidak merupakan pengujian identitas hosted.

1. Server dijalankan sebagai tutor; `/api/v1/me` mengembalikan teacher.
2. `npm run test:curriculum:api -- --write` lulus: baca, input invalid,
   batas kelas, aktivasi, penetapan, rekonsiliasi, versi baru, dan penerbitan.
3. Server dihentikan, identitas dikembalikan ke warga belajar, dan server
   dimulai kembali pada port 3000.
4. `/api/v1/me` mengembalikan student.
5. `npm run test:curriculum:api` lulus: kurikulum yang ditetapkan tersedia,
   jumlahnya tetap 10 SKK, V2 yang belum ditetapkan tersembunyi, dan tulis
   kurikulum ditolak 403.

Script smoke memakai server yang sudah aktif. Mode default hanya membaca pada
tutor; pada warga belajar juga mengirim operasi invalid yang harus ditolak.
Mode `--write` hanya untuk tutor dan membuat data uji lokal berlabel. Setiap
pengulangan menambah versi baru: jangan menjalankannya pada data operasional.

## Efek lokal dan migrasi

- Backup sebelum migrasi: `/tmp/ruangtumbuh-pre-stage1.sqlite`.
  Backup berada di direktori sementara, tidak dikomit, dan tidak mencakup
  perubahan pengguna setelah backup dibuat.
- D1 lokal menerima migrasi `0003` sampai `0007`; `0003` sebelumnya hanya
  tersedia pada source dan belum diterapkan di database lokal ini.
- Migrasi maju `0004` menambah metadata versi/penetapan dan proporsi mode;
  `0005` menambah trigger pengaman; `0006` menambah tabel audit;
  `0007` menambah unique index penetapan.
- Data uji yang dipertahankan: versi `UJI-TAHAP1-1791185215335`, versi V2,
  tiga KD, serta dua penetapan paket kepada akun warga belajar lokal.
  Nama dan acuan menyatakan **UJI VALIDASI**, bukan kurikulum resmi.
- Validasi browser tutor menambahkan kelas `UJI Browser Tahap 1` tahun ajaran
  `2027/2028`, mata pelajaran `Validasi Browser`, dan draf
  `UJI-BROWSER-20261005` dengan 3 SKK. Draf bertahan setelah refresh, kemudian
  diaktifkan. Salinan V2 tetap draf 7 SKK. Akun warga belajar baru kini mendapat
  paket 5.1 sebesar 4 SKK; Dudin tetap 10 SKK. Dua konten uji lokal dari
  `scripts/sql/browser-publication-fixtures.sql` kini terbit dengan dua KD.
- Materi, kuis, dan tugas lokal yang belum mempunyai KD dipetakan ke KD uji
  sesuai kelas dan mata pelajaran untuk pengujian. Submission/progres tidak
  dihapus atau direset oleh workflow ini.
- `.dev.vars` tetap diabaikan Git. Server akhir aktif sebagai warga belajar.

## Bukti browser dan gerbang yang masih harus dituntaskan

Selain konfirmasi manual pengguna melalui Firefox, agent kemudian berhasil
mengendalikan Browser aplikasi dan memeriksa DOM ter-render. Pada 1440×900,
WB Dudin melihat versi aktif, Paket C 2026/2027, paket 5.1/5.2, 4/6 SKK, total
10 SKK, tiga KD, dan tidak melihat V2 yang belum ditetapkan. Pada 390×844,
menu dapat dibuka, Kurikulum dapat dicapai, loading diumumkan melalui status,
lebar dokumen tidak melebihi viewport, serta target navigasi utama berukuran
42–63 piksel. Tidak ada warning/error konsol pada pemeriksaan tersebut.

Sebagai tutor Adi, browser berhasil membuat kelas/tahun ajaran, menambahkan
mata pelajaran, menambah lalu menghapus baris pemetaan, menyimpan draf 3 SKK
dengan proporsi 20/30/50, mengamati status penyimpanan, dan membuktikan draf
tetap ada setelah refresh. Ketika pengujian hendak dilanjutkan ke aktivasi,
tab browser sempat terputus. Pengujian lanjutan berhasil setelah server dan
koneksi browser pulih; render awal masih dapat lambat (hingga 55 detik).

Pengujian lanjutan 5 Oktober 2026 membuktikan:

- Aktivasi `UJI-BROWSER-20261005` lewat tombol browser menghasilkan status
  aktif dan pesan pemetaan terkunci.
- Penetapan paket 5.1 ke `Warga Belajar Baru (UJI)` menghasilkan 4 SKK;
  Dudin tetap 10 SKK. Pengulangan ditolak sebagai duplikat dan pilihan tetap ada.
- Dua draf berlabel `UJI BROWSER Tahap 1 materi` dan `UJI BROWSER Tahap 1
asesmen` diterbitkan melalui formulir dengan dua KD. Checkbox dioperasikan
  menggunakan Space dan tombol penerbitan menggunakan Enter. Pesan sukses
  muncul dan konten hilang dari daftar draf. D1 mengonfirmasi status published.
- Salin pemetaan menghasilkan draf `UJI-BROWSER-20261005-V2`, 7 SKK;
  versi sebelumnya tetap aktif 3 SKK. Kode duplikat ditolak 409 dengan alert,
  kode dan alokasi 7 tetap terisi, lalu tombol Muat ulang data bekerja.
- Audit keyboard melewati 42 langkah Tab di seluruh formulir tutor, termasuk
  input, select, tanggal, textarea, tambah pemetaan, simpan, penetapan,
  checkbox dan penerbitan. Shift+Tab kembali ke input sebelumnya; outline
  fokus terukur auto 1px; tidak ada input tanpa label; status memakai live polite.
  Menu Kurikulum menggunakan Enter memindahkan fokus ke konten utama.
- Pemeriksaan D1 setelah tindakan mengonfirmasi audit activate/assign/publish/
  create dengan pelaku Adi dan waktu, serta foreign_key_check kosong.

Kondisi kosong akun baru sudah dibuktikan pada pengujian sebelumnya sebelum
penetapan (lihat warga-belajar-baru.md); setelah penetapan akun itu sengaja
tidak lagi kosong. Daftar penerbitan kosong juga terlihat setelah dua draf
diterbitkan. Bukti ini mencakup akses keyboard Tahap 1; audit pembaca layar
dan jaringan offline menyeluruh tetap berada pada Tahap 9.

Checklist berikut perlu bukti screenshot/catatan hasil pada browser terhubung
atau pemeriksaan manual yang disebutkan secara eksplisit:

- [x] Pengguna memeriksa langsung melalui Firefox dan mengonfirmasi perbedaan
      tampilan akun Dudin dengan warga belajar baru (5 Oktober 2026).
- [x] Desktop 1440×900: buka menu Kurikulum sebagai warga belajar; pastikan
      versi uji, Paket C, tahun ajaran, paket 5.1/5.2, alokasi 4/6 SKK, dan tujuan
      kompetensi terlihat; V2 tidak terlihat.
- [x] Seluler 390×844: menu dapat dibuka, Kurikulum dapat dicapai, teks dan
      tabel dapat dibaca tanpa overflow halaman, serta target sentuh dapat dipakai.
- [x] Tutor: buat kelas/tahun ajaran dan mata pelajaran melalui formulir;
      susun draf, tambah/hapus pemetaan, simpan, lalu refresh dan periksa data.
- [x] Tutor: aktifkan versi, tetapkan paket, pilih beberapa KD untuk
      pembelajaran, dan terbitkan melalui formulir.
- [x] Tutor: salin pemetaan ke versi baru dan ubah alokasinya; penetapan
      warga belajar pada versi lama tetap sama.
- [x] Kondisi loading dan refresh lulus; kondisi kosong, error/muat ulang,
      penyimpanan gagal yang
      mempertahankan isian, serta keyboard/fokus dan status live diverifikasi.

Bukti screenshot lokal: `/tmp/tahap1-aktivasi.png`,
`/tmp/tahap1-penetapan.png`, `/tmp/tahap1-publikasi-materi.png`,
`/tmp/tahap1-publikasi-asesmen.png`, `/tmp/tahap1-duplikat.png`,
`/tmp/tahap1-tutor-final.png`. Berkas sementara dapat hilang; catatan skenario
di dokumen ini merupakan rekaman versi permanen.

- [x] Smoke API diulang setelah perubahan akhir; total SKK warga belajar tetap
      10, operasi tulis ditolak 403, dan identitas akhir adalah student.

## Batas pengujian

Pemeriksaan akhir mengulang `npm run ci`, typecheck tanpa incremental,
`npm run db:check`, tes kurikulum dan smoke API Dudin: semuanya lulus.
Saat build berjalan bersama server development, pembacaan kurikulum sempat
mencapai 120 detik, lalu berhasil. Ini merupakan risiko performa lokal yang
tercatat; server direstart setelah build selesai dan identitas Dudin kembali
terverifikasi 200. Tidak ada klaim performa produksi dari pengujian ini.

Validasi identitas produksi, D1 hosted, pengalokasian resmi PKBM, dan pengujian
perangkat/jaringan produksi mengikuti gerbang Tahap 10. Tidak ada klaim SKK
regulatif atau pemetaan KI/KD resmi berdasarkan data uji ini. Pengujian offline
menyeluruh mengikuti Tahap 9; isian formulir saat gagal disimpan dipertahankan
selama halaman tetap terbuka.
