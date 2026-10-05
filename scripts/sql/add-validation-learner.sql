-- LOCAL ONLY: explicitly labelled comparison account. No curriculum,
-- submissions, quiz attempts, grades, or progress are copied from other users.
PRAGMA foreign_keys = ON;

INSERT INTO users
  (id, external_identity_id, email, display_name, role, status, created_at, updated_at)
VALUES
  ('usr_student_uji_baru', 'dev:student:uji-baru', 'warga.baru@ruangtumbuh.local',
   'Warga Belajar Baru (UJI)', 'student', 'active', datetime('now'), datetime('now'));

INSERT INTO class_memberships (class_id, student_id, joined_at, status)
VALUES ('cls_paket_c_10', 'usr_student_uji_baru', datetime('now'), 'active');
