CREATE TRIGGER mentoring_events_no_update BEFORE UPDATE ON mentoring_events BEGIN SELECT RAISE(ABORT,'mentoring history is immutable'); END;
CREATE TRIGGER mentoring_events_no_delete BEFORE DELETE ON mentoring_events BEGIN SELECT RAISE(ABORT,'mentoring history is immutable'); END;
CREATE TRIGGER attendance_events_no_update BEFORE UPDATE ON attendance_events BEGIN SELECT RAISE(ABORT,'attendance history is immutable'); END;
CREATE TRIGGER attendance_events_no_delete BEFORE DELETE ON attendance_events BEGIN SELECT RAISE(ABORT,'attendance history is immutable'); END;
CREATE UNIQUE INDEX mentoring_resolve_once ON mentoring_events(parent_id) WHERE kind='resolve';
CREATE TRIGGER mentoring_events_validate BEFORE INSERT ON mentoring_events BEGIN
 SELECT CASE WHEN NEW.kind NOT IN ('note','remedial','enrichment','reminder','resolve') OR LENGTH(TRIM(NEW.detail))=0 OR LENGTH(NEW.detail)>2000 THEN RAISE(ABORT,'invalid mentoring event') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM class_subjects cs JOIN classes c ON c.id=cs.class_id JOIN class_memberships cm ON cm.class_id=cs.class_id JOIN users u ON u.id=cm.student_id JOIN users actor ON actor.id=cs.teacher_id WHERE cs.id=NEW.class_subject_id AND cs.teacher_id=NEW.actor_id AND actor.role='teacher' AND actor.status='active' AND c.status='active' AND cm.student_id=NEW.student_id AND cm.status='active' AND u.status='active' AND u.role='student') THEN RAISE(ABORT,'invalid mentoring access') END;
 SELECT CASE WHEN (NEW.kind='resolve' AND NOT EXISTS(SELECT 1 FROM mentoring_events p WHERE p.id=NEW.parent_id AND p.class_subject_id=NEW.class_subject_id AND p.student_id=NEW.student_id AND p.kind IN ('remedial','enrichment','reminder'))) OR (NEW.kind<>'resolve' AND NEW.parent_id IS NOT NULL) THEN RAISE(ABORT,'invalid follow-up') END;
END;
CREATE TRIGGER attendance_events_validate BEFORE INSERT ON attendance_events BEGIN
 SELECT CASE WHEN NEW.status NOT IN ('present','absent','excused') OR LENGTH(TRIM(NEW.reason))=0 OR LENGTH(NEW.reason)>2000 THEN RAISE(ABORT,'invalid attendance') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM learning_plans lp JOIN class_subjects cs ON cs.id=lp.class_subject_id JOIN classes c ON c.id=cs.class_id JOIN class_memberships cm ON cm.class_id=cs.class_id AND cm.student_id=lp.student_id JOIN users u ON u.id=lp.student_id JOIN users actor ON actor.id=cs.teacher_id WHERE lp.id=NEW.plan_id AND lp.mode IN ('tutorial','face_to_face') AND cs.teacher_id=NEW.actor_id AND actor.role='teacher' AND actor.status='active' AND c.status='active' AND cm.status='active' AND u.role='student' AND u.status='active') THEN RAISE(ABORT,'invalid attendance access') END;
END;
