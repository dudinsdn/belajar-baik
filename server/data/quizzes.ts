import { env } from "cloudflare:workers";
import { ApiError } from "../api/error.ts";
import type { CurrentUser } from "../auth/types.ts";
import { requireRole } from "../auth/index.ts";
import { evaluate } from "./quiz-validation.ts";
import { competencyAccess } from "./competency-access.ts";

function quizAccess(student: string) {
  return `${competencyAccess("quiz", "q", student)} AND NOT EXISTS(
   SELECT 1 FROM quiz_basic_competencies link JOIN basic_competencies bc ON bc.id=link.basic_competency_id
   JOIN core_competencies ki ON ki.id=bc.core_competency_id WHERE link.quiz_id=q.id AND
   NOT EXISTS(SELECT 1 FROM curriculum_assignments ca WHERE ca.student_id=${student} AND ca.class_id=cs.class_id AND ca.competency_package_id=ki.competency_package_id AND ca.status='active' AND bc.subject_id=cs.subject_id))`;
}

type QuizRow = {
  id: string;
  title: string;
  passing_score: number;
  subject: string;
  material_id: string | null;
  purpose: string;
  max_attempts: number;
};
type AttemptRow = {
  id: string;
  quiz_id: string;
  student_id: string;
  status: "active" | "completed";
  score: number | null;
  started_at: string;
  completed_at: string | null;
};

async function accessibleQuiz(user: CurrentUser, quizId: string) {
  requireRole(user, "student");
  const quiz = await env.DB.prepare(
    `SELECT q.id, q.title, q.passing_score, q.material_id, q.purpose, q.max_attempts, s.name AS subject
    FROM class_memberships cm JOIN class_subjects cs ON cs.class_id = cm.class_id
    JOIN quizzes q ON q.class_subject_id = cs.id JOIN subjects s ON s.id = cs.subject_id
    WHERE cm.student_id = ? AND cm.status = 'active' AND EXISTS(SELECT 1 FROM classes c WHERE c.id=cs.class_id AND c.status='active') AND q.id = ? AND q.status = 'published' AND ${quizAccess("cm.student_id")} LIMIT 1`,
  )
    .bind(user.id, quizId)
    .first<QuizRow>();
  if (!quiz) throw new ApiError("NOT_FOUND", 404, "Kuis tidak ditemukan.");
  return quiz;
}

export async function getStudentQuiz(user: CurrentUser, quizId: string) {
  const quiz = await accessibleQuiz(user, quizId);
  const [questions, options] = await Promise.all([
    env.DB.prepare(
      "SELECT id, prompt, order_index, kind, difficulty, competency_id FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index",
    )
      .bind(quizId)
      .all(),
    env.DB.prepare(
      `SELECT qo.id, qo.question_id, qo.label, qo.order_index FROM quiz_options qo
      JOIN quiz_questions qq ON qq.id = qo.question_id WHERE qq.quiz_id = ? ORDER BY qq.order_index, qo.order_index`,
    )
      .bind(quizId)
      .all(),
  ]);
  return {
    ...quiz,
    questions: questions.results.map((question) => ({
      ...question,
      options: options.results.filter(
        (option) => option.question_id === question.id,
      ),
    })),
  };
}

export async function getFirstStudentQuiz(user: CurrentUser) {
  requireRole(user, "student");
  const quiz = await env.DB.prepare(
    `SELECT q.id FROM class_memberships cm
    JOIN class_subjects cs ON cs.class_id = cm.class_id
    JOIN quizzes q ON q.class_subject_id = cs.id
    WHERE cm.student_id = ? AND cm.status = 'active' AND EXISTS(SELECT 1 FROM classes c WHERE c.id=cs.class_id AND c.status='active') AND q.status = 'published'
    AND ${quizAccess("cm.student_id")}
    ORDER BY q.created_at, q.id LIMIT 1`,
  )
    .bind(user.id)
    .first<{ id: string }>();
  return quiz ? getStudentQuiz(user, quiz.id) : null;
}

