import { env } from 'cloudflare:workers';
import { ApiError } from '../api/error.ts';
import type { CurrentUser } from '../auth/types.ts';

type AssignmentRow = {
  id:string; title:string; instructions:string; submission_type:string; due_at:string;
  allow_late:number; subject:string; submission_id:string | null; answer_text:string | null;
  submission_status:string; submitted_at:string | null; score:number | null; feedback:string | null;
};

const assignmentSql = `SELECT a.id, a.title, a.instructions, a.submission_type, a.due_at, a.allow_late,
  s.name AS subject, sub.id AS submission_id, sub.answer_text, COALESCE(sub.status, 'not_started') AS submission_status,
  sub.submitted_at, sub.score, sub.feedback
  FROM class_memberships cm JOIN class_subjects cs ON cs.class_id = cm.class_id
  JOIN assignments a ON a.class_subject_id = cs.id JOIN subjects s ON s.id = cs.subject_id
  LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = cm.student_id
  WHERE cm.student_id = ? AND cm.status = 'active' AND a.status = 'published'`;

export async function listStudentAssignments(user: CurrentUser, status?: string) {
  const valid = new Set(['not_started','draft','submitted','graded']);
  if (status && !valid.has(status)) throw new ApiError('VALIDATION_ERROR', 422, 'Status tugas tidak valid.', { status:'Gunakan not_started, draft, submitted, atau graded.' });
  const filter = status ? ' AND COALESCE(sub.status, \'not_started\') = ?' : '';
  const statement = env.DB.prepare(`${assignmentSql}${filter} ORDER BY a.due_at ASC`);
  const result = status ? await statement.bind(user.id, status).all<AssignmentRow>() : await statement.bind(user.id).all<AssignmentRow>();
  return result.results;
}

export async function getStudentAssignment(user: CurrentUser, assignmentId: string) {
  const row = await env.DB.prepare(`${assignmentSql} AND a.id = ? LIMIT 1`).bind(user.id, assignmentId).first<AssignmentRow>();
  if (!row) throw new ApiError('NOT_FOUND', 404, 'Tugas tidak ditemukan.');
  return row;
}

export async function saveAssignmentDraft(user: CurrentUser, assignmentId: string, answerText: string) {
  const assignment = await getStudentAssignment(user, assignmentId);
  if (assignment.submission_status === 'graded') throw new ApiError('CONFLICT', 409, 'Tugas yang sudah dinilai tidak dapat diubah.');
  if (assignment.submission_status === 'submitted') throw new ApiError('CONFLICT', 409, 'Tugas yang sudah dikirim tidak dapat diubah.');
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO submissions
    (id, assignment_id, student_id, answer_text, status, submitted_at, score, feedback, graded_by, graded_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'draft', NULL, NULL, NULL, NULL, NULL, ?, ?)
    ON CONFLICT(assignment_id, student_id) DO UPDATE SET answer_text = excluded.answer_text, updated_at = excluded.updated_at
    WHERE submissions.status = 'draft'`).bind(crypto.randomUUID(), assignmentId, user.id, answerText, now, now).run();
  return getStudentAssignment(user, assignmentId);
}

export async function submitAssignment(user: CurrentUser, assignmentId: string) {
  const assignment = await getStudentAssignment(user, assignmentId);
  if (assignment.submission_status === 'submitted' || assignment.submission_status === 'graded') return assignment;
  if (!assignment.answer_text?.trim()) throw new ApiError('VALIDATION_ERROR', 422, 'Jawaban wajib diisi sebelum tugas dikirim.', { answerText:'Simpan jawaban terlebih dahulu.' });
  const now = new Date();
  if (!assignment.allow_late && now > new Date(assignment.due_at)) throw new ApiError('CONFLICT', 409, 'Batas waktu pengumpulan tugas telah lewat.');
  const isoNow = now.toISOString();
  await env.DB.prepare(`UPDATE submissions SET status = 'submitted', submitted_at = ?, updated_at = ?
    WHERE assignment_id = ? AND student_id = ? AND status = 'draft'`).bind(isoNow, isoNow, assignmentId, user.id).run();
  return getStudentAssignment(user, assignmentId);
}
