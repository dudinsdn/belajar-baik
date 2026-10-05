# Validasi Tahap 4 — Asesmen Diagnostik dan Formatif

- Status: **Lulus lokal** — seluruh kriteria selesai mempunyai bukti lokal.
- Tanggal: 5–6 Oktober 2026.
- Kode: worktree di atas `eecfb7b`; belum commit. Manifest sumber akhir dicatat
  dalam `assets/tahap4-source-sha256.txt` untuk mengidentifikasi sumber yang diuji.
- Lingkungan: Linux, Node.js 24, Vinext, D1 lokal, satu server strict port `3000`.
  Identitas tutor Adi dan siswa Dudin bergantian pada proses yang sama.
- Tidak ada D1 hosted, identitas produksi, publikasi, deployment, commit, atau push.

## Kriteria dan bukti

| Kriteria | Artefak dan skenario | Bukti lokal | Batas |
| --- | --- | --- | --- |
| Kuis berasal dari database | `quiz-management.ts`, `quizzes.ts`, editor tutor dan katalog siswa | Tutor menyimpan/menerbitkan asesmen UJI empat jenis lewat keyboard; soal dan kunci disimpan di D1. Soal bank disalin ke asesmen formatif baru | Soal lama tetap dibaca dari D1; pemetaan KD per soal lama dapat kosong dan ditandai sebagai pemetaan lama |
| Percobaan aktif dapat dilanjutkan | `startQuizAttempt`, hook siswa | ID `7ce148d1-dcb2-49d9-bb06-56cd3b566fb5` sama sebelum/sesudah restart; tiga jawaban pulih; browser membuka uraian yang belum dijawab | Pilihan asesmen setelah reload dilakukan kembali melalui katalog; tidak menyimpan pilihan sebagai catatan otoritatif browser |
| Jawaban sebelumnya dimuat kembali | `quiz_responses`, kompatibilitas `quiz_answers`, `attemptAnswers` | Pilihan tunggal/jamak dan isian pulih dari D1; tes domain juga memuat jawaban tabel lama dan memisahkan dua siswa yang sah | Teks belum tersimpan hanya bertahan pada tampilan yang masih terbuka, bukan setelah reload yang dikonfirmasi |
| Nilai dihitung server | `evaluate`, `submitQuizAttempt`, `gradeEssay` | Tunggal/jamak/isian otomatis; uraian menahan skor akhir sampai tutor menilai. Fixture diagnostik menghasilkan 75 sesudah penilaian tutor lewat UI | Uraian memakai kredit biner 0/1 dengan pedoman/feedback, bukan rubrik bertingkat Tahap 5. Nilai bukan keputusan ketuntasan KD/SKK |
| Kunci tidak bocor sebelum kirim | Payload soal/attempt, endpoint result dan ownership | Tes domain dan smoke API membuktikan soal/attempt tidak memuat `is_correct`, kunci isian, atau pembahasan; result aktif 409; percobaan asing 404 | Soal memang ditampilkan kepada siswa yang berakses untuk dikerjakan. Kunci/pembahasan baru dibuka sesudah pengiriman; percobaan berikutnya dapat memanfaatkan pembahasan sebagai latihan |

## Cakupan implementasi

- Diagnostik dan formatif, 1–50 soal, KD dari kurikulum aktif per soal, kesulitan
  mudah/sedang/sulit, ambang nilai 0–100, serta batas 1–20 percobaan.
- Pilihan tunggal memakai radio; pilihan jamak checkbox. Jamak memerlukan set
  pilihan tepat seluruhnya tanpa kredit parsial. Isian mencocokkan satu kunci
  setelah trim, normalisasi Unicode NFKC, dan pengabaian huruf besar/kecil.
- Uraian disimpan sebagai teks maksimal 4.000 karakter, kemudian tutor kelas
  memberi kredit 0/1 dan feedback wajib. Penilaian yang sudah tersimpan terkunci;
  tidak ada pengubahan skor diam-diam atau fitur override Tahap 7.
- Kisi-kisi per soal dan bank dari asesmen yang dapat dikelola tutor. Filter KD
  dan kesulitan serta salin soal membuat salinan baru; kunci dan histori sumber
  terbit tidak ditimpa. Draf tersimpan diperlakukan sebagai snapshot; revisi
  melalui asesmen baru, bukan edit terhadap percobaan yang sudah berlangsung.
- Siswa memilih asesmen dan memulai percobaan baru secara eksplisit. Membaca
  hasil lampau tidak menghabiskan jatah; percobaan aktif dipulihkan otomatis.
  Siswa menyimpan jawaban secara eksplisit, berpindah soal,
  mengirim setelah seluruh soal tersimpan, melihat pembahasan dan riwayat.
  Status sukses hanya muncul setelah respons server.
- Rekomendasi membuka modul atau bagian yang ditetapkan tutor. Pembukaan bagian
  tidak menyelesaikan bagian atau menambah SKK. Bagian rekomendasi diverifikasi
  berasal dari modul/KD yang dipilih.