export async function startQuizAttempt(user: CurrentUser, quizId: string) {
  const quiz = await accessibleQuiz(user, quizId);
  const existing = await env.DB.prepare(
    `SELECT id, quiz_id, student_id, status, score, started_at, completed_at
    FROM quiz_attempts WHERE quiz_id = ? AND student_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
  )
    .bind(quizId, user.id)
    .first<AttemptRow>();
  if (existing)
    return { ...existing, answers: await attemptAnswers(existing.id) };
  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM quiz_attempts WHERE quiz_id=? AND student_id=?",
  )
    .bind(quizId, user.id)
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= quiz.max_attempts)
    throw new ApiError(
      "CONFLICT",
      409,
      "Batas percobaan tercapai. Hubungi tutor untuk tindak lanjut.",
    );
  const attempt: AttemptRow = {
    id: crypto.randomUUID(),
    quiz_id: quizId,
    student_id: user.id,
    status: "active",
    score: null,
    started_at: new Date().toISOString(),
    completed_at: null,
  };
  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO quiz_attempts (id,quiz_id,student_id,status,score,started_at,completed_at) VALUES(?,?,?,'active',NULL,?,NULL)`,
      ).bind(attempt.id, quizId, user.id, attempt.started_at),
      env.DB.prepare(
        "INSERT INTO quiz_events(id,attempt_id,quiz_id,actor_id,action,created_at) VALUES(?,?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        attempt.id,
        quizId,
        user.id,
        "start",
        attempt.started_at,
      ),
    ]);
  } catch (error) {
    const raced = await env.DB.prepare(
      "SELECT * FROM quiz_attempts WHERE quiz_id=? AND student_id=? AND status='active' ORDER BY started_at DESC LIMIT 1",
    )
      .bind(quizId, user.id)
      .first<AttemptRow>();
    if (raced) return { ...raced, answers: await attemptAnswers(raced.id) };
    const latest = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM quiz_attempts WHERE quiz_id=? AND student_id=?",
    )
      .bind(quizId, user.id)
      .first<{ n: number }>();
    if ((latest?.n ?? 0) >= quiz.max_attempts)
      throw new ApiError("CONFLICT", 409, "Batas percobaan tercapai.");
    throw error;
  }
  return { ...attempt, answers: [] };
}

async function ownAttempt(user: CurrentUser, attemptId: string) {
  requireRole(user, "student");
  const attempt = await env.DB.prepare(
    `SELECT id, quiz_id, student_id, status, score, started_at, completed_at
    FROM quiz_attempts WHERE id = ? AND student_id = ? LIMIT 1`,
  )
    .bind(attemptId, user.id)
    .first<AttemptRow>();
  if (!attempt)
    throw new ApiError("NOT_FOUND", 404, "Percobaan kuis tidak ditemukan.");
  await accessibleQuiz(user, attempt.quiz_id);
  return attempt;
}

