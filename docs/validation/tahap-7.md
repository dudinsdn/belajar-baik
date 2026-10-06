# Validasi Tahap 7 — Buku Besar SKK dan Ketuntasan Kompetensi

- Status: **Lulus lokal**. Belum lulus produksi.
- Tanggal: 6 Oktober 2026.
- Lingkungan: Vinext/Workers, D1 lokal, port 3000 strict; tutor awal dan siswa Dudin.
- Commit/worktree: basis commit dicatat pada manifest hash sumber; perubahan belum committed.

## Implementasi dan kebijakan

`server/data/skk.ts` menjadi sumber perhitungan yang sama untuk ledger, dasbor
siswa, dan detail pendampingan tutor. Rekap tersedia per warga belajar, mata
pelajaran, dan kode paket kompetensi. Identitas versi tetap dapat ditelusuri
melalui penetapan kurikulum dan snapshot keputusan.

SKK terencana berasal dari `subject_skk_allocations.planned_skk`, bukan angka
regulasi yang di-hard-code. Kebijakan pemberian tahap ini adalah alokasi penuh
setelah **semua KD pada mata pelajaran/paket tersebut** divalidasi tuntas oleh
tutor, lalu tutor memberikan keputusan SKK dengan alasan. SKK tercapai adalah
jumlah alokasi pada revisi terakhir berstatus diberikan/diakui; kekurangan adalah
terencana dikurangi tercapai. Tidak menggunakan pembagian berdasarkan lama
login, jumlah klik, atau proporsi nilai. Penyesuaian jumlah SKK memakai konfigurasi
kurikulum versi draft sebelum aktivasi; bukan mengedit ledger historis.

Bukti dapat berupa karya yang sudah dinilai, asesmen selesai dengan nilai final,
atau kegiatan dalam rencana belajar. Bukti kegiatan mensyaratkan hasil pengamatan
kompetensi tutor dan durasi 1–1440 menit, serta rekam hadir atau progres mandiri
selesai. Mode tatap muka, tutorial sinkron/asinkron, dan mandiri dipisahkan dalam
snapshot. Kehadiran/durasi/progres sendiri tidak cukup untuk memberikan SKK.
Karya/portofolio/pengalaman terdahulu tetap memakai bukti dari Tahap 5. Alih kredit
mensyaratkan bukti pengalaman terdahulu yang dinilai untuk seluruh KD alokasi.

Koreksi tidak menimpa histori: keputusan KD/SKK append-only, dengan pelaku,
waktu, alasan, revisi, dan snapshot bukti. Tutor mencabut SKK lebih dahulu sebelum
mengubah KD yang sudah menghasilkan kredit. Revisi usang ditolak; trigger juga
menolak pemberian atas revisi mastery yang berubah ketika penyimpanan berlangsung.

## Kriteria dan bukti

| Kriteria                                               | Artefak                                                        | Pemeriksaan dan hasil                                                                                                                                                     | Batas                                                                                              |
| ------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Total dasbor, laporan tutor, dan ledger sama           | `readSkk`, `student-read.ts`, `mentoring.ts`, `skk-view.tsx`   | Tes domain pemberian/pencabutan/alih kredit merekonsiliasi nilai nonzero; API siswa merekonsiliasi 10 terencana/0 tercapai/10 kurang                                      | Total tutor lintas siswa lebih besar sesuai scope; bandingkan rekap siswa yang sama                |
| Kompetensi → bukti → mastery → SKK dapat ditelusuri    | tabel `mastery_decisions`, `skk_decisions`, snapshot keputusan | Tes domain menolak bukti asing/belum dinilai, KD berbeda, asesmen belum final, kegiatan tanpa pengamatan/durasi; bukti KD tampil dalam histori                            | Snapshot menyimpan bukti saat keputusan, bukan klaim bahwa sumber tidak pernah diperbarui kemudian |
| Persetujuan/koreksi tutor menyimpan alasan dan histori | `decideSkk`, migrasi 0020/0021                                 | Tes: alasan kosong ditolak, pemberian hanya sesudah seluruh KD tuntas, pencabutan sebelum koreksi, konflik 409, SQL update/delete ditolak                                 | Hosted identity belum diuji                                                                        |
| Isolasi peran, siswa, dan kelas                        | scope query dan trigger keputusan                              | Domain: siswa/admin/tutor asing/membership nonaktif ditolak; API siswa mendapat 403 untuk POST; browser siswa tidak memiliki form keputusan                               | Batas hosted tetap Tahap 10                                                                        |
| Tampilan dan persistensi                               | navigasi SKK, view tutor/siswa                                 | Tutor seluler menolak kredit saat KD belum lengkap dan mempertahankan input; satu keputusan KD dari karya uji tersimpan; siswa setelah restart melihat keputusan tersebut | Bukti browser akhir dan kredit nonzero dicatat di bawah                                            |

## Pemeriksaan umum

- Format, lint, seluruh tes, dan production build: `npm run ci` lulus.
- TypeScript: `npx tsc --noEmit --incremental false` lulus.
- Skema: `npm run db:check` lulus; migrasi forward 0020/0021 diterapkan lokal.
- Tes terfokus: `npm run test:skk` lulus; adapter D1 memeriksa jumlah binding
  serta `meta.changes`, termasuk transaksi dan trigger SQLite.
- API siswa: `npm run test:skk:api` lulus, tanpa reseed/server tambahan.
- API tutor, kredit positif pada D1, persistensi setelah restart, pencabutan,
  rekonsiliasi akhir, serta `git diff --check`: lulus.
- Backup sebelum migrasi: `/tmp/ruangtumbuh-before-tahap7.sqlite`.
- Foreign key check sesudah migrasi: kosong. Rekonsiliasi tabel lama dicatat
  pada `assets/tahap7-d1-integrity.json` setelah pemeriksaan akhir.

