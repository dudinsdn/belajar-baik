-- Forward-only. No historical rows are rewritten.
CREATE TRIGGER work_version_guard BEFORE INSERT ON submission_history
 WHEN json_extract(NEW.snapshot_json,'$.expectedVersion') IS NOT NULL AND
 json_extract(NEW.snapshot_json,'$.expectedVersion') <> COALESCE((SELECT version FROM submission_work WHERE submission_id=NEW.submission_id),-1)
 BEGIN SELECT RAISE(ABORT,'Work version conflict'); END;
CREATE TRIGGER work_history_update BEFORE UPDATE ON submission_history BEGIN SELECT RAISE(ABORT,'Work history is immutable'); END;
CREATE TRIGGER work_history_delete BEFORE DELETE ON submission_history BEGIN SELECT RAISE(ABORT,'Work history is immutable'); END;
CREATE TRIGGER work_file_update BEFORE UPDATE ON work_files BEGIN SELECT RAISE(ABORT,'Work evidence is immutable'); END;
CREATE TRIGGER work_file_delete BEFORE DELETE ON work_files BEGIN SELECT RAISE(ABORT,'Work evidence is immutable'); END;
CREATE TRIGGER work_rubric_update BEFORE UPDATE ON assignment_work WHEN (SELECT status FROM assignments WHERE id=OLD.assignment_id)<>'draft' BEGIN SELECT RAISE(ABORT,'Published rubric is immutable'); END;
CREATE TRIGGER work_rubric_delete BEFORE DELETE ON assignment_work WHEN (SELECT status FROM assignments WHERE id=OLD.assignment_id)<>'draft' BEGIN SELECT RAISE(ABORT,'Published rubric is immutable'); END;
CREATE TRIGGER work_assignment_update BEFORE UPDATE ON assignments WHEN OLD.status<>'draft' AND (NEW.title<>OLD.title OR NEW.instructions<>OLD.instructions OR NEW.class_subject_id<>OLD.class_subject_id OR NEW.submission_type<>OLD.submission_type) BEGIN SELECT RAISE(ABORT,'Published assignment is immutable'); END;
CREATE TRIGGER work_submission_created AFTER INSERT ON submissions BEGIN
 INSERT INTO submission_history VALUES(lower(hex(randomblob(16))),NEW.id,NEW.student_id,'created',json_object('answer',NEW.answer_text,'status',NEW.status,'score',NEW.score,'feedback',NEW.feedback),NEW.created_at);
 END;
CREATE TRIGGER work_submission_updated AFTER UPDATE ON submissions BEGIN
 INSERT INTO submission_history VALUES(lower(hex(randomblob(16))),OLD.id,COALESCE(OLD.graded_by,OLD.student_id),'previous_state',json_object('answer',OLD.answer_text,'status',OLD.status,'score',OLD.score,'feedback',OLD.feedback,'gradedBy',OLD.graded_by,'submittedAt',OLD.submitted_at),OLD.updated_at);
 INSERT INTO submission_history VALUES(lower(hex(randomblob(16))),NEW.id,CASE WHEN NEW.status='graded' OR (NEW.status='draft' AND OLD.status<>'draft') THEN NEW.graded_by ELSE NEW.student_id END,'state',json_object('answer',NEW.answer_text,'status',NEW.status,'score',NEW.score,'feedback',NEW.feedback,'gradedBy',NEW.graded_by,'submittedAt',NEW.submitted_at),NEW.updated_at);
 END;
CREATE TRIGGER work_legacy_draft_guard BEFORE UPDATE ON submissions WHEN EXISTS(SELECT 1 FROM assignment_work WHERE assignment_id=NEW.assignment_id) AND NOT EXISTS(SELECT 1 FROM submission_work WHERE submission_id=NEW.id) BEGIN SELECT RAISE(ABORT,'Managed work requires version'); END;
CREATE TRIGGER work_file_limit BEFORE INSERT ON work_files WHEN NEW.size<1 OR NEW.size>1048576 OR (SELECT COUNT(*) FROM work_files WHERE submission_id=NEW.submission_id)>=5 OR COALESCE((SELECT SUM(size) FROM work_files WHERE submission_id=NEW.submission_id),0)+NEW.size>3145728 BEGIN SELECT RAISE(ABORT,'Work file limit'); END;