- Tutor melihat hasil per soal, pending uraian, hasil tiap percobaan, dan saran
  pelajari ulang/remedial atau pengayaan dari skor. Saran bukan penetapan remedial
  terstruktur Tahap 6 atau keputusan ketuntasan Tahap 7.
- Indikator per KD membandingkan percobaan diagnostik/formatif terakhir pada KD
  dan penugasan yang sama. Angka berasal dari jawaban, belum menjadi mastery.
  Kisi-kisi/jumlah soal bisa berbeda, sehingga selisih bukan ukuran psikometrik
  yang menyatakan instrumen setara. Waktu mulai/selesai tercatat pada percobaan;
  waktu berlalu tidak dipakai sebagai bukti kompetensi atau keputusan otomatis.
- Setiap akses siswa memerlukan keanggotaan dan kelas aktif, semua KD asesmen
  pada penetapan siswa, serta kepemilikan percobaan. Tutor dibatasi penugasan
  mata pelajarannya; uraian siswa yang membership-nya dicabut tidak dapat dinilai.
- Peristiwa create, publish, start, answer, submit, grade mencatat waktu/pelaku.
  Pengiriman berulang tidak mengubah skor atau menambah peristiwa submit.
  Trigger menjaga isi/kunci terbit dan menolak percobaan aktif ganda serta
  percobaan baru setelah batas. Riwayat lama tidak dihapus untuk mencapai batas.

## Pemeriksaan otomatis

- CI (format, lint, suite tes, build): lulus ulang 6 Oktober setelah perubahan
  mulai percobaan eksplisit; exit 0. TypeScript, skema, dan diff check juga lulus.
- TypeScript tanpa incremental dan `npm run db:check`: lulus.
- `npm run test:quizzes`: domain asli dijalankan dengan adapter D1/SQLite;
  2 skenario besar lulus, dengan assertion lifecycle empat jenis, normalisasi,
  kunci tersembunyi, jawaban invalid/asing, kelengkapan jawaban, resume, uraian,
  skor 100/0, batas percobaan, pengiriman idempoten, kunci/soal terbit terkunci,
  histori lama, admin/siswa/tutor asing, dua siswa sah, pencabutan penetapan,
  pencabutan membership, kelas diarsipkan, indikator KD, audit, foreign key,
  dan seluruh migrasi maju pada database kosong.
- Tes baru dieksekusi langsung agar nama skenario dan jumlah assertion suite
  terlihat; bukan hanya ringkasan nama berkas dari test runner.
- `npm run test:quizzes:api`: tutor dan siswa lulus; GET katalog, soal/riwayat,
  larangan lintas peran, JSON rusak/null (422), resource asing (404), payload
  tanpa kunci. Script tidak mengganti identitas, memulai server, reseed, atau
  menulis jawaban/fixture valid.
- Tidak menjalankan `test:e2e` yang mengganti fixture/identitas dan menjalankan
  proses tambahan. Pengujian lintas peran baru memakai pergantian proses
  terkontrol serta browser dan API pada port yang sama.

## Browser dan persistensi

1. Tutor menyusun empat jenis soal, memilih KD, modul serta bagian ulang,
   menyimpan draf dan menerbitkan lewat Enter. Loading/disabled dan sukses
   teramati. Soal tersimpan kemudian dipakai ulang lewat bank untuk formatif.
2. Render tutor desktop 1440×900 dan seluler 390×844 diverifikasi. Seluler:
   lebar dokumen 375px pada viewport 390px, tidak ada overflow, tidak ada tombol
   utama di bawah tinggi 44px. Label KD menyertakan versi agar tidak ambigu.
3. Dudin menyimpan jawaban salah pada tunggal, set tepat pada jamak, dan isian
   huruf besar. Kunci dan pembahasan tidak tampil ketika masih aktif.
4. Server dihentikan sebelum isian disimpan. Alert koneksi muncul; teks
   `PERSATUAN` tetap di textarea dan status menunjukkan belum tersimpan.
   Percobaan navigasi memunculkan confirm. Browser sempat tertahan pada dialog;
   setelah kembali merespons, halaman/jawaban tetap sama. Tidak mengklaim
   otomatisasi dialog browser berjalan mulus.
5. Setelah server hidup kembali, simpan ulang sukses. Restart/reload berikutnya
   mempertahankan ID dan tiga jawaban; UI memilih soal uraian yang belum dijawab.
6. Uraian disimpan/dikirim. Pembahasan tampil, tetapi skor akhir masih menunggu
   tutor. Rekomendasi membuka `UJI Mengamati lingkungan`, sementara posisi
   otoritatif terakhir modul tetap bagian kedua dan progres tetap 50%.
7. Tutor menilai uraian sebagai tepat dengan feedback wajib. UI menampilkan
   skor 75, indikator diagnostik KD 75, serta statistik 0/1, 1/1, 1/1, 1/1.