export async function saveQuizAnswer(
  user: CurrentUser,
  attemptId: string,
  questionId: string,
  selectedOptionId: unknown,
) {
  const attempt = await ownAttempt(user, attemptId);
  if (attempt.status !== "active")
    throw new ApiError("CONFLICT", 409, "Percobaan sudah selesai.");
  const q = await env.DB.prepare(
    "SELECT kind,accepted_answer FROM quiz_questions WHERE id=? AND quiz_id=?",
  )
    .bind(questionId, attempt.quiz_id)
    .first<{ kind: string; accepted_answer: string | null }>();
  if (!q) throw new ApiError("NOT_FOUND", 404, "Soal tidak ditemukan.");
  const options = await env.DB.prepare(
    "SELECT id,is_correct FROM quiz_options WHERE question_id=?",
  )
    .bind(questionId)
    .all<{ id: string; is_correct: number }>();
  const checked = evaluate(
    q.kind,
    selectedOptionId,
    options.results,
    q.accepted_answer,
  );
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO quiz_responses(attempt_id,question_id,answer_json,credit,updated_at)
      SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM quiz_attempts WHERE id=? AND status='active')
      ON CONFLICT(attempt_id,question_id) DO UPDATE SET answer_json=excluded.answer_json,credit=excluded.credit,updated_at=excluded.updated_at
      WHERE EXISTS(SELECT 1 FROM quiz_attempts WHERE id=? AND status='active')`,
    ).bind(
      attemptId,
      questionId,
      JSON.stringify(checked.answer),
      checked.credit,
      now,
      attemptId,
      attemptId,
    ),
    env.DB.prepare(
      "INSERT INTO quiz_events(id,attempt_id,quiz_id,actor_id,action,created_at) VALUES(?,?,?,?,?,?)",
    ).bind(
      crypto.randomUUID(),
      attemptId,
      attempt.quiz_id,
      user.id,
      "answer",
      now,
    ),
  ]);
  if ((await ownAttempt(user, attemptId)).status !== "active")
    throw new ApiError(
      "CONFLICT",
      409,
      "Percobaan sudah dikirim. Muat ulang hasil.",
    );
  return { attemptId, questionId, selectedOptionId: checked.answer };
}

export async function attemptAnswers(attemptId: string) {
  const rows = await env.DB.prepare(
    `SELECT question_id,answer_json FROM quiz_responses WHERE attempt_id=?
    UNION ALL SELECT question_id,json_quote(selected_option_id) AS answer_json FROM quiz_answers WHERE attempt_id=? AND question_id NOT IN (SELECT question_id FROM quiz_responses WHERE attempt_id=?)`,
  )
    .bind(attemptId, attemptId, attemptId)
    .all<{ question_id: string; answer_json: string }>();
  return rows.results.map((r) => ({
    question_id: r.question_id,
    answer: JSON.parse(r.answer_json),
  }));
}

export async function submitQuizAttempt(user: CurrentUser, attemptId: string) {
  const attempt = await ownAttempt(user, attemptId);
  if (attempt.status === "completed") return attempt;
  const counts = await env.DB.prepare(
    `SELECT COUNT(q.id) AS total,COUNT(COALESCE(r.question_id,a.question_id)) AS answered,
    SUM(CASE WHEN r.question_id IS NOT NULL THEN COALESCE(r.credit,0) ELSE COALESCE(a.is_correct,0) END) AS correct,
    SUM(CASE WHEN r.question_id IS NOT NULL AND r.credit IS NULL THEN 1 ELSE 0 END) AS pending
    FROM quiz_questions q LEFT JOIN quiz_responses r ON r.question_id=q.id AND r.attempt_id=?
    LEFT JOIN quiz_answers a ON a.question_id=q.id AND a.attempt_id=? WHERE q.quiz_id=?`,
  )
    .bind(attemptId, attemptId, attempt.quiz_id)
    .first<{
      total: number;
      answered: number;
      correct: number;
      pending: number;
    }>();
  if (!counts || !counts.total || counts.answered !== counts.total)
    throw new ApiError(
      "VALIDATION_ERROR",
      422,
      "Semua soal harus dijawab sebelum dikirim.",
    );
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO quiz_events(id,attempt_id,quiz_id,actor_id,action,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM quiz_attempts WHERE id=? AND status='active')",
    ).bind(
      crypto.randomUUID(),
      attemptId,
      attempt.quiz_id,
      user.id,
      "submit",
      now,
      attemptId,
    ),
    env.DB.prepare(
      `UPDATE quiz_attempts SET status='completed',score=(
      SELECT CASE WHEN SUM(CASE WHEN r.question_id IS NOT NULL AND r.credit IS NULL THEN 1 ELSE 0 END)>0 THEN NULL
      ELSE ROUND(100.0*SUM(CASE WHEN r.question_id IS NOT NULL THEN COALESCE(r.credit,0) ELSE COALESCE(a.is_correct,0) END)/COUNT(q.id)) END
      FROM quiz_questions q LEFT JOIN quiz_responses r ON r.question_id=q.id AND r.attempt_id=quiz_attempts.id
      LEFT JOIN quiz_answers a ON a.question_id=q.id AND a.attempt_id=quiz_attempts.id WHERE q.quiz_id=quiz_attempts.quiz_id
    ),completed_at=? WHERE id=? AND status='active'`,
    ).bind(now, attemptId),
  ]);
  return ownAttempt(user, attemptId);
}

export async function getQuizResult(user: CurrentUser, attemptId: string) {
  const attempt = await ownAttempt(user, attemptId);
  if (attempt.status !== "completed")
    throw new ApiError("CONFLICT", 409, "Kuis belum selesai.");
  const quiz = await accessibleQuiz(user, attempt.quiz_id);
  const questions = await env.DB.prepare(
    `SELECT q.id AS question_id,q.prompt,q.kind,q.explanation,q.accepted_answer,q.review_section_id,q.competency_id,
    COALESCE(r.answer_json,json_quote(a.selected_option_id)) AS answer_json,
    CASE WHEN r.question_id IS NOT NULL THEN r.credit ELSE a.is_correct END AS is_correct,r.feedback,
    (SELECT group_concat(o.label, ' / ') FROM quiz_options o WHERE o.question_id=q.id AND o.is_correct=1) AS correct_option_label
    FROM quiz_questions q LEFT JOIN quiz_responses r ON r.question_id=q.id AND r.attempt_id=? LEFT JOIN quiz_answers a ON a.question_id=q.id AND a.attempt_id=? WHERE q.quiz_id=? ORDER BY q.order_index`,
  )
    .bind(attemptId, attemptId, attempt.quiz_id)
    .all();
  return {
    attempt,
    passingScore: quiz.passing_score,
    passed: attempt.score === null ? null : attempt.score >= quiz.passing_score,
    materialId: quiz.material_id,
    answers: questions.results.map((q) => ({
      ...q,
      correct_option_label:
        q.accepted_answer ?? q.correct_option_label ?? "Dinilai tutor",
    })),
  };
}

export async function quizHistory(user: CurrentUser, quizId: string) {
  await accessibleQuiz(user, quizId);
  return (
    await env.DB.prepare(
      "SELECT id,status,score,started_at,completed_at FROM quiz_attempts WHERE quiz_id=? AND student_id=? ORDER BY started_at DESC,id",
    )
      .bind(quizId, user.id)
      .all()
  ).results;
}
export async function listStudentQuizzes(user: CurrentUser) {
  requireRole(user, "student");
  return (
    await env.DB.prepare(
      `SELECT q.id,q.title,q.purpose,s.name AS subject FROM quizzes q JOIN class_subjects cs ON cs.id=q.class_subject_id JOIN subjects s ON s.id=cs.subject_id JOIN classes c ON c.id=cs.class_id WHERE c.status='active' AND q.status='published' AND EXISTS(SELECT 1 FROM class_memberships cm WHERE cm.class_id=cs.class_id AND cm.student_id=? AND cm.status='active') AND ${quizAccess("?2")} ORDER BY q.created_at DESC,q.id`,
    )
      .bind(user.id, user.id)
      .all()
  ).results;
}
