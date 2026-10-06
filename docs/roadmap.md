# Roadmap Pengembangan RuangTumbuh

## 1. Visi Produk

RuangTumbuh menjadi ruang belajar Paket C yang:

1. Membantu warga belajar memahami apa yang harus dipelajari, mengapa materi tersebut penting, dan sejauh mana kemajuannya.
2. Mengakomodasi pembelajaran tatap muka, tutorial, dan mandiri.
3. Menghubungkan aktivitas belajar dengan kompetensi Kurikulum 2013 dan bobot SKK.
4. Membantu tutor melakukan pendampingan berdasarkan bukti proses dan hasil belajar.
5. Tetap mudah digunakan melalui telepon seluler, koneksi terbatas, dan tingkat literasi digital yang beragam.

## 2. Prinsip Pengembangan

### Prioritas warga belajar

- Satu halaman selalu memiliki satu tujuan utama.
- Bahasa sederhana dan instruksi konkret.
- Materi dapat dipelajari bertahap dan dilanjutkan kembali.
- Warga belajar mengetahui kompetensi, target, progres, dan tindak lanjut.
- Kegagalan asesmen menghasilkan rekomendasi belajar, bukan hanya nilai rendah.
- Sistem tidak boleh menampilkan data contoh sebagai data nyata.

### Kemudahan tutor

- Tutor tidak memasukkan data yang sama berulang kali.
- Materi, kegiatan, asesmen, dan nilai ditautkan langsung ke kompetensi.
- Dashboard menonjolkan warga belajar yang memerlukan bantuan.
- Laporan proses dan hasil dihasilkan dari aktivitas pembelajaran yang sudah berlangsung.
- Keputusan ketuntasan tetap berada pada tutor, dengan jejak audit yang jelas.

### Prinsip Kurikulum 2013 dan SKK

Setiap pembelajaran harus dapat ditelusuri melalui hubungan:

**Mata pelajaran → Tingkatan/Paket Kompetensi → KI/KD → Modul → Kegiatan → Asesmen → Bukti belajar → Ketuntasan → SKK**

SKK tidak cukup dihitung dari membuka halaman atau lama login. Pengakuan SKK harus didasarkan pada aktivitas yang relevan, bukti belajar, dan validasi tutor.

---

# Tahapan Pengembangan

## Kontrak Kelulusan untuk Semua Tahap

Setiap tahap memakai status berikut:

- **Belum dimulai**: belum ada klaim implementasi.
- **Sedang dikerjakan**: implementasi atau validasinya belum lengkap.
- **Lulus lokal**: seluruh kriteria penerimaan tahap tersebut telah memiliki
  bukti lokal terkini dan semua pemeriksaan yang relevan telah lulus.
- **Lulus produksi**: bukti lokal telah dilengkapi dengan validasi identitas,
  basis data, integrasi, operasi, perangkat, dan jaringan pada lingkungan
  hosted atau produksi yang relevan.

`Lulus lokal` tidak boleh dipakai sebagai sinonim `Lulus produksi`. Tahap awal
tidak harus menunggu pekerjaan tahap berikutnya untuk lulus secara lokal, tetapi
validasi lintas-tahap dan produksi tetap dikonsolidasikan pada Tahap 10. Jika
validasi tahap berikutnya menemukan regresi, status tahap terdampak harus dibuka
kembali.

Sebelum suatu tahap dinyatakan lulus, buat rekaman bukti di
`docs/validation/tahap-<nomor>.md`. Rekaman tersebut harus mencantumkan:

1. status, tanggal, commit atau keadaan worktree, lingkungan, port, dan peran
   simulasi yang diuji;
2. setiap kriteria penerimaan beserta artefak implementasi dan bukti yang dapat
   diulang;
3. hasil pemeriksaan statis, format, lint, tipe, tes terfokus, skema/migrasi,
   build, API/runtime, browser, dan diff sesuai relevansinya;
4. skenario positif, negatif, kosong, loading, error, refresh/restart, dan
   persistensi yang relevan;
5. batas peran, kepemilikan, kelas, serta pemisahan data yang relevan;
6. tangkapan atau catatan browser pada lebar desktop dan seluler untuk perubahan
   yang terlihat oleh pengguna;
