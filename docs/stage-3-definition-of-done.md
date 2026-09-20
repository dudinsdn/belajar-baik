# Tahap 3 — Definition of Done

Status dokumen: audit lokal. Deployment dan database hosted belum termasuk bukti ini.

## Matriks penyelesaian

| Bagian | Implementasi | Validasi lokal | Status |
| --- | --- | --- | --- |
| Kontrak data dan otorisasi | Model, endpoint, error, role, dan batas akses terdokumentasi | Review kontrak dan test auth | Selesai |
| D1 dan seed development | 16 tabel, relasi, indeks, migrasi, dan seed | Migrasi/seed/inspect lokal | Selesai |
| Identitas | Fixture development dan pemetaan identitas Sites berdasarkan ID/email | Test ID, email-only, akun asing, mismatch, dan role | Selesai lokal |
| Profil/dashboard/materi/perpustakaan | API baca dan progres durable | API serta runner lintas sesi | Selesai lokal |
| Tugas siswa | Draf, submit idempoten, larangan edit setelah submit/dinilai | Runner siswa → guru | Selesai lokal |
| Kuis | Attempt, jawaban, penilaian server, hasil/pembahasan | Skor E2E server 100 | Selesai lokal |
| Penilaian guru | Antrean kelas, nilai 0–100, umpan balik, pembatasan role | Runner guru → siswa | Selesai lokal |
| Frontend siswa dan guru | UI role-aware dan alur data API | Browser lokal per role | Selesai lokal |
| Build produksi | Output Vinext/Worker kompatibel | Lint, TypeScript, test, build | Selesai lokal |
| Hosted D1 dan identitas nyata | Belum dipublikasikan pada versi terbaru | Belum diuji pada URL produksi | Belum |
| Audience siswa/guru | Akses Site belum diundang atau diubah | Belum diuji dengan dua akun ChatGPT nyata | Belum |

## Runner E2E

Jalankan:

```sh
npm run test:stage3:e2e
```

Runner melakukan hal berikut pada D1 development lokal:

1. Menyiapkan ulang fixture tugas dan kuis yang dibatasi pada siswa development.
2. Menjalankan aplikasi sebagai siswa dan menguji profil, dashboard, progres materi, progres perpustakaan, submit tugas, serta kuis.
3. Memastikan siswa ditolak dari endpoint guru.
4. Menjalankan aplikasi sebagai guru, membaca antrean, memberi nilai, dan memastikan guru ditolak dari endpoint siswa.
5. Menjalankan kembali aplikasi sebagai siswa dan memastikan nilai serta umpan balik guru terbaca.
6. Mengembalikan `.dev.vars` ke isi awal melalui blok `finally`, termasuk ketika pengujian gagal.

## Batas klaim

Tahap 3 selesai pada tingkat source dan runtime lokal setelah runner, lint, TypeScript, test terfokus, build, dan browser smoke test lulus. Tahap 3 belum selesai pada tingkat hosted/end-to-end produksi sampai versi terbaru dipublikasikan, D1 hosted dimigrasi/diisi secara terkontrol, audience ditetapkan, dan alur diuji menggunakan akun ChatGPT siswa serta guru yang benar-benar berbeda.
