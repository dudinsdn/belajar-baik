# Validasi Tahap 5 — Tugas, Proyek, Keterampilan, dan Portofolio

Tanggal: 6 Oktober 2026. Status: **Lulus lokal**. Lingkungan: Linux lokal, Vinext/Workers, D1 lokal,
port 3000 strict; identitas simulasi tutor Adi dan murid Dudin diganti hanya
setelah server dihentikan. Basis commit `5441495`, worktree Tahap 5 belum
committed; hash sumber akhir tersedia pada `assets/tahap5-source-sha256.txt`.
Tidak ada perubahan hosted, push, atau deployment. Tahap 6 dan seterusnya
belum diimplementasikan. Tidak ada klaim regulasi baru atau total SKK baru.

## Pemetaan kriteria selesai

| Kriteria roadmap                                           | Lingkungan / skenario                                                                                                                            | Hasil dan artefak                                                                                                                                                                                                                           | Batas                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Seluruh perubahan status memiliki waktu dan pelaku         | Tes domain SQLite menjalankan kode domain yang sama; D1/API/browser create → publish → draft → submit → grade → revise → submit → grade          | Lulus. Event tugas di `curriculum_events`; versi, request, actor, timestamp dan snapshot pada `submission_history`. `work-management.ts`, `work-mutations.ts`, migrasi 0017; rekaman fixture `assets/tahap5-karya-history.json`             | Identitas produksi belum diuji                                                                                      |
| Nilai tidak dapat berubah tanpa histori                    | Tes menghitung skor berbobot 80 lalu 100, menolak perubahan tanpa alasan, konflik versi, dan jalur grading lama; browser nilai 75 → revisi → 100 | Lulus. Batch atomik dengan guard versi; trigger menyimpan OLD dan NEW serta melarang update/delete histori. Nilai 75 dan komentar tetap ada setelah revisi. `tests/work-domain.test.mjs`, `drizzle/0017_work_guards.sql`, `work-review.tsx` | Pengujian beban/konkurensi produksi belum dilakukan                                                                 |
| Bukti belajar tetap terhubung KD, paket kompetensi dan SKK | Domain menolak KD/kelas/paket tak tersedia; browser membaca KD 3.1, paket 5.1, versi kurikulum, alokasi 4, bobot kegiatan 1                      | Lulus. Join D1 melalui assignment/KD/paket/versi/alokasi, berkas terikat submission. `work-access.ts`, `work-management.ts`, `work-reader.tsx`; screenshot draf/penilaian                                                                   | Bobot kegiatan dan nilai bukan pemberian SKK. Pengakuan alih kredit/mastery/buku besar berada pada tahap berikutnya |

## Fitur dan skenario tambahan

| Fitur / risiko                                             | Pemeriksaan                                                                                                                                                            | Hasil / artefak                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Template tugas, proyek, keterampilan, pengalaman terdahulu | Preset editor, tes jenis/rubrik/KD/bobot/tenggat; browser membuat dan menerbitkan proyek UJI                                                                           | Lulus; `work-editor.tsx`, `work-validation.ts`, `work-management.ts`. Total bobot rubrik wajib 100%; rubrik terbit dibekukan                                                                                                                                                     |
| Draf otomatis dan koneksi putus                            | Browser menulis, autosave D1; server dihentikan, teks diedit, error terlihat; server dinyalakan, halaman baru menampilkan pemulihan eksplisit; pulihkan dan sinkronkan | Lulus. Teks OFFLINE muncul kembali dari D1 setelah refresh/restart. `use-work-draft.ts`, `work-draft-storage.ts`, `assets/tahap5-offline-mobile.png`                                                                                                                             |
| Bukti teks/foto/dokumen/audio/tautan                       | Domain validasi HTTPS, ukuran, signature/MIME, upload PNG dan unduh; browser PNG 68 byte diunggah lalu masih tersedia setelah restart/revisi                           | Lulus. `work-files.ts`, `work-evidence-form.tsx`; API file dengan otorisasi dan attachment/nosniff/private no-store. PDF/audio tersedia melalui whitelist/signature; belum diuji playback semua codec/perangkat                                                                  |
| Rubrik dan komentar spesifik                               | Browser membaca rubrik sebelum kerja; tutor menilai empat kriteria 25%, komentar per kriteria, umpan balik dan validasi bukti                                          | Lulus. Server menghitung 75 lalu 100; form menampilkan nilai sebelumnya saat dibuka kembali. `work-review.tsx`, `work-grade-fields.tsx`                                                                                                                                          |
| Revisi dan pengalaman terdahulu                            | Browser tutor meminta revisi, murid membaca instruksi, memperbaiki dan memilih calon alih kredit, submit ulang                                                         | Lulus. Jawaban dan berkas awal tersimpan; status calon belum diakui terlihat pada tutor. Histori 26 event sebelum pilihan portofolio                                                                                                                                             |
| Portofolio                                                 | Domain menolak karya belum dinilai, menyimpan pilihan dan menyaring milik/kelas/paket; browser pilihan akhir                                                           | Lulus. Browser portofolio kosong → simpan pilihan → daftar karya nilai 100 → refresh dan muat ulang tetap ada. Screenshot `assets/tahap5-portofolio-desktop.png` dan `tahap5-portofolio-mobile.png`; D1 portfolio=1, version=10. API setelah restart tetap mengembalikan pilihan |
| Akses / isolasi                                            | Tes murid lain, tutor lain, admin, kelas arsip, membership dicabut, versi ditarik, paket tidak ditugaskan; tugas multi-KD baru harus seluruhnya tersedia               | Lulus positif/negatif. Jalur legacy memakai aturan cohort sebelumnya; managed work memiliki gate seluruh KD. `competency-access.ts`, `work-access.ts`, tes domain                                                                                                                |
| Kosong, loading, error                                     | Domain portofolio kosong milik murid lain; UI loading dan disabled saat API; tenggat invalid menghasilkan 422 terlihat; offline error tidak menghapus editor           | Lulus sesuai bukti domain dan browser tersebut; belum ada audit screen reader penuh                                                                                                                                                                                              |
| Desktop / mobile / keyboard                                | Browser 1440×900 dan 390×844, native keyboard untuk create/publish, editor, upload, grading/revisi                                                                     | Lulus. Tidak ada overflow horizontal pada mobile (document 375 ≤ 390); tombol utama ≥44 px. Screenshot `assets/tahap5-draf-mobile.png`, `tahap5-penilaian-desktop.png`, `tahap5-penilaian-mobile.png`                                                                            |
| Data historis / migrasi                                    | Semua migrasi forward pada database kosong; migrasi 0016/0017 ke D1 lokal; bandingkan seluruh baris lama dengan backup                                                 | Lulus. 231 baris aplikasi pada 41 tabel tetap utuh; metadata internal `_cf_METADATA` berubah karena transaksi. FK check kosong. `assets/tahap5-d1-integrity.json`                                                                                                                |

