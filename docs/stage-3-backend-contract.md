# Tahap 3.1 — Kontrak Backend RuangTumbuh

Status: disetujui untuk implementasi lokal. Dokumen ini menjadi batas kontrak sebelum database, autentikasi, atau route API ditulis.

## 1. Tujuan dan batas tahap

Tahap 3 memindahkan data utama dari data contoh dan `localStorage` ke layanan server yang tahan lama. Preferensi perangkat seperti ukuran tampilan boleh tetap lokal, tetapi pengguna, kelas, materi, tugas, pengumpulan, kuis, nilai, dan progres harus menjadi data server.

Tahap 3.1 hanya menetapkan arsitektur dan kontrak. Belum mengaktifkan database produksi, autentikasi produksi, unggahan berkas, atau deployment.

## 2. Arsitektur yang dipilih

- UI: Vinext/React yang sudah ada.
- API: route handler server di aplikasi yang sama, dengan prefix `/api/v1`.
- Data terstruktur: Cloudflare D1/SQLite dengan logical binding `DB` saat implementasi database dimulai.
- Berkas: belum memakai R2. Pengumpulan Tahap 3 awal berupa teks; R2 baru ditambahkan saat unggahan dokumen benar-benar dikerjakan.
- Otorisasi: seluruh keputusan akses dilakukan di server, tidak berdasarkan tombol atau role dari browser.
- Identitas: route memakai abstraksi `CurrentUser`. Adapter produksi belum dipilih sampai jalur autentikasi publik untuk siswa/guru dikonfirmasi. Selama pengembangan lokal, identitas fixture hanya boleh aktif pada mode development.

## 3. Peran dan hak akses

| Operasi | Siswa | Guru | Admin |
| --- | --- | --- | --- |
| Membaca kelas dan materi yang diikuti | Ya | Ya, kelas yang diajar | Ya |
| Mengubah materi/kuis/tugas | Tidak | Ya, kelas yang diajar | Ya |
| Mengirim tugas dan jawaban kuis | Ya, milik sendiri | Tidak | Tidak |
| Membaca pengumpulan siswa | Milik sendiri | Kelas yang diajar | Ya |
| Memberi nilai dan umpan balik | Tidak | Kelas yang diajar | Ya |
| Mengelola keanggotaan kelas | Tidak | Tidak | Ya |

Prinsip wajib: setiap query data milik pengguna menyertakan identitas dan ruang kelas yang diizinkan; ID dari URL tidak pernah cukup sebagai bukti akses.

## 4. Model data inti

- `users`: id, external_identity_id, email, display_name, role, status, created_at, updated_at.
- `classes`: id, name, program, grade_level, academic_year, teacher_id, status.
- `class_memberships`: class_id, student_id, joined_at, status. Unik per pasangan kelas dan siswa.
- `subjects`: id, code, name.
- `class_subjects`: id, class_id, subject_id, teacher_id.
- `materials`: id, class_subject_id, title, summary, content, order_index, status, published_at, author_id.
- `material_progress`: material_id, student_id, percent, last_position, completed_at, updated_at. Unik per materi dan siswa.
- `assignments`: id, class_subject_id, title, instructions, submission_type, due_at, status, author_id.
- `submissions`: id, assignment_id, student_id, answer_text, status, submitted_at, score, feedback, graded_by, graded_at. Unik per tugas dan siswa.
- `quizzes`: id, class_subject_id, material_id, title, status, passing_score, author_id.
- `quiz_questions`: id, quiz_id, prompt, order_index, explanation.
- `quiz_options`: id, question_id, label, order_index, is_correct. Kolom jawaban benar tidak pernah dikirim pada payload soal siswa.
- `quiz_attempts`: id, quiz_id, student_id, status, score, started_at, completed_at.
- `quiz_answers`: attempt_id, question_id, selected_option_id, is_correct.
- `library_items`: id, subject_id, title, author, description, content, page_count, status.
- `library_progress`: library_item_id, student_id, percent, last_position, bookmarked, updated_at.

Semua ID publik memakai UUID/string acak. Waktu disimpan sebagai UTC ISO-8601. Penghapusan konten pembelajaran memakai status arsip agar histori nilai tidak rusak.

## 5. Kontrak respons

Respons sukses:

```json
{
  "data": {},
  "meta": { "requestId": "..." }
}
```

