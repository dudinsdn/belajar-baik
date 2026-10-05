import { competencyAccess } from "./competency-access.ts";
import { env } from "cloudflare:workers";
import { AuthError } from "../auth/errors.ts";
import { ApiError } from "../api/error.ts";
import { requireRole } from "../auth/index.ts";
import type { CurrentUser } from "../auth/types.ts";
export type Row = Record<string, string | number | null>;
export async function rows(sql: string, ...args: (string | number | null)[]) {
  return (
    await env.DB.prepare(sql)
      .bind(...args)
      .all<Row>()
  ).results;
}
export async function workAssignment(user: CurrentUser, id: string) {
  requireRole(user, "student");
  const a = await env.DB.prepare(
    `SELECT a.*,COALESCE(ad.due_at,a.due_at) AS personal_due_at,w.kind,w.rubric_json,w.planned_skk FROM assignments a
 JOIN class_subjects cs ON cs.id=a.class_subject_id JOIN classes c ON c.id=cs.class_id
 JOIN class_memberships cm ON cm.class_id=c.id AND cm.student_id=? AND cm.status='active'
 LEFT JOIN assignment_work w ON w.assignment_id=a.id LEFT JOIN assignment_deadlines ad ON ad.assignment_id=a.id AND ad.student_id=cm.student_id
 WHERE a.id=? AND a.status='published' AND c.status='active'
 AND ${competencyAccess("assignment", "a", "cm.student_id", true)}`,
  )
    .bind(user.id, id)
    .first<Row>();
  if (!a) throw new ApiError("NOT_FOUND", 404, "Tugas tidak ditemukan.");
  return a;
}
export async function workSubmission(user: CurrentUser, id: string) {
  if (user.role !== "student" && user.role !== "teacher")
    throw new AuthError("FORBIDDEN", 403, "Peran tidak diizinkan.");
  const sub = await env.DB.prepare(
    `SELECT sub.*,w.version,w.revision_requested,w.evidence_json,w.portfolio,w.prior_learning FROM submissions sub LEFT JOIN submission_work w ON w.submission_id=sub.id WHERE sub.id=?`,
  )
    .bind(id)
    .first<Row>();
  if (!sub) throw new ApiError("NOT_FOUND", 404, "Karya tidak ditemukan.");
  if (user.role === "student") {
    if (sub.student_id !== user.id)
      throw new ApiError("NOT_FOUND", 404, "Karya tidak ditemukan.");
    await workAssignment(user, String(sub.assignment_id));
  } else {
    const allowed = await env.DB.prepare(
      `SELECT a.id FROM assignments a JOIN class_subjects cs ON cs.id=a.class_subject_id JOIN classes c ON c.id=cs.class_id JOIN class_memberships cm ON cm.class_id=c.id AND cm.student_id=? AND cm.status='active' WHERE a.id=? AND cs.teacher_id=? AND c.status='active'`,
    )
      .bind(sub.student_id, String(sub.assignment_id), user.id)
      .first();
    if (!allowed)
      throw new ApiError("NOT_FOUND", 404, "Karya tidak ditemukan.");
  }
  return sub;
}
export async function workDetail(user: CurrentUser, id: string) {
  const assignment = await workAssignment(user, id);
  const sub = await env.DB.prepare(
    `SELECT id FROM submissions WHERE assignment_id=? AND student_id=?`,
  )
    .bind(id, user.id)
    .first<{ id: string }>();
  return {
    assignment,
    ...(sub
      ? await submissionDetail(user, sub.id)
      : { submission: null, history: [], files: [] }),
    competencies: await rows(
      `SELECT bc.id,bc.code,bc.learner_outcome,cp.code AS package_code,cv.code AS version_code,sa.planned_skk AS allocation_skk FROM assignment_basic_competencies l JOIN basic_competencies bc ON bc.id=l.basic_competency_id JOIN core_competencies ki ON ki.id=bc.core_competency_id JOIN competency_packages cp ON cp.id=ki.competency_package_id JOIN competency_levels cl ON cl.id=cp.competency_level_id JOIN curriculum_versions cv ON cv.id=cl.curriculum_version_id LEFT JOIN subject_skk_allocations sa ON sa.competency_package_id=cp.id AND sa.subject_id=bc.subject_id WHERE l.assignment_id=?`,
      id,
    ),
  };
}
export async function submissionDetail(user: CurrentUser, id: string) {
  const submission = await workSubmission(user, id);
  return {
    submission,
    history: await rows(
      `SELECT h.id,h.event,h.snapshot_json,h.created_at,u.display_name FROM submission_history h JOIN users u ON u.id=h.actor_id WHERE h.submission_id=? ORDER BY h.rowid`,
      id,
    ),
    files: await rows(
      "SELECT id,name,mime,size FROM work_files WHERE submission_id=?",
      id,
    ),
  };
}

export async function workPortfolio(user: CurrentUser) {
  requireRole(user, "student");
  const selected = await rows(
    "SELECT sub.assignment_id FROM submissions sub JOIN submission_work w ON w.submission_id=sub.id WHERE sub.student_id=? AND sub.status='graded' AND w.portfolio=1",
    user.id,
  );
  const result = [];
  for (const item of selected) {
    try {
      const d = await workDetail(user, String(item.assignment_id));
      result.push({
        assignmentId: d.assignment.id,
        title: d.assignment.title,
        score: d.submission?.score,
        competencies: d.competencies,
      });
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 404)) throw e;
    }
  }
  return result;
}
