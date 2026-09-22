# RuangTumbuh — Gambaran Proyek

RuangTumbuh adalah aplikasi pembelajaran daring untuk siswa dan guru. Aplikasi
ini menyatukan materi, perpustakaan, tugas, kuis, progres belajar, dan penilaian
dalam satu ruang belajar.

## Pengguna

- **Siswa** membaca materi, melanjutkan progres, menyimpan bacaan, mengerjakan
  tugas, mengikuti kuis, serta melihat nilai dan umpan balik.
- **Guru** melihat pengumpulan tugas dari kelas yang diajar, lalu memberikan
  nilai dan umpan balik.

## Cara kerja

Akses pengguna dimulai dari identitas Sites. Aplikasi mencocokkan identitas
tersebut dengan akun di database, lalu menampilkan ruang kerja sesuai perannya.

Data pembelajaran disimpan di Cloudflare D1. Progres membaca, draf tugas,
pengumpulan, jawaban kuis, nilai, dan umpan balik tetap tersedia saat pengguna
kembali menggunakan aplikasi.

Setiap siswa hanya dapat mengakses pembelajaran dan hasil miliknya. Guru hanya
dapat mengelola pengumpulan dari kelas yang diajar. Pemeriksaan akses dilakukan
oleh server pada setiap alur.

## Bagian utama

- Dashboard untuk ringkasan kegiatan belajar.
- Materi dan perpustakaan dengan progres baca serta penanda.
- Tugas dengan alur draf, kirim, nilai, dan umpan balik.
- Kuis pilihan tunggal dengan penilaian dan pembahasan.
- Ruang penilaian guru untuk memeriksa pekerjaan siswa.
