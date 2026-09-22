# Tahap 3 — Definition of Done

Status dokumen: audit lokal. Deployment dan database hosted belum termasuk bukti
ini.

## Matriks penyelesaian

- **Kontrak data dan otorisasi — Selesai**
  - Implementasi: model, endpoint, error, role, dan batas akses
    terdokumentasi.
  - Validasi lokal: review kontrak dan test auth.
- **D1 dan seed development — Selesai**
  - Implementasi: 16 tabel, relasi, indeks, migrasi, dan seed.
  - Validasi lokal: migrasi, seed, dan inspect lokal.
- **Identitas — Selesai lokal**
  - Implementasi: fixture development dan pemetaan identitas Sites berdasarkan
    ID atau email.
  - Validasi lokal: test ID, email-only, akun asing, mismatch, dan role.
- **Profil, dashboard, materi, dan perpustakaan — Selesai lokal**
  - Implementasi: API baca dan progres durable.
  - Validasi lokal: API serta runner lintas sesi.
- **Tugas siswa — Selesai lokal**
  - Implementasi: draf, submit idempoten, serta larangan edit setelah submit
    atau dinilai.
  - Validasi lokal: runner siswa ke guru.
- **Kuis — Selesai lokal**
  - Implementasi: attempt, jawaban, penilaian server, serta hasil dan
    pembahasan.
  - Validasi lokal: skor E2E server 100.
- **Penilaian guru — Selesai lokal**
  - Implementasi: antrean kelas, nilai 0–100, umpan balik, dan pembatasan role.
  - Validasi lokal: runner guru ke siswa.
- **Frontend siswa dan guru — Selesai lokal**
  - Implementasi: UI role-aware dan alur data API.
  - Validasi lokal: browser lokal per role.
- **Build produksi — Selesai lokal**
  - Implementasi: output Vinext/Worker kompatibel.
  - Validasi lokal: lint, TypeScript, test, dan build.
- **Hosted D1 dan identitas nyata — Belum**
  - Implementasi: belum dipublikasikan pada versi terbaru.
  - Validasi lokal: belum diuji pada URL produksi.
- **Audience siswa/guru — Belum**
  - Implementasi: akses Site belum diundang atau diubah.
  - Validasi lokal: belum diuji dengan dua akun ChatGPT nyata.

## Runner E2E

Jalankan:

```sh
npm run test:stage3:e2e
```

Runner melakukan hal berikut pada D1 development lokal:

1. Menyiapkan ulang fixture tugas dan kuis yang dibatasi pada siswa development.
2. Menjalankan aplikasi sebagai siswa dan menguji profil, dashboard, progres
   materi, progres perpustakaan, submit tugas, serta kuis.
3. Memastikan siswa ditolak dari endpoint guru.
4. Menjalankan aplikasi sebagai guru, membaca antrean, memberi nilai, dan
   memastikan guru ditolak dari endpoint siswa.
5. Menjalankan kembali aplikasi sebagai siswa dan memastikan nilai serta umpan
   balik guru terbaca.
6. Mengembalikan `.dev.vars` ke isi awal melalui blok `finally`, termasuk ketika
   pengujian gagal.

## Batas klaim

Tahap 3 selesai pada tingkat source dan runtime lokal setelah runner, lint,
TypeScript, test terfokus, build, dan browser smoke test lulus. Tahap 3 belum
selesai pada tingkat hosted/end-to-end produksi sampai versi terbaru
dipublikasikan, D1 hosted dimigrasi/diisi secara terkontrol, audience
ditetapkan, dan alur diuji menggunakan akun ChatGPT siswa serta guru yang
benar-benar berbeda.
