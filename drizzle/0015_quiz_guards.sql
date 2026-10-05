-- Keep legacy attempts; guards apply to future writes without rewriting history.
CREATE TRIGGER quiz_attempt_limit BEFORE INSERT ON quiz_attempts
WHEN (SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id=NEW.quiz_id AND student_id=NEW.student_id)>=(SELECT max_attempts FROM quizzes WHERE id=NEW.quiz_id)
BEGIN SELECT RAISE(ABORT,'quiz attempt limit reached'); END;
--> statement-breakpoint
CREATE TRIGGER quiz_attempt_active BEFORE INSERT ON quiz_attempts
WHEN EXISTS(SELECT 1 FROM quiz_attempts WHERE quiz_id=NEW.quiz_id AND student_id=NEW.student_id AND status='active')
BEGIN SELECT RAISE(ABORT,'quiz has an active attempt'); END;
--> statement-breakpoint
CREATE TRIGGER quiz_published_guard BEFORE UPDATE OF title,class_subject_id,material_id,passing_score,purpose,max_attempts ON quizzes WHEN OLD.status='published'
BEGIN SELECT RAISE(ABORT,'published quiz is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER quiz_no_unpublish BEFORE UPDATE OF status ON quizzes WHEN OLD.status='published' AND NEW.status='draft'
BEGIN SELECT RAISE(ABORT,'published quiz cannot become draft'); END;
--> statement-breakpoint
CREATE TRIGGER quiz_question_insert BEFORE INSERT ON quiz_questions WHEN (SELECT status FROM quizzes WHERE id=NEW.quiz_id)<>'draft'
BEGIN SELECT RAISE(ABORT,'quiz requires draft'); END;
--> statement-breakpoint
CREATE TRIGGER quiz_question_update BEFORE UPDATE ON quiz_questions WHEN (SELECT status FROM quizzes WHERE id=OLD.quiz_id)<>'draft' OR (SELECT status FROM quizzes WHERE id=NEW.quiz_id)<>'draft'
BEGIN SELECT RAISE(ABORT,'published question is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER quiz_question_delete BEFORE DELETE ON quiz_questions WHEN (SELECT status FROM quizzes WHERE id=OLD.quiz_id)<>'draft'
BEGIN SELECT RAISE(ABORT,'published question is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER quiz_option_insert BEFORE INSERT ON quiz_options WHEN (SELECT z.status FROM quizzes z JOIN quiz_questions q ON q.quiz_id=z.id WHERE q.id=NEW.question_id)<>'draft'
BEGIN SELECT RAISE(ABORT,'quiz requires draft'); END;
--> statement-breakpoint
CREATE TRIGGER quiz_option_update BEFORE UPDATE ON quiz_options WHEN (SELECT z.status FROM quizzes z JOIN quiz_questions q ON q.quiz_id=z.id WHERE q.id=OLD.question_id)<>'draft' OR (SELECT z.status FROM quizzes z JOIN quiz_questions q ON q.quiz_id=z.id WHERE q.id=NEW.question_id)<>'draft'
BEGIN SELECT RAISE(ABORT,'published option is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER quiz_option_delete BEFORE DELETE ON quiz_options WHEN (SELECT z.status FROM quizzes z JOIN quiz_questions q ON q.quiz_id=z.id WHERE q.id=OLD.question_id)<>'draft'
BEGIN SELECT RAISE(ABORT,'published option is immutable'); END;
--> statement-breakpoint
CREATE INDEX quiz_responses_question_idx ON quiz_responses(question_id);
