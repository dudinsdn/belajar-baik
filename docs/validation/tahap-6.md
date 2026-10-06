# Validasi Tahap 6 — Dashboard Pendampingan Tutor

- Status: **Lulus lokal**.
- Tanggal: 6 Oktober 2026.
- Lingkungan: Vinext/Workers dan D1 lokal, port 3000 strict, tutor simulasi Adi.
- Basis commit: `49de2a6`; worktree Tahap 6 belum committed. Identitas hosted belum diuji.

## Kriteria dan bukti

| Kriteria | Artefak | Pemeriksaan dan hasil | Batas |
| --- | --- | --- | --- |
| Tutor menemukan warga belajar berisiko maksimal tiga langkah | `mentoring.ts`, `mentoring-view.tsx`, navigasi awal tutor | Tes domain: prioritas berasal dari aktivitas, tenggat, revisi, dan asesmen nyata. Browser desktop: prioritas langsung tampil dan detail dibuka satu klik | Tidak menghitung mastery atau SKK tercapai |
| Isolasi kelas/penugasan | `mentoringScope`, read gates kompetensi, trigger akses | Domain menolak siswa/admin/tutor lain/warga belajar asing, membership nonaktif, kelas arsip | Hosted identity belum diuji |
| Intervensi menghasilkan perubahan yang dapat dilacak | tabel `mentoring_events`, `attendance_events`, migrasi 0018/0019 | Domain: aktor/waktu, append-only, penutupan sekali, koreksi hadir dengan histori; arahan terbuka tersedia untuk siswa | Tidak mengirim email/SMS/notifikasi eksternal |

## Pemeriksaan umum

- Tes domain pendampingan: lulus; adapter memeriksa jumlah binding setara D1.
- Format, lint, seluruh tes, build: `npm run ci` lulus pada sumber final.
- TypeScript (`tsc --noEmit --incremental false`), `npm run db:check`, dan `git diff --check`: lulus.
- API D1: kesalahan binding kueri ditemukan dan diperbaiki; smoke tutor dan siswa lulus setelah perbaikan.
- Browser desktop/mobile/lintas peran: lulus untuk skenario yang dicatat di bawah.
- Migrasi forward 0018/0019 diterapkan lokal setelah backup. Data lama tidak
  direseed; perbandingan tersedia di `assets/tahap6-d1-integrity.json`.
- Backup lokal sebelum migrasi: `/tmp/ruangtumbuh-before-tahap6.sqlite`.

## Batas tahap

Ketuntasan KD, SKK ditempuh/menunggu validasi/tervalidasi/kurang, dan keputusan
alih kredit menunggu buku besar Tahap 7. Nilai sumatif memerlukan instrumen yang
belum tersedia. UI tidak menggantinya dengan angka atau status contoh.
Indikator remedial memakai percobaan formatif terakhir per asesmen, bukan nilai
terburuk sepanjang histori. Aktivitas tutor tidak dianggap aktivitas siswa.
Kehadiran hanya dicatat untuk rencana tatap muka/tutorial yang terlihat.

Belum diuji: hosted D1/identity, perangkat fisik, screen reader lengkap,
load/kapasitas produksi. Dashboard membaca detail setiap warga belajar pada
penugasan; perlu pengujian kapasitas sebelum penggunaan kelas besar. Tidak ada
push, publish, atau deployment.

## Bukti yang sudah diamati

- Smoke API D1 pada tutor dan siswa lulus. Siswa memperoleh 403 dari endpoint
  pendampingan tutor; target asing mendapat 404, body invalid mendapat 422.
- Browser desktop 1440×900: tutor langsung melihat prioritas dan membuka detail
  Dudin dengan satu klik. Desktop sudah menampilkan tugas/karya, percobaan,
  permintaan bantuan, dan histori catatan. Screenshot prioritas di
  `assets/tahap6-prioritas-desktop.png`.