8. Fixture siswa tanpa penetapan menampilkan “Belum ada latihan” tanpa data contoh.
9. Pada pemeriksaan akhir 6 Oktober, memilih formatif tidak membuat percobaan.
   “Mulai asesmen” membuat percobaan `e42be8ca-0b6d-49fc-8233-eadaf8ae2ec7`;
   jawaban salah tersimpan dan pengiriman menghasilkan skor 0 langsung.
   “Ulangi latihan” mendapat 409 dan alert batas percobaan; hasil tetap tampil.
   Membuka pembahasan riwayat mendapat 200; jumlah percobaan formatif tetap satu.
10. Memilih diagnostik dan membuka hasil 75 berhasil tanpa POST percobaan;
    jumlah diagnostik tetap tiga. Dua hasil tambahan pending uraian sudah ada
    sebelum pemeriksaan akhir dan tidak diubah.
11. Desktop 1440×900 dan seluler 390×844 diverifikasi ulang. Geometri akhir
    seluler: dokumen/viewport 390px, sidebar tertutup berakhir di x=-12,1px;
    tidak ada overflow. Screenshot diagnostik seluler diambil sesudah transisi.

## Migrasi dan efek lokal

- Migrasi maju `0014_damp_veda.sql` dan `0015_quiz_guards.sql` menambah konfigurasi
  asesmen, metadata soal, respons umum, event audit, dan trigger. Skema/journal
  serta snapshot diperbarui. Tidak mengubah migrasi terdahulu.
- Backup sementara sebelum migrasi tidak lagi tersedia pada pemeriksaan akhir.
  Rekonsiliasi byte/row terhadap backup tidak dapat dilakukan; tidak mengklaim
  pembuktian bahwa seluruh data lama identik. Tes kompatibilitas histori lama
  dan foreign-key check lokal lulus, serta hasil diagnostik awal tetap 75.
- D1 lokal: asesmen diagnostik UJI `4c4f5fcc-44d6-4107-8371-b69784cdf085`,
  percobaan Dudin `7ce148d1-dcb2-49d9-bb06-56cd3b566fb5`, empat jawaban dan skor75.
  Formatif dari salinan bank `58721a8a-f875-46cd-820e-4397bcbbf7ab`, satu soal,
  maksimal satu percobaan; hasil akhir 0 pada ID yang dicatat di atas.
  Semua fixture baru diberi label UJI.
- Siswa `usr_uji_tahap4_empty` / `UJI Tahap 4 Kosong` dibuat sebagai fixture
  lokal dengan membership kelas, tanpa penetapan kurikulum, untuk render kosong.
  Tidak memberi kurikulum, kompetensi, nilai, atau SKK kepada fixture ini.
- Kuis lama mempunyai percobaan aktif yang dilanjutkan saat menu Latihan dibuka;
  pada pemeriksaan awal; pada pemeriksaan akhir hanya riwayat lama dibaca.
  Tidak ada penulisan jawaban/skor kuis lama dalam skenario akhir.
- Backup konfigurasi sementara tidak lagi tersedia. Lima field identitas
  development dipulihkan ke tutor Adi berdasarkan konfigurasi awal yang
  tercatat; field lain dipertahankan. Pemulihan byte-for-byte tidak diklaim.

## Batas bukti dan risiko

- Ini bukti lokal, belum identitas/D1 hosted, perangkat fisik, pembaca layar,
  jaringan lambat terukur, load/concurrency produksi, backup-restore produksi,
  atau deployment. Gerbang operasional mengikuti Tahap 10.
- Offline menyimpan teks hanya di memori tampilan. Tidak ada autosave/antrean
  offline, sinkronisasi, atau jaminan reload offline. Itu tetap Tahap 5/9.
- Skor, selesai kuis, indikator KD, ketuntasan, dan SKK tetap konsep terpisah.
  Tidak mengimplementasikan portfolio, ledger, override, atau ruang admin.
- Runtime development memunculkan peringatan React eval/multiple renderer dan
  startup lambat. Tidak dijadikan benchmark produksi. Browser sempat perlu
  tab baru akibat sinkronisasi debugger; pemeriksaan dilanjutkan pada server
  yang sama tanpa proses tambahan.
- Bukti gambar permanen: `assets/tahap4-formatif-desktop.png`,
  `assets/tahap4-diagnostik-mobile.png`. Geometri akhir yang stabil dan gambar
  diagnostik seluler menjadi bukti batas layar. Gambar tutor/offline
  sementara dari pemeriksaan awal sudah tidak tersedia; catatan skenario di atas
  menyimpan hasil observasinya.

## Handoff akhir

- Identitas `usr_teacher_adi` / role `teacher` dikonfirmasi melalui
  `/api/v1/me` setelah restart; smoke API tutor lulus ulang.
- Server lokal dihentikan setelah verifikasi; port 3000 tidak dibiarkan berjalan.
- Worktree berisi perubahan Tahap 4 dan artefak bukti baru; tidak ada berkas
  unrelated pada inspeksi awal/akhir. `.dev.vars` dan D1 tetap ignored.
- Tidak melakukan commit, push, publikasi, hosted write, atau deployment.
- Tahap 5 dan seterusnya tidak diimplementasikan.