7. efek terhadap data atau state lokal, hasil rekonsiliasi bila ada, hal yang
   tidak diuji, batas bukti, dan risiko tersisa; dan
8. status server lokal, termasuk bahwa server yang terlihat tetap memakai port
   `3000` dan tidak ada server duplikat tersembunyi.

Suatu kategori boleh ditulis **Tidak berlaku** hanya jika alasannya dicatat.
Keberadaan kode, migrasi, halaman, atau tes saja belum membuktikan suatu
kriteria; hasilnya harus diamati pada lapisan yang diklaim.

Matriks berikut adalah bukti minimum khusus tahap. Pemeriksaan umum di atas
tetap berlaku.

| Tahap | Bukti minimum khusus tahap                                                                                                                                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Audit data palsu/fallback dan tombol semu; smoke test rute/API inti; render alur warga belajar dan tutor; audit keamanan serta dependensi; baseline performa dan aksesibilitas.             |
| 1     | Migrasi dari basis data kosong dan data lama; validasi constraint serta rekonsiliasi SKK; histori versi kurikulum; API dan render tutor/warga belajar; uji larangan perubahan versi terbit. |
| 2     | Dasbor dari sumber server; posisi terakhir tetap benar setelah refresh/restart; batas penugasan tutor dan kepemilikan warga belajar; render kartu aksi utama pada desktop dan seluler.      |
| 3     | Materi berasal dari D1 tanpa fallback statis; progres per bagian dan resume setelah refresh/restart; alur penerbitan tutor; render kondisi kosong/error dan uji jaringan terbatas.          |
| 4     | Kunci jawaban tidak bocor sebelum selesai; attempt aktif dapat dilanjutkan; skor dihitung server; validasi input dan batas kepemilikan; render seluruh state kuis.                          |
| 5     | Autosave dan pemulihan setelah refresh/restart; validasi unggahan; histori revisi, penilaian, feedback, dan audit; batas akses warga belajar/tutor pada karya.                              |
| 6     | Status risiko diturunkan dari data nyata; tutor mencapai tindakan prioritas dengan paling banyak tiga interaksi; isolasi kelas; intervensi menghasilkan perubahan yang dapat dilacak.       |
| 7     | Rekonsiliasi ledger SKK dengan dasbor dan laporan; jejak kompetensi-bukti-mastery-SKK; persetujuan/override tutor menyimpan alasan dan histori.                                             |
| 8     | Laporan dapat ditelusuri kembali ke bukti; periode dan snapshot historis tidak berubah akibat pemetaan baru; hasil lintas peran konsisten dan dapat diekspor.                               |
| 9     | Audit keyboard, fokus, pembaca layar, reduced motion, target sentuh, dan viewport seluler; skenario jaringan lambat/putus; antrean/sinkronisasi tidak menyebabkan kehilangan data.          |
| 10    | Seluruh suite lokal; migrasi data produksi tersalin; D1 hosted, identitas produksi, isolasi lintas peran/kelas, backup-restore, observabilitas, perangkat nyata, dan jaringan lambat.       |

Format minimum rekaman validasi:

```md
# Validasi Tahap N

- Status: Sedang dikerjakan | Lulus lokal | Lulus produksi
- Tanggal:
- Commit/worktree:
- Lingkungan, port, dan peran:

## Kriteria dan bukti

- [ ] Kriteria: ...
  - Artefak: ...
  - Pemeriksaan/skenario: ...
  - Hasil: ...
  - Batas: ...

## Pemeriksaan umum

- Format/lint/typecheck/test/build: ...
- Database/API/browser: ...
- Diff dan worktree: ...

## Belum diuji dan risiko tersisa

- ...
```

## Tahap 0 — Keamanan dan Kejujuran Data

**Prioritas: wajib sebelum menambah fitur**

### Pekerjaan

- Upgrade Next.js dari versi rentan ke versi aman.
- Hapus data contoh dari jalur aplikasi nyata.
- Ganti data fallback dengan status kosong, gagal dimuat, atau belum tersedia.
- Hilangkan tanggal, jumlah tugas, streak, notifikasi, dan progres yang hard-coded.
- Tentukan bahwa peran awal hanya siswa dan tutor; admin tidak ditampilkan sebelum ruang admin tersedia.
- Pertahankan autentikasi dan pembatasan akses yang sudah ada.

