import { env } from "cloudflare:workers";
import { ApiError } from "../api/error.ts";
import type { CurrentUser } from "../auth/types.ts";

type TeacherSubmission = {
  id: string;
  assignment_id: string;
  assignment_title: string;
  subject: string;
  student_id: string;
  student_name: string;
  answer_text: string;
  status: "submitted" | "graded";
  submitted_at: string;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
};

const teacherSubmissionSql = `SELECT sub.id, sub.assignment_id, a.title AS assignment_title, s.name AS subject,
  sub.student_id, student.display_name AS student_name, sub.answer_text, sub.status, sub.submitted_at,
  sub.score, sub.feedback, sub.graded_at
  FROM submissions sub JOIN assignments a ON a.id = sub.assignment_id
  JOIN class_subjects cs ON cs.id = a.class_subject_id JOIN subjects s ON s.id = cs.subject_id
  JOIN users student ON student.id = sub.student_id
  WHERE cs.teacher_id = ? AND sub.status IN ('submitted', 'graded')`;

export async function listTeacherSubmissions(
  user: CurrentUser,
  status?: string,
) {
  if (status && status !== "submitted" && status !== "graded") {
    throw new ApiError(
      "VALIDATION_ERROR",
      422,
      "Status penilaian tidak valid.",
      { status: "Gunakan submitted atau graded." },
    );
  }
  const filter = status ? " AND sub.status = ?" : "";
  const statement = env.DB.prepare(
    `${teacherSubmissionSql}${filter} ORDER BY sub.submitted_at ASC`,
  );
  const result = status
    ? await statement.bind(user.id, status).all<TeacherSubmission>()
    : await statement.bind(user.id).all<TeacherSubmission>();
  return result.results;
}

export async function gradeSubmission(
  user: CurrentUser,
  submissionId: string,
  score: number,
  feedback: string,
) {
  const submission = await env.DB.prepare(
    `${teacherSubmissionSql} AND sub.id = ? LIMIT 1`,
  )
    .bind(user.id, submissionId)
    .first<TeacherSubmission>();
  if (!submission)
    throw new ApiError("NOT_FOUND", 404, "Pengumpulan tidak ditemukan.");
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE submissions SET status = 'graded', score = ?, feedback = ?, graded_by = ?, graded_at = ?, updated_at = ?
    WHERE id = ? AND status IN ('submitted', 'graded')`,
  )
    .bind(score, feedback, user.id, now, now, submissionId)
    .run();
  return env.DB.prepare(`${teacherSubmissionSql} AND sub.id = ? LIMIT 1`)
    .bind(user.id, submissionId)
    .first<TeacherSubmission>();
}
