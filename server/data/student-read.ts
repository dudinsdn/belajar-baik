import { env } from "cloudflare:workers";
import type { CurrentUser } from "../auth/types.ts";

export async function getStudentProfile(user: CurrentUser) {
  const enrollment = await env.DB.prepare(
    `SELECT c.id AS class_id, c.name AS class_name, c.program, c.grade_level, c.academic_year
     FROM class_memberships cm JOIN classes c ON c.id = cm.class_id
     WHERE cm.student_id = ? AND cm.status = 'active' AND c.status = 'active' LIMIT 1`,
  )
    .bind(user.id)
    .first();
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    enrollment,
  };
}

export async function getStudentDashboard(user: CurrentUser) {
  const [continueMaterial, assignments, progress] = await Promise.all([
    env.DB.prepare(
      `SELECT m.id, m.title, s.name AS subject, mp.percent, mp.last_position
       FROM material_progress mp JOIN materials m ON m.id = mp.material_id
       JOIN class_subjects cs ON cs.id = m.class_subject_id JOIN subjects s ON s.id = cs.subject_id
       WHERE mp.student_id = ? AND m.status = 'published' ORDER BY mp.updated_at DESC LIMIT 1`,
    )
      .bind(user.id)
      .first(),
    env.DB.prepare(
      `SELECT a.id, a.title, a.due_at, s.name AS subject, COALESCE(sub.status, 'not_started') AS submission_status
       FROM class_memberships cm JOIN class_subjects cs ON cs.class_id = cm.class_id
       JOIN assignments a ON a.class_subject_id = cs.id JOIN subjects s ON s.id = cs.subject_id
       LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = cm.student_id
       WHERE cm.student_id = ? AND cm.status = 'active' AND a.status = 'published'
       ORDER BY a.due_at ASC LIMIT 5`,
    )
      .bind(user.id)
      .all(),
    env.DB.prepare(
      `SELECT COUNT(*) AS started, COALESCE(AVG(percent), 0) AS average_percent
       FROM material_progress WHERE student_id = ?`,
    )
      .bind(user.id)
      .first(),
  ]);
  return { continueMaterial, assignments: assignments.results, progress };
}

export async function listStudentMaterials(user: CurrentUser) {
  const result = await env.DB.prepare(
    `SELECT m.id, m.title, m.summary, m.order_index, s.code AS subject_code, s.name AS subject,
            COALESCE(mp.percent, 0) AS percent, mp.last_position, mp.completed_at
     FROM class_memberships cm JOIN class_subjects cs ON cs.class_id = cm.class_id
     JOIN materials m ON m.class_subject_id = cs.id JOIN subjects s ON s.id = cs.subject_id
     LEFT JOIN material_progress mp ON mp.material_id = m.id AND mp.student_id = cm.student_id
     WHERE cm.student_id = ? AND cm.status = 'active' AND m.status = 'published'
     ORDER BY s.name, m.order_index`,
  )
    .bind(user.id)
    .all();
  return result.results;
}

export async function listStudentLibrary(user: CurrentUser, query: string) {
  const pattern = `%${query.trim()}%`;
  const result = await env.DB.prepare(
    `SELECT li.id, li.title, li.author, li.description, li.page_count, s.code AS subject_code, s.name AS subject,
            COALESCE(lp.percent, 0) AS percent, COALESCE(lp.bookmarked, 0) AS bookmarked, lp.last_position
     FROM library_items li LEFT JOIN subjects s ON s.id = li.subject_id
     LEFT JOIN library_progress lp ON lp.library_item_id = li.id AND lp.student_id = ?
     WHERE li.status = 'published' AND (li.title LIKE ? OR li.author LIKE ?)
     ORDER BY li.title LIMIT 50`,
  )
    .bind(user.id, pattern, pattern)
    .all();
  return result.results;
}