### Kriteria selesai

- Audit dependency produksi tidak menemukan kerentanan kritis.
- Semua data yang terlihat dapat ditelusuri ke D1 atau diberi label jelas sebagai contoh.
- CI, TypeScript, build, dan smoke test siswa/tutor lulus.

---

## Tahap 1 — Fondasi Kurikulum dan SKK

**Tujuan: menjadikan kurikulum sebagai inti model data**

**Status: Lulus lokal.** Kriteria database/API, histori versi, rekonsiliasi SKK,
render desktop/seluler, aktivasi, penetapan, penerbitan beberapa KD,
penyimpanan gagal, dan keyboard telah diverifikasi. Lihat
[rekaman validasi Tahap 1](validation/tahap-1.md).

### Fitur tutor

- Membuat tahun ajaran dan program Paket C.
- Menentukan tingkatan dan paket kompetensi, misalnya 5.1–5.4 dan 6.1–6.2 sesuai pemetaan satuan pendidikan.
- Mengelola mata pelajaran umum, peminatan, pemberdayaan, dan keterampilan.
- Memasukkan KI/KD hasil kontekstualisasi Kurikulum 2013.
- Menentukan bobot SKK per mata pelajaran dan paket kompetensi.
- Menetapkan kombinasi tatap muka, tutorial, dan mandiri.
- Menghubungkan setiap modul dan asesmen dengan satu atau beberapa KD.

### Fitur warga belajar

- Melihat program, tingkatan, mata pelajaran, target kompetensi, dan SKK yang harus ditempuh.
- Melihat bahasa sederhana dari setiap kompetensi: “Setelah belajar ini, saya mampu…”.

### Data utama

- `curriculum_versions`
- `competency_levels`
- `competency_packages`
- `core_competencies`
- `basic_competencies`
- `subject_skk_allocations`
- `learning_modes`
- `curriculum_assignments`

### Kriteria selesai

- Jumlah SKK terencana dapat direkonsiliasi per paket kompetensi, mata pelajaran, dan warga belajar.
- Tidak ada modul atau asesmen yang diterbitkan tanpa keterkaitan kompetensi.
- Perubahan kurikulum memiliki versi dan tidak merusak histori angkatan lama.

---

## Tahap 2 — Rencana Belajar Personal Warga Belajar

**Status: Lulus lokal.** Rencana individu/kelas, pendampingan, tenggat
personal, dasbor dari D1, batas akses, resume setelah restart, serta render
desktop/seluler telah diverifikasi. Pencapaian SKK mengikuti Tahap 7 dan
identitas/database hosted mengikuti Tahap 10.
Lihat [rekaman validasi Tahap 2](validation/tahap-2.md).

**Tujuan: warga belajar selalu mengetahui langkah berikutnya**

### Fitur warga belajar

Dashboard baru menampilkan:

- Modul yang sedang dipelajari.
- Target kompetensi terdekat.
- Kegiatan tatap muka/tutorial berikutnya.
- Tugas atau asesmen yang harus diselesaikan.
- SKK terencana, sedang ditempuh, menunggu validasi, dan sudah tercapai.
- Umpan balik tutor yang belum ditindaklanjuti.
- Rekomendasi “lanjutkan”, “pelajari kembali”, atau “minta bantuan tutor”.

### Fitur tutor

- Menetapkan rencana belajar per kelas atau individu.
- Memberikan penyesuaian tenggat.
- Menandai warga belajar yang membutuhkan pendampingan.
- Melihat warga belajar yang tidak aktif atau tertinggal.

### Kriteria selesai

- Dashboard hanya memakai data server.
- Setiap kartu memiliki tindakan yang jelas.
- Warga belajar dapat kembali ke posisi terakhir setelah perangkat atau sesi berganti.

---

## Tahap 3 — Modul Belajar K13 yang Kontekstual