Respons gagal:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data yang dikirim belum lengkap.",
    "fields": { "answerText": "Jawaban wajib diisi." }
  },
  "meta": { "requestId": "..." }
}
```

Kode minimum: `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `VALIDATION_ERROR` (422), dan `INTERNAL_ERROR` (500).

## 6. Endpoint Tahap 3

### Identitas dan dashboard

- `GET /api/v1/me` — profil dan role pengguna saat ini.
- `GET /api/v1/dashboard` — ringkasan progres, tugas terdekat, dan materi lanjutan.

### Materi dan perpustakaan

- `GET /api/v1/materials?classSubjectId=`
- `GET /api/v1/materials/:materialId`
- `PUT /api/v1/materials/:materialId/progress` — `{ percent, lastPosition }`.
- `GET /api/v1/library?query=&subjectId=`
- `PUT /api/v1/library/:itemId/progress` — `{ percent, lastPosition, bookmarked }`.

### Tugas

- `GET /api/v1/assignments?status=`
- `GET /api/v1/assignments/:assignmentId`
- `PUT /api/v1/assignments/:assignmentId/submission` — simpan draf `{ answerText }`.
- `POST /api/v1/assignments/:assignmentId/submission/submit` — finalisasi pengumpulan secara idempoten.
- `PUT /api/v1/submissions/:submissionId/grade` — guru mengirim `{ score, feedback }`.

### Kuis

- `GET /api/v1/quizzes/:quizId`
- `POST /api/v1/quizzes/:quizId/attempts` — membuat atau mengembalikan attempt aktif.
- `PUT /api/v1/quiz-attempts/:attemptId/answers/:questionId` — simpan satu jawaban.
- `POST /api/v1/quiz-attempts/:attemptId/submit` — nilai di server dan finalisasi secara idempoten.
- `GET /api/v1/quiz-attempts/:attemptId/result` — nilai dan pembahasan setelah submit.

## 7. Validasi dan aturan bisnis

- Tugas tidak dapat dikirim setelah tenggat kecuali guru mengaktifkan izin terlambat.
- Pengumpulan yang sudah dinilai tidak dapat diubah siswa.
- Skor tugas berada pada rentang 0–100.
- Attempt kuis yang selesai tidak dapat ditulis ulang.
- Nilai kuis dihitung di server dari opsi tersimpan, bukan dari jawaban benar yang dikirim ke browser.
- Operasi submit aman diulang: respons kedua mengembalikan hasil final yang sama, bukan membuat record baru.
- Semua teks bebas dibatasi panjangnya dan divalidasi sebelum penyimpanan.

## 8. Indeks awal berdasarkan query nyata

- unik `users(external_identity_id)` dan `users(email)`.
- unik `class_memberships(class_id, student_id)`.
- indeks `materials(class_subject_id, status, order_index)`.
- indeks `assignments(class_subject_id, status, due_at)`.
- unik `submissions(assignment_id, student_id)`.
- indeks `submissions(assignment_id, status)` untuk antrean penilaian guru.
- unik `material_progress(material_id, student_id)`.
- indeks `quiz_attempts(student_id, quiz_id, status)`.

## 9. Urutan commit implementasi

1. `Define backend contract and authorization boundaries` — dokumen ini.
2. `Add D1 schema and local migrations` — skema, indeks, dan seed development.
3. `Add server identity and authorization helpers` — fixture lokal serta boundary adapter produksi.
4. `Implement student read APIs` — profil, dashboard, materi, dan perpustakaan.
5. `Implement assignment submission APIs`.
6. `Implement quiz attempt and grading APIs`.
7. `Connect student UI to local APIs` per modul, tanpa menghapus fallback sampai migrasi modul selesai.
8. `Add teacher grading workflow`.

Setiap commit harus lulus lint, build lokal, pemeriksaan migrasi yang relevan, dan tes route terfokus sebelum commit berikutnya dimulai.

## 10. Definition of Done Tahap 3.1

- Model data, peran, endpoint, bentuk error, dan aturan bisnis terdokumentasi.
- Batas data authoritative versus preferensi perangkat jelas.
- Pilihan D1 dan penundaan R2 dinyatakan eksplisit.
- Implementasi autentikasi produksi tidak diasumsikan sebelum jalurnya dikonfirmasi.
- Tidak ada perubahan deployment atau resource produksi.
