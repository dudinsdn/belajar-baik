# RuangTumbuh — Gambaran Proyek

## Tentang RuangTumbuh

RuangTumbuh adalah aplikasi pembelajaran untuk warga belajar dan tutor Program
Paket C. Aplikasi ini membantu warga belajar memahami target belajar, mengikuti
kegiatan secara bertahap, memperoleh umpan balik, mencapai kompetensi, dan
memantau Satuan Kredit Kompetensi (SKK).

Pembelajaran mengacu pada Kurikulum 2013 pendidikan kesetaraan. Kompetensi
dikontekstualkan agar bermakna bagi kehidupan warga belajar dan dapat dicapai
melalui pembelajaran tatap muka, tutorial sinkron atau asinkron, serta kegiatan
mandiri.

## Prinsip Produk

- Kebutuhan warga belajar menjadi prioritas utama.
- Setiap halaman memberikan tujuan dan tindakan berikutnya yang jelas.
- Bahasa, navigasi, dan umpan balik harus mudah dipahami.
- Pembelajaran dapat dilanjutkan setelah jeda, pergantian perangkat, atau
  gangguan koneksi.
- Tutor memperoleh informasi untuk mendampingi proses dan menilai hasil belajar.
- Data contoh tidak boleh ditampilkan sebagai catatan belajar yang nyata.
- Nilai, penyelesaian aktivitas, ketuntasan kompetensi, dan pencapaian SKK
  diperlakukan sebagai hal yang berbeda.

## Pengguna

### Warga belajar

Warga belajar dapat:

- melihat program, tingkatan, paket kompetensi, dan rencana belajarnya;
- memahami tujuan dan kompetensi yang akan dicapai;
- membaca modul dan melanjutkan dari posisi terakhir;
- mengikuti kegiatan tatap muka, tutorial, dan mandiri;
- mengerjakan latihan, tugas, proyek, serta asesmen;
- menerima nilai, pembahasan, umpan balik, remedial, atau pengayaan;
- mengumpulkan bukti belajar dan membangun portofolio; serta
- melihat kompetensi dan SKK yang sedang ditempuh atau telah dicapai.

### Tutor

Tutor dapat:

- memetakan mata pelajaran, KI/KD, paket kompetensi, dan SKK;
- menyusun modul, kegiatan, tugas, asesmen, dan rubrik;
- memantau partisipasi dan progres warga belajar;
- menemukan warga belajar yang membutuhkan pendampingan;
- menilai pengetahuan, keterampilan, tugas, proyek, dan bukti belajar;
- memberikan umpan balik, remedial, dan pengayaan;
- memvalidasi ketuntasan kompetensi dan pencapaian SKK; serta
- melihat laporan proses dan hasil belajar.

Peran pengelola atau administrator merupakan target lanjutan. Peran tersebut
tidak boleh diarahkan melalui antarmuka warga belajar atau tutor sebelum ruang
kerjanya tersedia.

## Kurikulum, Kompetensi, dan SKK

Setiap kegiatan belajar harus dapat ditelusuri melalui hubungan berikut:

**Mata pelajaran → Tingkatan/Paket Kompetensi → KI/KD → Modul → Kegiatan →
Asesmen → Bukti belajar → Ketuntasan → SKK**

Pemetaan kurikulum dan SKK disimpan dalam versi agar perubahan untuk angkatan
baru tidak mengubah riwayat belajar angkatan sebelumnya. Alokasi SKK mengikuti
kurikulum operasional yang telah disetujui satuan pendidikan.

Aktivitas dan durasi membantu menggambarkan proses belajar, tetapi tidak
otomatis membuktikan ketuntasan. Pencapaian SKK memerlukan bukti kompetensi dan
validasi tutor dengan alasan serta riwayat yang dapat ditelusuri.

## Pengukuran Pembelajaran

### Proses belajar

Proses belajar dapat dilihat melalui:

- partisipasi tatap muka, tutorial, atau kegiatan mandiri;
- progres modul dan aktivitas;
- ketepatan pengumpulan tugas;
- jumlah percobaan dan perkembangan hasil asesmen;
- tindak lanjut terhadap umpan balik; serta
- pelaksanaan remedial atau pengayaan.

### Hasil belajar

Hasil belajar dinilai melalui:

- asesmen diagnostik, formatif, dan sumatif;
- tugas dan proyek autentik;
- rubrik pengetahuan dan keterampilan;
- portofolio dan bukti belajar;
- ketuntasan KI/KD; serta
- SKK yang telah diverifikasi.

## Bagian Utama Produk

- Dashboard personal yang menunjukkan langkah belajar berikutnya.
- Modul kontekstual dengan progres dan posisi baca.
- Perpustakaan dan bahan belajar pendukung.
- Latihan dan asesmen dengan pembahasan serta tindak lanjut.
- Tugas, proyek, revisi, rubrik, dan portofolio.
- Dashboard pendampingan dan ruang penilaian tutor.
- Buku besar SKK dan ketuntasan kompetensi.
- Laporan proses dan hasil belajar.

## Data dan Akses

Identitas pengguna menentukan peran dan ruang belajar yang boleh diakses.
Identitas produksi berasal dari Sites, sedangkan pengembangan lokal menggunakan
satu identitas simulasi per proses server.

Data pembelajaran bersama disimpan di Cloudflare D1. Server memeriksa peran,
keanggotaan kelas, kepemilikan, dan akses sumber daya pada setiap alur yang
dilindungi. Penyimpanan browser hanya digunakan untuk preferensi
non-otoritatif atau antrean offline yang dinyatakan secara eksplisit.

## Aksesibilitas dan Ketahanan Akses

RuangTumbuh dikembangkan dengan pendekatan mobile-first, bahasa Indonesia yang
sederhana, navigasi keyboard, fokus yang terlihat, target sentuh yang memadai,
kontras yang terbaca, serta dukungan pembaca layar dan reduced motion.

Alur penting harus tetap aman pada koneksi terbatas. Draf atau jawaban tidak
boleh hilang tanpa pemberitahuan ketika koneksi terputus.

## Kondisi Saat Ini dan Arah Pengembangan

Versi saat ini telah memiliki fondasi autentikasi per peran, data D1, progres
materi dan perpustakaan, tugas, kuis dengan penilaian server, serta penilaian
tugas oleh tutor.

Fondasi versi kurikulum, pemetaan KI/KD, paket kompetensi, dan alokasi SKK
telah lulus lokal pada Tahap 1. Rencana personal, tenggat individual,
pendampingan dasar, serta kartu langkah berikutnya tersedia pada Tahap 2;
buktinya dicatat di `docs/validation/`. Tahap 3 menyediakan penyusunan dan
penerbitan modul per bagian, reader D1, progres server, resume, penanda,
pertanyaan, prasyarat, dan ekspor teks. Status buktinya berada di
`docs/validation/tahap-3.md`. Tahap 4 menambah penyusunan diagnostik/formatif,
bank/kisi-kisi KD, empat jenis jawaban, resume, pembahasan, penilaian uraian,
riwayat percobaan, serta indikator jawaban per KD. Bukti dan batasnya berada di
`docs/validation/tahap-4.md`. Nilai asesmen tetap terpisah dari ketuntasan/SKK.
Buku besar SKK, portofolio, remedial terstruktur,
pelaporan lengkap, antrean/sinkronisasi offline, dan ruang administrator
merupakan target pengembangan bertahap.
Urutan pekerjaan dan kriteria penyelesaiannya ditetapkan dalam `docs/roadmap.md`.