**Status: Lulus lokal.** Editor/penerbitan modul, isi D1, progres per bagian,
resume setelah restart, prasyarat, penanda, pertanyaan, ekspor teks, serta render
desktop/seluler dan koneksi terputus telah diverifikasi. Pencapaian SKK tetap
Tahap 7; sampel audio/video eksternal telah lulus pada browser lokal. Identitas
hosted dan perangkat/jaringan nyata belum menjadi bukti produksi. Lihat [rekaman validasi Tahap 3](validation/tahap-3.md).

**Tujuan: membangun pengalaman belajar modular dan fleksibel**

### Struktur setiap modul

1. Identitas mata pelajaran dan paket kompetensi.
2. KD dan tujuan belajar dalam bahasa sederhana.
3. Apersepsi atau masalah kontekstual.
4. Materi inti.
5. Aktivitas tatap muka, tutorial, atau mandiri.
6. Latihan formatif.
7. Refleksi warga belajar.
8. Rangkuman.
9. Asesmen ketuntasan.
10. Bukti belajar yang harus dikumpulkan.
11. Estimasi dan bobot SKK.

### Fitur warga belajar

- Daftar isi dan progres nyata.
- Resume dari posisi terakhir.
- Penanda bagian penting.
- Pengaturan ukuran teks dan mode baca.
- Unduh atau cache modul untuk koneksi terbatas.
- Lampiran audio atau video dengan transkrip.
- Tombol meminta bantuan tutor pada bagian tertentu.

### Fitur tutor

- Menulis dan menerbitkan modul.
- Mengatur prasyarat dan urutan modul.
- Mengaitkan bagian materi dengan KD.
- Melihat bagian yang paling sering tidak diselesaikan atau ditanyakan.

### Kriteria selesai

- Isi materi berasal dari database, bukan komponen statis.
- Progres dihitung dari bagian atau aktivitas yang benar-benar selesai.
- Modul tetap dapat dibaca pada layar kecil dan koneksi lambat.

---

## Tahap 4 — Asesmen Diagnostik dan Formatif

**Status: Lulus lokal.** Empat jenis soal, editor/bank tutor, resume, skor server,
penilaian uraian, riwayat, batas percobaan, dan pembahasan terverifikasi lokal.
Bukti dan batas pengukuran KD/SKK: [validasi Tahap 4](validation/tahap-4.md).

**Tujuan: mengukur proses belajar sebelum menentukan hasil akhir**

### Fitur warga belajar

- Diagnostik awal untuk mengetahui kemampuan awal.
- Latihan pilihan tunggal, pilihan jamak, isian, dan uraian.
- Umpan balik langsung untuk latihan formatif.
- Pembahasan setelah jawaban dikirim.
- Rekomendasi bagian materi yang perlu dipelajari ulang.
- Riwayat percobaan dan kemajuan.

### Fitur tutor

- Bank soal berdasarkan KD dan tingkat kesulitan.
- Kisi-kisi asesmen.
- Pengaturan jumlah percobaan dan ambang ketuntasan.
- Analisis soal dan pola kesalahan.
- Daftar warga belajar yang perlu remedial atau pengayaan.

### Pengukuran

- Penguasaan per KD.
- Perubahan nilai dari diagnostik ke formatif.
- Jumlah percobaan.
- Waktu penyelesaian yang wajar.
- Pola kesalahan.
- Tindak lanjut remedial.

### Kriteria selesai

- Kuis tidak lagi hard-coded.
- Percobaan aktif dapat dilanjutkan.
- Jawaban sebelumnya dimuat kembali.
- Nilai dihitung server-side.
- Pertanyaan dan jawaban benar tidak bocor sebelum pengiriman.

---

## Tahap 5 — Tugas, Proyek, Keterampilan, dan Portofolio

**Status: Lulus lokal (6 Oktober 2026).** Bukti, skenario, dan batas validasi:
[`docs/validation/tahap-5.md`](validation/tahap-5.md). Belum lulus produksi.

**Tujuan: mengukur kompetensi melalui pekerjaan autentik**

### Fitur warga belajar

- Menyimpan draf otomatis.
- Mengirim teks, foto, dokumen, audio, atau tautan bukti.
- Melihat rubrik sebelum mengerjakan.
- Menanggapi umpan balik dan melakukan revisi.
- Menyimpan hasil terbaik dalam portofolio.
- Mengajukan pengalaman atau kompetensi terdahulu sebagai calon alih kredit.

