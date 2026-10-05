import { env } from "cloudflare:workers";
import type { CurrentUser } from "../auth/types.ts";
import { readLearningPlans } from "./learning-plans.ts";
import { listStudentAssignments } from "./assignments.ts";
import { competencyAccess } from "./competency-access.ts";

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
  const [materials, tasks, planData, skk, feedback, assessment] =
    await Promise.all([
      listStudentMaterials(user),
      listStudentAssignments(user),
      readLearningPlans(user),
      env.DB.prepare(
        `SELECT COALESCE(SUM(a.planned_skk),0) AS planned FROM curriculum_assignments ca
      JOIN class_memberships cm ON cm.class_id=ca.class_id AND cm.student_id=ca.student_id
      JOIN classes c ON c.id=ca.class_id JOIN subject_skk_allocations a ON a.competency_package_id=ca.competency_package_id
      WHERE ca.student_id=? AND ca.status='active' AND cm.status='active' AND c.status='active'`,
      )
        .bind(user.id)
        .first(),
      env.DB.prepare(
        `SELECT sub.id, a.title, sub.feedback FROM submissions sub JOIN assignments a ON a.id=sub.assignment_id
      JOIN class_subjects cs ON cs.id=a.class_subject_id JOIN classes c ON c.id=cs.class_id
      JOIN class_memberships cm ON cm.class_id=cs.class_id AND cm.student_id=sub.student_id
      WHERE sub.student_id=? AND cm.status='active' AND c.status='active' AND a.status='published'
      AND sub.status='graded' AND LENGTH(TRIM(sub.feedback))>0 AND sub.graded_at IS NOT NULL
      AND ${competencyAccess("assignment", "a", "sub.student_id")}
      AND NOT EXISTS(SELECT 1 FROM feedback_acknowledgments fa WHERE fa.submission_id=sub.id AND fa.graded_at=sub.graded_at)
      ORDER BY sub.graded_at DESC`,
      )
        .bind(user.id)
        .all(),
      env.DB.prepare(
        `SELECT q.id,q.title FROM quizzes q JOIN class_subjects cs ON cs.id=q.class_subject_id
      JOIN class_memberships cm ON cm.class_id=cs.class_id JOIN classes c ON c.id=cs.class_id
      WHERE cm.student_id=? AND cm.status='active' AND c.status='active' AND q.status='published'
      AND ${competencyAccess("quiz", "q", "cm.student_id")} ORDER BY q.created_at,q.id LIMIT 1`,
      )
        .bind(user.id)
        .first(),
    ]);
  const visible = materials as Array<{
    id: string;
    title: string;
    subject: string;
    percent: number;
    last_position: string | null;
    updated_at: string | null;
  }>;
  const unfinished = visible.filter((m) => m.percent < 100);
  const current =
    unfinished
      .filter((m) => m.updated_at)
      .sort((a, b) =>
        String(b.updated_at).localeCompare(String(a.updated_at)),
      )[0] ??
    unfinished[0] ??
    null;
  return {
    continueMaterial: current,
    assignments: tasks.filter((t) =>
      ["not_started", "draft"].includes(t.submission_status),
    ),
    progress: {
      started: visible.filter((m) => m.updated_at).length,
      average_percent: visible.length
        ? visible.reduce((s, m) => s + m.percent, 0) / visible.length
        : 0,
    },
    plans: planData.plans,
    nextPlan:
      planData.plans.find((p) =>
        p.mode === "independent"
          ? Number(p.percent ?? 0) < 100
          : Date.parse(String(p.due_at)) >= Date.now(),
      ) ?? null,
    skk,
    feedback: feedback.results,
    assessment,
  };
}

export async function listStudentMaterials(user: CurrentUser) {
  const result = await env.DB.prepare(
    `SELECT m.id, m.title, m.summary, m.order_index, s.code AS subject_code, s.name AS subject,
            COALESCE(mp.percent, 0) AS percent, mp.last_position, mp.completed_at, mp.updated_at
     FROM class_memberships cm JOIN class_subjects cs ON cs.class_id = cm.class_id JOIN classes c ON c.id=cs.class_id
     JOIN materials m ON m.class_subject_id = cs.id JOIN subjects s ON s.id = cs.subject_id
     LEFT JOIN material_progress mp ON mp.material_id = m.id AND mp.student_id = cm.student_id
     WHERE cm.student_id = ? AND cm.status = 'active' AND c.status='active' AND m.status = 'published'
     AND ${competencyAccess("material", "m", "cm.student_id")}
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
