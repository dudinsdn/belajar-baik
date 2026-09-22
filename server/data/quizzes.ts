import { env } from "cloudflare:workers";
import { ApiError } from "../api/error.ts";
import type { CurrentUser } from "../auth/types.ts";

type QuizRow = {
  id: string;
  title: string;
  passing_score: number;
  subject: string;
  material_id: string | null;
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
  const quiz = await env.DB.prepare(
    `SELECT q.id, q.title, q.passing_score, q.material_id, s.name AS subject
    FROM class_memberships cm JOIN class_subjects cs ON cs.class_id = cm.class_id
    JOIN quizzes q ON q.class_subject_id = cs.id JOIN subjects s ON s.id = cs.subject_id
    WHERE cm.student_id = ? AND cm.status = 'active' AND q.id = ? AND q.status = 'published' LIMIT 1`,
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
      "SELECT id, prompt, order_index FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index",
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

export async function startQuizAttempt(user: CurrentUser, quizId: string) {
  await accessibleQuiz(user, quizId);
  const existing = await env.DB.prepare(
    `SELECT id, quiz_id, student_id, status, score, started_at, completed_at
    FROM quiz_attempts WHERE quiz_id = ? AND student_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
  )
    .bind(quizId, user.id)
    .first<AttemptRow>();
  if (existing) return existing;
  const attempt: AttemptRow = {
    id: crypto.randomUUID(),
    quiz_id: quizId,
    student_id: user.id,
    status: "active",
    score: null,
    started_at: new Date().toISOString(),
    completed_at: null,
  };
  await env.DB.prepare(
    `INSERT INTO quiz_attempts (id, quiz_id, student_id, status, score, started_at, completed_at)
    VALUES (?, ?, ?, 'active', NULL, ?, NULL)`,
  )
    .bind(attempt.id, quizId, user.id, attempt.started_at)
    .run();
  return attempt;
}

async function ownAttempt(user: CurrentUser, attemptId: string) {
  const attempt = await env.DB.prepare(
    `SELECT id, quiz_id, student_id, status, score, started_at, completed_at
    FROM quiz_attempts WHERE id = ? AND student_id = ? LIMIT 1`,
  )
    .bind(attemptId, user.id)
    .first<AttemptRow>();
  if (!attempt)
    throw new ApiError("NOT_FOUND", 404, "Percobaan kuis tidak ditemukan.");
  return attempt;
}

export async function saveQuizAnswer(
  user: CurrentUser,
  attemptId: string,
  questionId: string,
  selectedOptionId: unknown,
) {
  if (typeof selectedOptionId !== "string" || !selectedOptionId)
    throw new ApiError(
      "VALIDATION_ERROR",
      422,
      "Pilihan jawaban wajib diisi.",
      { selectedOptionId: "Pilih salah satu opsi." },
    );
  const attempt = await ownAttempt(user, attemptId);
  if (attempt.status !== "active")
    throw new ApiError("CONFLICT", 409, "Percobaan kuis sudah selesai.");
  const option = await env.DB.prepare(
    `SELECT qo.id, qo.is_correct FROM quiz_options qo JOIN quiz_questions qq ON qq.id = qo.question_id
    WHERE qo.id = ? AND qq.id = ? AND qq.quiz_id = ? LIMIT 1`,
  )
    .bind(selectedOptionId, questionId, attempt.quiz_id)
    .first<{ id: string; is_correct: number }>();
  if (!option)
    throw new ApiError(
      "VALIDATION_ERROR",
      422,
      "Pilihan tidak termasuk dalam soal ini.",
      { selectedOptionId: "Pilihan tidak valid." },
    );
  await env.DB.prepare(
    `INSERT INTO quiz_answers (attempt_id, question_id, selected_option_id, is_correct) VALUES (?, ?, ?, ?)
    ON CONFLICT(attempt_id, question_id) DO UPDATE SET selected_option_id = excluded.selected_option_id, is_correct = excluded.is_correct`,
  )
    .bind(attemptId, questionId, selectedOptionId, option.is_correct)
    .run();
  return { attemptId, questionId, selectedOptionId };
}

export async function submitQuizAttempt(user: CurrentUser, attemptId: string) {
  const attempt = await ownAttempt(user, attemptId);
  if (attempt.status === "completed") return attempt;
  const counts = await env.DB.prepare(
    `SELECT COUNT(qq.id) AS total,
    SUM(CASE WHEN qa.is_correct = 1 THEN 1 ELSE 0 END) AS correct,
    SUM(CASE WHEN qa.question_id IS NOT NULL THEN 1 ELSE 0 END) AS answered
    FROM quiz_questions qq LEFT JOIN quiz_answers qa ON qa.question_id = qq.id AND qa.attempt_id = ? WHERE qq.quiz_id = ?`,
  )
    .bind(attemptId, attempt.quiz_id)
    .first<{ total: number; correct: number; answered: number }>();
  if (!counts || counts.answered < counts.total)
    throw new ApiError(
      "VALIDATION_ERROR",
      422,
      "Semua soal harus dijawab sebelum kuis dikirim.",
    );
  const score = counts.total
    ? Math.round((counts.correct / counts.total) * 100)
    : 0;
  const completedAt = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE quiz_attempts SET status = 'completed', score = ?, completed_at = ?
    WHERE id = ? AND student_id = ? AND status = 'active'`,
  )
    .bind(score, completedAt, attemptId, user.id)
    .run();
  return ownAttempt(user, attemptId);
}

export async function getQuizResult(user: CurrentUser, attemptId: string) {
  const attempt = await ownAttempt(user, attemptId);
  if (attempt.status !== "completed")
    throw new ApiError("CONFLICT", 409, "Kuis belum selesai.");
  const quiz = await accessibleQuiz(user, attempt.quiz_id);
  const answers = await env.DB.prepare(
    `SELECT qq.id AS question_id, qq.prompt, qq.explanation, qa.selected_option_id,
    qa.is_correct, correct.id AS correct_option_id, correct.label AS correct_option_label
    FROM quiz_questions qq JOIN quiz_answers qa ON qa.question_id = qq.id AND qa.attempt_id = ?
    JOIN quiz_options correct ON correct.question_id = qq.id AND correct.is_correct = 1
    WHERE qq.quiz_id = ? ORDER BY qq.order_index`,
  )
    .bind(attemptId, attempt.quiz_id)
    .all();
  return {
    attempt,
    passingScore: quiz.passing_score,
    passed: (attempt.score ?? 0) >= quiz.passing_score,
    answers: answers.results,
  };
}
