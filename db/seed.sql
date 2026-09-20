PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO users (id, external_identity_id, email, display_name, role, status, created_at, updated_at) VALUES
  ('usr_teacher_adi', 'dev:teacher:adi', 'adi@ruangtumbuh.local', 'Adi Rama', 'teacher', 'active', datetime('now'), datetime('now')),
  ('usr_student_dudin', 'dev:student:dudin', 'dudin@ruangtumbuh.local', 'Dudin Sahidin', 'student', 'active', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO classes (id, name, program, grade_level, academic_year, teacher_id, status, created_at, updated_at) VALUES
  ('cls_paket_c_10', 'Paket C Kelas 10', 'Paket C', '10', '2026/2027', 'usr_teacher_adi', 'active', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO class_memberships (class_id, student_id, joined_at, status) VALUES
  ('cls_paket_c_10', 'usr_student_dudin', datetime('now'), 'active');

INSERT OR IGNORE INTO subjects (id, code, name, created_at, updated_at) VALUES
  ('sub_sej', 'SEJ', 'Sejarah Indonesia', datetime('now'), datetime('now')),
  ('sub_mat', 'MAT', 'Matematika', datetime('now'), datetime('now')),
  ('sub_ing', 'ING', 'Bahasa Inggris', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO class_subjects (id, class_id, subject_id, teacher_id, created_at, updated_at) VALUES
  ('cs_sej_10', 'cls_paket_c_10', 'sub_sej', 'usr_teacher_adi', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO materials (id, class_subject_id, title, summary, content, order_index, status, published_at, author_id, created_at, updated_at) VALUES
  ('mat_surabaya', 'cs_sej_10', 'Mempertahankan Kemerdekaan', 'Perjuangan fisik dan diplomasi Indonesia.', 'Pertempuran Surabaya menunjukkan keberanian, persatuan, dan pengorbanan rakyat.', 3, 'published', datetime('now'), 'usr_teacher_adi', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO material_progress (material_id, student_id, percent, last_position, completed_at, updated_at) VALUES
  ('mat_surabaya', 'usr_student_dudin', 68, 'halaman-12', NULL, datetime('now'));

INSERT OR IGNORE INTO assignments (id, class_subject_id, title, instructions, submission_type, due_at, allow_late, status, author_id, created_at, updated_at) VALUES
  ('asg_refleksi', 'cs_sej_10', 'Refleksi Pertempuran Surabaya', 'Tuliskan makna perjuangan bagi generasi muda.', 'text', '2026-09-22T13:00:00Z', 0, 'published', 'usr_teacher_adi', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO quizzes (id, class_subject_id, material_id, title, status, passing_score, author_id, created_at, updated_at) VALUES
  ('quiz_surabaya', 'cs_sej_10', 'mat_surabaya', 'Latihan Pertempuran Surabaya', 'published', 70, 'usr_teacher_adi', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO library_items (id, subject_id, title, author, description, content, page_count, status, created_at, updated_at) VALUES
  ('lib_kemerdekaan', 'sub_sej', 'Indonesia Mempertahankan Kemerdekaan', 'Tim Sejarah Nasional', 'Bahan pendamping sejarah kelas 10.', 'Konten pengembangan lokal.', 128, 'published', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO library_progress (library_item_id, student_id, percent, last_position, bookmarked, updated_at) VALUES
  ('lib_kemerdekaan', 'usr_student_dudin', 43, 'halaman-55', 1, datetime('now'));

PRAGMA optimize;