### Fitur tutor

- Membuat tugas dan proyek dari template.
- Menentukan KD, rubrik, bobot, serta SKK terkait.
- Menilai sikap kerja, pengetahuan, keterampilan, dan produk sesuai kebutuhan aktivitas.
- Meminta revisi tanpa menghapus histori.
- Memvalidasi bukti keterampilan dan alih kredit.
- Memberi komentar spesifik pada bagian bukti belajar.

### Kriteria selesai

- Seluruh perubahan status memiliki waktu dan pelaku.
- Nilai tidak dapat berubah tanpa histori.
- Bukti belajar tetap terhubung dengan KD, paket kompetensi, dan SKK.

---

## Tahap 6 — Dashboard Pendampingan Tutor

**Status: Lulus lokal (6 Oktober 2026).** Implementasi dan bukti lokal dicatat pada
[validasi Tahap 6](validation/tahap-6.md). Status ketuntasan KD dan pemberian
SKK mengikuti Tahap 7; nilai sumatif menunggu instrumen yang tersedia.

**Tujuan: tutor dapat mengukur proses, bukan hanya nilai akhir**

### Tampilan ringkas tutor

Tutor melihat:

- Belum mulai.
- Sedang belajar.
- Tidak aktif.
- Terlambat.
- Menunggu penilaian.
- Belum tuntas.
- Perlu remedial.
- Sudah tuntas.
- SKK menunggu validasi.

### Detail warga belajar

- Kehadiran tatap muka/tutorial.
- Aktivitas mandiri.
- Progres modul.
- Tugas dan revisi.
- Percobaan asesmen.
- Nilai formatif dan sumatif.
- Penguasaan KD.
- Umpan balik yang sudah atau belum ditindaklanjuti.
- SKK terencana, ditempuh, tervalidasi, dan kurang.

### Intervensi tutor

- Catatan pendampingan.
- Rencana remedial.
- Pengayaan.
- Penyesuaian tenggat.
- Pesan atau pengingat.
- Penetapan ulang rencana belajar.

### Kriteria selesai

Tutor dapat menemukan warga belajar berisiko maksimal dalam tiga langkah tanpa membuka laporan satu per satu.

---

## Tahap 7 — Buku Besar SKK dan Ketuntasan Kompetensi

**Tujuan: menghasilkan perhitungan SKK yang dapat diaudit**

### Status SKK

- Direncanakan.
- Sedang ditempuh.
- Bukti belum lengkap.
- Menunggu validasi.
- Tercapai.
- Diakui melalui alih kredit.
- Ditolak atau perlu perbaikan.

### Sumber pencapaian

- Tatap muka.
- Tutorial sinkron.
- Tutorial asinkron.
- Kegiatan mandiri.
- Tugas/proyek.
- Asesmen.
- Portofolio.
- Pengakuan kompetensi terdahulu.

### Aturan penting

- Aktivitas mencatat durasi dan bukti, tetapi durasi bukan satu-satunya dasar ketuntasan.
- SKK dikreditkan setelah persyaratan kompetensi terpenuhi.
- Tutor memvalidasi keputusan.
- Perubahan memiliki alasan, waktu, dan pelaku.
- Formula SKK dapat dikonfigurasi berdasarkan kurikulum operasional PKBM.

### Laporan

- Rekap SKK per warga belajar.
- Rekap per mata pelajaran.
- Rekap per paket kompetensi.
- Kekurangan SKK.
- Ketuntasan KD.
- Riwayat alih kredit.
- Laporan proses dan hasil belajar.

### Kriteria selesai

Total pada dashboard, laporan tutor, dan buku besar SKK selalu sama serta dapat ditelusuri sampai ke bukti aktivitas.

---

## Tahap 8 — Pelaporan Hasil Belajar

**Tujuan: menyajikan hasil yang dapat dipahami warga belajar, tutor, dan pengelola**

### Laporan warga belajar

- Kompetensi yang telah dikuasai.
- Kompetensi yang perlu diperbaiki.
- Nilai pengetahuan dan keterampilan.
- Catatan perkembangan.
- Portofolio.
- SKK yang sudah dicapai.
- Rekomendasi tahap berikutnya.

