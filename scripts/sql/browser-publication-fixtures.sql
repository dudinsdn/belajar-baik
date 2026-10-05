-- Local labelled fixtures for Stage 1 browser publication validation.
-- Run once against local D1; existing records are preserved on repetition.
INSERT OR IGNORE INTO materials(id,class_subject_id,title,summary,content,order_index,status,author_id,created_at,updated_at)
VALUES('mat_browser_stage1','cs_sej_10','UJI BROWSER Tahap 1 materi','Data uji lokal','Data uji lokal',99,'draft','usr_teacher_adi',datetime('now'),datetime('now'));
INSERT OR IGNORE INTO assignments(id,class_subject_id,title,instructions,submission_type,due_at,allow_late,status,author_id,created_at,updated_at)
VALUES('asg_browser_stage1','cs_sej_10','UJI BROWSER Tahap 1 asesmen','Data uji lokal','text','2026-12-31T00:00:00Z',0,'draft','usr_teacher_adi',datetime('now'),datetime('now'));