## Pemeriksaan akhir

- `npm run ci`: lulus format, lint, seluruh tes auth/assignment/grading/progress/kurikulum/rencana/modul/asesmen/tugas, dan production build.
- `npx tsc --noEmit --incremental false`: lulus.
- `npm run db:check`: lulus.
- `npm run test:work:api`: lulus pada role student dan teacher; membaca server aktif, tidak reseed atau membuat server lain.
- `git diff --check`: lulus; worktree awal bersih, seluruh perubahan merupakan Tahap 5. Tidak ada dependency upgrade atau perubahan lockfile.
- Skrip E2E lama yang mereseed/ganti identitas/start server lain tidak dijalankan. Alur lintas peran Tahap 5 dilakukan dengan pergantian server terkontrol pada port 3000.

## Batas operasi

Berkas disimpan sebagai base64 di D1 untuk cakupan lokal kecil: maksimum 1 MB
per berkas, lima berkas, total 3 MB per submission, tanpa R2/integrasi eksternal.
Signature/MIME bukan antivirus atau validasi parser penuh. Berkas/histori bersifat
immutable. Portofolio memilih karya yang sudah dinilai; histori revisi tetap ada.
Tidak ada penghapusan berkas atau galeri publik.

Antrean lokal eksplisit melindungi teks, tautan dan flag calon alih kredit pada
halaman yang sudah termuat. Upload berkas memerlukan jaringan. Tidak ada service
worker/offline seluruh aplikasi; halaman baru perlu koneksi. Pemulihan dari versi
usang diblokir dan memerlukan penggabungan manual. LocalStorage dapat gagal/penuh
atau dibersihkan oleh browser, sehingga bukan sumber otoritatif.

Belum diuji: hosted D1/identity, perangkat fisik, semua format audio/PDF secara
visual, pembaca layar, jaringan lambat produksi, kapasitas dan load concurrency.
Build memberi warning klasifikasi route Vinext dan runtime dev memberi warning
React eval; tidak mengubah hasil checks. Startup dingin lokal dan kontrol browser
sempat timeout, lalu halaman berhasil termuat. Ini bukan bukti performa produksi.

## Efek lokal dan serah terima

Migrasi 0016/0017 telah diterapkan hanya ke D1 lokal. Fixture baru berlabel
`UJI Tahap 5 Proyek Lingkungan` dipertahankan untuk inspeksi; assignment
`b8355d27-7930-400b-9e1e-e57331619c41`, submission
`eef6fa0f-563a-42e5-93bf-916099cb9131`. Backup SQLite sebelum migrasi tersedia
pada `/tmp/ruangtumbuh-before-tahap5.sqlite` selama direktori sementara bertahan.
Data lama tidak direseed atau ditulis ulang.

Konfigurasi `.dev.vars` dikembalikan byte-for-byte ke identitas tutor semula,
server validasi dihentikan setelah pemeriksaan, dan port 3000 kosong. Tidak ada
commit, push, publish, atau deploy dalam pekerjaan ini.