- Browser seluler 390×844: daftar, detail, filter kosong, form kehadiran, dan
  arahan siswa. Lebar dokumen 375 px, tanpa overflow horizontal. Tombol pada
  `.mentoring-view` minimum 44 px. Screenshot di
  `assets/tahap6-prioritas-mobile.png`, `assets/tahap6-detail-mobile.png`, dan
  `assets/tahap6-arahan-siswa-mobile.png`.
- Input catatan hanya spasi ditolak 422 dan error terlihat; input tetap ada.
  Catatan valid, remedial dengan tenggat, dan hadir tutorial disimpan dari
  browser. Snapshot event lokal ada di `assets/tahap6-interventions.json`.
- Restart terkontrol tutor → siswa → tutor pada port 3000: arahan remedial tetap
  terlihat pada beranda siswa; catatan privat tidak terlihat. Prioritas tutor
  setelah restart menampilkan satu tindak lanjut terbuka.
- Perbandingan segera setelah migrasi: 266 baris lama pada 45 tabel sama dengan
  backup, foreign key check kosong. Tidak ada reseed. Nama record tutor yang
  diamati kemudian adalah `Nerekab` pada id `usr_teacher_adi`; konfigurasi
  simulasi tetap `Adi Rama`. Pekerjaan ini tidak mengubah atau mengembalikan
  nama record pengguna tersebut.
- Tes domain mencakup remedial dari percobaan terakhir, batas tepat tujuh hari,
  nilai belum final, penutupan beralasan, kehadiran dengan koreksi/histori,
  penetapan ulang rencana (snapshot lama dalam transaksi), tenggat, serta
  penolakan lintas peran/penugasan/membership/kelas arsip.
- Vinext mengalami startup dingin lambat, timeout browser, dan invalid hook
  setelah hot reload selama pengubahan source. Restart server memulihkan render.
  Build memberi warning klasifikasi route dan React dev memberi warning eval.
  Batas performa ini tidak dijadikan bukti produksi.

## Bukti tambahan dan keadaan akhir

- Browser membuktikan penetapan ulang rencana tutorial menjadi
  `UJI Tahap 6 — tutorial pendampingan`. Konteks kelas dan siswa sudah terpilih,
  alasan tersimpan, mode/jadwal/kehadiran dipertahankan. Histori judul/tenggat
  lama ke baru terlihat bersama aktor/waktu/alasan. Bukti ada pada
  `assets/tahap6-riwayat-desktop.png` dan `assets/tahap6-interventions.json`.
- Tautan detail membuka Penilaian dengan karya Dudin
  `UJI Tahap 5 Proyek Lingkungan` terpilih dan bukti/rubrik terbaca.
  Tidak ada perubahan nilai pada pemeriksaan ini.
- Loading, empty, error 422, dan pelestarian input gagal diamati di browser.
  Resolve, koreksi hadir, serta batas akses diuji di domain/API; bukan
  seluruhnya klik browser. Pengayaan dan pengingat berbagi jalur validasi
  intervensi, belum diuji melalui klik browser tersendiri.
- Hash sumber final: `assets/tahap6-source-sha256.txt`, basis `49de2a6`,
  worktree belum committed. Bukti bukan deployment.
- Efek lokal: migrasi 0018/0019, dua event pendampingan uji, satu event hadir,
  dan satu penetapan ulang rencana uji. Tidak ada reseed/penghapusan data.
- Konfigurasi `.dev.vars` dikembalikan byte-for-byte ke tutor awal;
  `/api/v1/me` diverifikasi. Server validasi port 3000 dihentikan setelah pemeriksaan.
- Semua perubahan tracked/untracked merupakan keluaran tahap ini. Tidak ada
  perubahan dependensi/lockfile. Tidak committed, pushed, published, atau
  deployed; Tahap 7 belum diimplementasikan.
- Mastery, SKK tercapai, dan sumatif tidak berlaku untuk kelulusan tahap ini
  karena instrumen/buku besar dijadwalkan kemudian; UI menyatakan belum tersedia.