## Browser yang diamati

- Tutor desktop: ledger menampilkan alokasi nyata, daftar KD, kandidat bukti,
  form validasi, dan form keputusan SKK; state loading diamati.
- Tutor seluler 390×844: form KD/SKK tampil; kredit tanpa seluruh KD tuntas
  ditolak 422 dan alasan tetap ada. Penyimpanan keputusan KD dari karya
  `UJI Tahap 5 Proyek Lingkungan` diterima dan tersimpan pada D1.
- Siswa desktop: kartu dasbor menunjukkan 10 terencana/0 tercapai/10 kurang;
  tindakan membuka ledger. Setelah restart tutor → siswa, KD 3.1 berstatus
  tuntas dengan alasan/waktu uji dan KD 3.2 belum divalidasi; SKK belum diberikan.
- Siswa seluler 390×844: ledger dan ringkasan terbaca, tanpa overflow horizontal
  (lebar dokumen 375 px); tidak ada form keputusan tutor.
- Catatan screenshot/AX pada browser in-app tersedia di percakapan validasi.
  Tidak dibuat klaim pengujian seluruh kombinasi sumber melalui klik browser.

## Batas dan efek lokal

- Tidak ada klaim baru mengenai total regulasi Paket C; alokasi berasal dari
  konfigurasi PKBM yang sudah tersedia. Validitas regulasi konfigurasi aktual
  bukan kesimpulan dari ledger ini.
- Pelaporan periode/ekspor/snapshot rapor lengkap tetap Tahap 8. Uji perangkat
  fisik, pembaca layar lengkap, jaringan nyata, hosted D1/identity, dan produksi
  tetap belum dilakukan.
- Kebijakan saat ini memberikan alokasi penuh; tidak menyediakan formula
  ekspresi bebas, SKK parsial per KD, atau override tanpa bukti kompetensi.
- Pembacaan masih per alokasi dan mengambil histori; kapasitas kelas besar
  belum diukur. Vinext startup/hot reload lambat dan beberapa timeout browser
  terjadi; restart terkontrol digunakan untuk memulihkan render.
- Data lama tidak direseed atau dihapus. Efek uji lokal berupa keputusan KD,
  rencana/tutorial, hadir, serta ledger uji dengan histori yang dipertahankan.
- Konfigurasi/peran/server akhir dicatat setelah validasi selesai. Tidak ada
  commit, push, publikasi, deployment, atau operasi hosted.

## Bukti akhir dan keadaan handoff

- D1 lokal: rencana tutorial uji dibuat pada alokasi paket 5.2, dihadiri,
  dilengkapi hasil pengamatan serta 60 menit; KD divalidasi dan 6 SKK diberikan.
  Rekap Dudin adalah 10 terencana/6 tercapai/4 kurang, sama dengan detail tutor.
- Restart tutor → siswa pada port 3000: API smoke kembali lulus dengan
  10/6/4. Browser dasbor dan ledger siswa menampilkan angka yang sama;
  histori dibuka sampai bukti pengamatan dan durasi. Tidak ada form tutor.
- Tutor dipulihkan byte-for-byte dari konfigurasi awal. Kredit uji dicabut
  memakai alasan, sehingga kondisi akhir Dudin 10 terencana/0 tercapai/10
  belum tercapai; agregat tutor 14/0/14. Pemberian 6 SKK sebelumnya tetap ada
  di histori. Hasil tersedia di `assets/tahap7-api-results.json`.
- API smoke akhir tutor SKK dan pendampingan lulus, termasuk 404 target asing
  dan 422 input invalid. Domain mencakup alih kredit penuh, koreksi KD,
  konflik revisi, sumber kegiatan pada empat mode, dan penolakan bukti tidak final.
- Browser final tutor pada 390×844 menampilkan form pengamatan, durasi, dan
  mode kegiatan; revisi pengamatan dari browser diuji tanpa pemberian ulang SKK.
  Desktop dan seluler telah dirender. Keyboard penuh/screen reader khusus
  menjadi audit Tahap 9; kontrol memakai label, tombol, select, serta details native.
- Keadaan kosong kandidat bukti pada warga belajar baru dan alokasi tanpa
  bukti ditampilkan; keadaan loading dan error server 422 telah diamati.
  Gangguan jaringan spesifik ledger belum disimulasikan di browser; jalur
  kegagalan request memakai kontrak `readApi/writeApi` yang sama.
- Semua baris lama pada tabel domain tetap identik; `_cf_METADATA` runtime
  berubah saat Workers berjalan. Perbedaan ini dicatat terpisah, bukan dianggap
  kehilangan data aplikasi. Foreign key check kosong.
- Migrasi SQL lama tidak diubah. Metadata migrasi turut mendaftarkan guard
  0019 Tahap 6 yang sebelumnya belum tercantum pada journal, lalu 0020/0021;
  snapshot berurutan dipertahankan agar generate berikutnya tidak mengulang nomor.
- Pemeriksaan sumber final: CI lulus, TypeScript dan skema lulus. Lint memiliki
  lima warning yang sudah ada pada pendampingan/test Tahap 6; tidak ada error.
  Build tetap memiliki warning klasifikasi route Vinext dan runtime dev warning eval.
- Manifest sumber: `assets/tahap7-source-sha256.txt`. Tidak ada perubahan
  dependensi/lockfile, reseed, penghapusan data, commit, push, publikasi, atau deployment.
- Semua perubahan tracked/untracked berasal dari tahap ini; worktree awal bersih.
  Server validasi port 3000 dihentikan setelah pemeriksaan; konfigurasi tetap tutor awal.