### Laporan tutor/pengelola

- Ketuntasan KD per kelas.
- Distribusi nilai.
- Partisipasi berdasarkan mode pembelajaran.
- Efektivitas remedial.
- Warga belajar berisiko putus belajar.
- Ketercapaian SKK.
- Kelengkapan penilaian dan bukti.

### Kriteria selesai

Laporan dapat ditelusuri ke sumber data, memiliki periode yang jelas, dan tidak mengubah histori ketika kurikulum baru diterapkan.

---

## Tahap 9 — Aksesibilitas dan Ketahanan Akses

**Dikerjakan lintas tahap, lalu diaudit khusus**

### Persyaratan

- Mobile-first.
- Target sentuh minimal 44 × 44 piksel.
- Navigasi keyboard dan pembaca layar.
- Kontras teks yang memadai.
- Tidak mengandalkan warna saja.
- Dukungan reduced motion.
- Mode hemat data.
- Penyimpanan draf saat koneksi terputus.
- Sinkronisasi aman ketika kembali online.
- PDF atau materi unduhan yang ramah akses.
- Bahasa Indonesia sederhana dan konsisten.

### Kriteria selesai

Alur utama siswa dapat diselesaikan pada perangkat seluler dan koneksi terbatas tanpa kehilangan jawaban.

---

## Tahap 10 — Validasi Operasional dan Produksi

### Validasi lokal

- Unit test.
- Data-layer integration test.
- API negative-path dan ownership test.
- Browser E2E siswa.
- Browser E2E tutor.
- Resume setelah restart.
- Konflik sinkronisasi.
- Rekonsiliasi SKK.
- Audit aksesibilitas.

### Validasi produksi

- Migrasi D1 hosted.
- Identitas Sites untuk minimal dua siswa dan dua tutor.
- Isolasi antarsiswa dan antarkelas.
- Uji akses tutor lintas kelas.
- Backup dan pemulihan.
- Audit log.
- Monitoring error.
- Uji perangkat dan jaringan nyata.

Deployment dilakukan setelah setiap gerbang validasi selesai, bukan hanya karena build berhasil.

---

# Prioritas Implementasi

## Prioritas 1 — Wajib

1. Keamanan dependency.
2. Hilangkan data palsu.
3. Model kurikulum, KI/KD, paket kompetensi, dan SKK.
4. Dashboard belajar personal.
5. Materi dinamis dan progres nyata.
6. Asesmen formatif dan ketuntasan KD.

## Prioritas 2 — Dampak pembelajaran tinggi

1. Tugas autentik dan rubrik.
2. Remedial dan pengayaan.
3. Dashboard pendampingan tutor.
4. Portofolio.
5. Buku besar SKK.

## Prioritas 3 — Operasional lanjutan

1. Pelaporan lengkap.
2. Alih kredit.
3. Ruang admin.
4. Notifikasi nyata.
5. Offline/low-bandwidth lebih lanjut.
6. Integrasi sistem eksternal jika benar-benar dibutuhkan.

# Indikator Keberhasilan Produk

## Untuk warga belajar

- Persentase modul yang diselesaikan.
- Persentase KD yang tuntas.
- Peningkatan dari diagnostik ke asesmen akhir.
- Keberhasilan remedial.
- Ketepatan pengumpulan tugas.
- Keaktifan belajar per minggu.
- SKK yang tercapai dibandingkan target.
- Jumlah warga belajar yang kembali aktif setelah intervensi.

## Untuk tutor

- Waktu rata-rata menilai.
- Persentase tugas yang mendapat umpan balik.
- Warga belajar berisiko yang berhasil ditindaklanjuti.
- Kelengkapan pemetaan KD dan SKK.
- Konsistensi nilai dengan rubrik.
- Persentase bukti belajar yang telah divalidasi.

## Untuk pengelola

- Ketuntasan per paket kompetensi.
- Kekurangan SKK per warga belajar.
- Retensi warga belajar.
- Kelengkapan laporan.
- Konsistensi data dashboard, nilai, dan buku besar SKK.
- Jumlah perubahan data penting yang memiliki jejak audit.
