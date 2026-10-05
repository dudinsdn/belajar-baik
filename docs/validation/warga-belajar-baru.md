# Perbandingan Warga Belajar Baru — Lokal

- Tanggal: 5 Oktober 2026.
- Akun baru: `usr_student_uji_baru`, **Warga Belajar Baru (UJI)**.
- Email lokal: `warga.baru@ruangtumbuh.local`.
- Kelas: Paket C Kelas 10, tahun ajaran 2026/2027.
- Sumber penambahan: `scripts/sql/add-validation-learner.sql`.
- Cakupan: satu akun lokal dan satu membership. Tidak ada kurikulum, progres,
  submission, nilai, atau percobaan kuis yang disalin dari akun lain.

## Bukti database

| Data                   | Dudin Sahidin | Warga Belajar Baru (UJI) |
| ---------------------- | ------------- | ------------------------ |
| Keanggotaan kelas      | 1             | 1                        |
| SKK terencana          | 10            | Belum ditetapkan (0)     |
| Catatan progres materi | 1             | 0                        |
| Submission tugas       | 1             | 0                        |
| Percobaan kuis         | 6             | 0                        |

Angka merupakan snapshot pemeriksaan lokal, bukan indikator ketuntasan atau
SKK yang telah dicapai. Akun lama tetap tersedia dan datanya tidak diubah oleh
penambahan ini. `PRAGMA foreign_key_check` mengembalikan nol kesalahan.

## Bukti API

Server dihentikan, `.dev.vars` diganti ke identitas baru, lalu satu server
dimulai kembali pada port `3000`. `/api/v1/me` mengembalikan ID dan nama akun
baru serta enrollment kelas yang benar.

Smoke baca membuktikan:

- kurikulum, penetapan paket, materi, dan tugas kosong;
- total SKK belum tersedia karena belum ada penetapan;
- tidak ada materi terakhir atau progres materi;
- tidak ada kuis yang dapat diakses;
- koleksi perpustakaan tetap merupakan koleksi bersama, tetapi progres dan
  bookmark akun baru bernilai nol;
- detail tugas dan kuis yang dapat diakses akun lama mengembalikan 404 untuk
  akun baru karena belum ada penetapan kompetensi yang sesuai.

`npm run test:curriculum:api` juga mengenali akun pembanding ini dan menguji
bahwa pemetaan/penetapan kosong serta operasi tulis tutor ditolak.

## Cara melihat

1. Buka `http://localhost:3000/` dan muat ulang halaman.
2. Pastikan header/profil menunjukkan **Warga Belajar Baru (UJI)**.
3. Buka **Kurikulum**: tampilkan keadaan belum ada kurikulum; tutor belum
   menetapkan paket kompetensi untuk akun ini.
4. Buka Beranda, Materi, Latihan, dan Tugas untuk membandingkan keadaan kosong
   dengan akun lama.

Ini menggunakan identitas simulasi lokal per server, bukan fitur login atau
pemilihan akun aplikasi. Untuk melihat akun lama kembali, hentikan server,
pulihkan variabel `RT_DEV_USER_*` untuk `usr_student_dudin`, mulai server pada
port 3000, dan verifikasi `/api/v1/me`.

## Kondisi akhir dan batas

Saat pemeriksaan awal, server aktif pada port 3000 sebagai akun uji baru.
Pengguna kemudian mengonfirmasi perbedaan kedua akun melalui Firefox dan
meminta pemulihan identitas WB Dudin. Kondisi akhir terbaru adalah port 3000
sebagai `usr_student_dudin`. Akun uji baru tetap disimpan. `.dev.vars` tidak dikomit.
SQL provisioning hanya untuk database lokal yang target akunnya belum ada;
jangan mengulangnya setelah akun tersebut dibuat. Tidak ada operasi hosted,
push, deployment, atau commit.

Bukti visual manual dari pengguna: perbedaan kedua akun terlihat melalui
Firefox. Ukuran viewport dan skenario interaksi lain tidak disebutkan.
Hasil API dan database tidak dijadikan pengganti pengujian render
desktop/seluler yang lebih lengkap.
