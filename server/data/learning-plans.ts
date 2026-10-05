import { env } from "cloudflare:workers";
import { ApiError } from "../api/error.ts";
import { requireRole } from "../auth/authorize.ts";
import type { CurrentUser } from "../auth/types.ts";
import { competencyAccess } from "./competency-access.ts";

function invalid(message = "Data rencana belajar tidak valid."): never {
  throw new ApiError("VALIDATION_ERROR", 422, message);
}
function text(value: unknown, max = 2000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    invalid();
  return value.trim();
}
function date(value: unknown): string {
  const input = text(value, 40);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(input) || !Number.isFinite(Date.parse(input)))
    invalid("Waktu tidak valid.");
  return new Date(input).toISOString();
}
async function subjectAccess(user: CurrentUser, id: string) {
  const row = await env.DB.prepare(
    `SELECT cs.* FROM class_subjects cs JOIN classes c ON c.id=cs.class_id
    WHERE cs.id=? AND cs.teacher_id=? AND c.status='active'`,
  )
    .bind(id, user.id)
    .first<{ class_id: string; subject_id: string }>();
  if (!row)
    throw new ApiError("NOT_FOUND", 404, "Penugasan tutor tidak ditemukan.");
  return row;
}
async function member(classId: string, studentId: string) {
  const row = await env.DB.prepare(
    `SELECT cm.student_id FROM class_memberships cm JOIN users u ON u.id=cm.student_id
    WHERE cm.class_id=? AND cm.student_id=? AND cm.status='active' AND u.status='active' AND u.role='student'`,
  )
    .bind(classId, studentId)
    .first();
  if (!row)
    throw new ApiError(
      "NOT_FOUND",
      404,
      "Warga belajar tidak ditemukan pada kelas ini.",
    );
}

export async function readLearningPlans(user: CurrentUser) {
  requireRole(user, "teacher", "student");
  const filter =
    user.role === "teacher" ? "cs.teacher_id=?" : "lp.student_id=?";
  const plans = await env.DB.prepare(
    `SELECT lp.*, s.name AS subject, bc.learner_outcome,
    u.display_name AS student_name, mp.percent, mp.last_position,
    (SELECT e.detail FROM learning_plan_events e WHERE e.plan_id=lp.id AND e.action='help' ORDER BY e.created_at DESC LIMIT 1) AS help_request FROM learning_plans lp
    JOIN class_subjects cs ON cs.id=lp.class_subject_id JOIN classes c ON c.id=cs.class_id
    JOIN subjects s ON s.id=cs.subject_id JOIN users u ON u.id=lp.student_id
    JOIN class_memberships cm ON cm.class_id=cs.class_id AND cm.student_id=lp.student_id
    JOIN basic_competencies bc ON bc.id=lp.competency_id JOIN core_competencies ki ON ki.id=bc.core_competency_id
    JOIN curriculum_assignments ca ON ca.competency_package_id=ki.competency_package_id AND ca.class_id=cs.class_id AND ca.student_id=lp.student_id
    LEFT JOIN material_progress mp ON mp.material_id=lp.material_id AND mp.student_id=lp.student_id
    WHERE ${filter} AND c.status='active' AND cm.status='active' AND u.status='active' AND ca.status='active'
    AND (lp.material_id IS NULL OR EXISTS(SELECT 1 FROM materials m WHERE m.id=lp.material_id AND m.status='published' AND ${competencyAccess("material", "m", "lp.student_id")}))
    ORDER BY lp.due_at, lp.created_at`,
  )
    .bind(user.id)
    .all();
  if (user.role === "student") return { plans: plans.results };
  const [subjects, students, competencies, materials, assignments] =
    await Promise.all([
      env.DB.prepare(
        `SELECT cs.id, s.name, c.name AS class_name FROM class_subjects cs JOIN subjects s ON s.id=cs.subject_id JOIN classes c ON c.id=cs.class_id WHERE cs.teacher_id=? AND c.status='active'`,
      )
        .bind(user.id)
        .all(),
      env.DB.prepare(
        `SELECT cs.id AS class_subject_id, u.id, u.display_name, ls.reason,
      (SELECT MAX(mp.updated_at) FROM material_progress mp JOIN materials m ON m.id=mp.material_id WHERE mp.student_id=u.id AND m.class_subject_id=cs.id) AS last_activity,
      (SELECT COUNT(*) FROM learning_plans lp LEFT JOIN material_progress mp ON mp.material_id=lp.material_id AND mp.student_id=lp.student_id WHERE lp.student_id=u.id AND lp.class_subject_id=cs.id AND lp.mode='independent' AND lp.due_at < ? AND COALESCE(mp.percent,0)<100) AS overdue
      FROM class_subjects cs JOIN classes c ON c.id=cs.class_id JOIN class_memberships cm ON cm.class_id=cs.class_id JOIN users u ON u.id=cm.student_id
      LEFT JOIN learning_support ls ON ls.class_subject_id=cs.id AND ls.student_id=u.id
      WHERE cs.teacher_id=? AND c.status='active' AND cm.status='active' AND u.status='active' AND u.role='student'`,
      )
        .bind(new Date().toISOString(), user.id)
        .all(),
      env.DB.prepare(
        `SELECT bc.id, bc.code, cp.code AS package_code, cv.code AS version_code, bc.learner_outcome, cs.id AS class_subject_id FROM basic_competencies bc JOIN core_competencies ki ON ki.id=bc.core_competency_id JOIN competency_packages cp ON cp.id=ki.competency_package_id JOIN competency_levels cl ON cl.id=cp.competency_level_id JOIN curriculum_versions cv ON cv.id=cl.curriculum_version_id JOIN class_subjects cs ON cs.class_id=cv.class_id AND cs.subject_id=bc.subject_id JOIN classes c ON c.id=cs.class_id WHERE cs.teacher_id=? AND c.status='active' AND cv.status='active'`,
      )
        .bind(user.id)
        .all(),
      env.DB.prepare(
        `SELECT m.id,m.title,m.class_subject_id FROM materials m JOIN class_subjects cs ON cs.id=m.class_subject_id JOIN classes c ON c.id=cs.class_id WHERE cs.teacher_id=? AND c.status='active' AND m.status='published'`,
      )
        .bind(user.id)
        .all(),
      env.DB.prepare(
        `SELECT a.id,a.title,a.class_subject_id FROM assignments a JOIN class_subjects cs ON cs.id=a.class_subject_id JOIN classes c ON c.id=cs.class_id WHERE cs.teacher_id=? AND c.status='active' AND a.status='published'`,
      )
        .bind(user.id)
        .all(),
    ]);
  return {
    plans: plans.results,
    subjects: subjects.results,
    students: students.results.map((s) => ({
      ...s,
      inactive:
        !s.last_activity ||
        Date.parse(String(s.last_activity)) < Date.now() - 7 * 86400000,
    })),
    competencies: competencies.results,
    materials: materials.results,
    assignments: assignments.results,
  };
}

export async function mutateLearningPlans(user: CurrentUser, input: unknown) {
  requireRole(user, "teacher", "student");
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid();
  const b = input as Record<string, unknown>;
  const now = new Date().toISOString();
  if (b.action === "acknowledge") {
    requireRole(user, "student");
    const submissionId = text(b.submissionId, 100);
    const sub = await env.DB.prepare(
      `SELECT sub.graded_at FROM submissions sub JOIN assignments a ON a.id=sub.assignment_id JOIN class_subjects cs ON cs.id=a.class_subject_id JOIN classes c ON c.id=cs.class_id JOIN class_memberships cm ON cm.class_id=cs.class_id AND cm.student_id=sub.student_id
      WHERE sub.id=? AND sub.student_id=? AND sub.status='graded' AND sub.feedback IS NOT NULL AND sub.graded_at IS NOT NULL AND c.status='active' AND cm.status='active' AND a.status='published' AND ${competencyAccess("assignment", "a", "sub.student_id")}`,
    )
      .bind(submissionId, user.id)
      .first<{ graded_at: string }>();
    if (!sub)
      throw new ApiError("NOT_FOUND", 404, "Umpan balik tidak ditemukan.");
    await env.DB.prepare(
      `INSERT OR IGNORE INTO feedback_acknowledgments (submission_id,graded_at,student_id,acknowledged_at) VALUES (?,?,?,?)`,
    )
      .bind(submissionId, sub.graded_at, user.id, now)
      .run();
    return { saved: true };
  }
  if (b.action === "help") {
    requireRole(user, "student");
    const planId = text(b.planId, 100),
      reason = text(b.reason);
    const visible = await readLearningPlans(user);
    if (!visible.plans.some((p) => p.id === planId))
      throw new ApiError("NOT_FOUND", 404, "Rencana tidak ditemukan.");
    await env.DB.prepare(
      "INSERT INTO learning_plan_events (id,plan_id,actor_id,action,detail,created_at) VALUES (?,?,?,'help',?,?)",
    )
      .bind(crypto.randomUUID(), planId, user.id, reason, now)
      .run();
    return { saved: true };
  }
  requireRole(user, "teacher");
  const csId = text(b.classSubjectId, 100);
  const cs = await subjectAccess(user, csId);
  if (b.action === "support") {
    const studentId = text(b.studentId, 100);
    await member(cs.class_id, studentId);
    const reason = text(b.reason);
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO learning_support (class_subject_id,student_id,reason,updated_by,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(class_subject_id,student_id) DO UPDATE SET reason=excluded.reason,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
      ).bind(csId, studentId, reason, user.id, now),
      env.DB.prepare(
        `INSERT INTO learning_support_events (id,class_subject_id,student_id,actor_id,reason,created_at) VALUES (?,?,?,?,?,?)`,
      ).bind(crypto.randomUUID(), csId, studentId, user.id, reason, now),
    ]);
  } else if (b.action === "deadline") {
    const studentId = text(b.studentId, 100);
    await member(cs.class_id, studentId);
    const assignmentId = text(b.assignmentId, 100),
      due = date(b.dueAt),
      reason = text(b.reason);
    const a = await env.DB.prepare(
      `SELECT a.id FROM assignments a JOIN class_subjects cs ON cs.id=a.class_subject_id WHERE a.id=? AND a.class_subject_id=? AND a.status='published' AND ${competencyAccess("assignment", "a", "?")}`,
    )
      .bind(assignmentId, csId, studentId)
      .first();
    if (!a)
      throw new ApiError(
        "NOT_FOUND",
        404,
        "Tugas tidak tersedia untuk warga belajar ini.",
      );
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO assignment_deadlines (assignment_id,student_id,due_at,reason,updated_by,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(assignment_id,student_id) DO UPDATE SET due_at=excluded.due_at,reason=excluded.reason,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
      ).bind(assignmentId, studentId, due, reason, user.id, now),
      env.DB.prepare(
        `INSERT INTO assignment_deadline_events (id,assignment_id,student_id,due_at,reason,actor_id,created_at) VALUES (?,?,?,?,?,?,?)`,
      ).bind(
        crypto.randomUUID(),
        assignmentId,
        studentId,
        due,
        reason,
        user.id,
        now,
      ),
    ]);
  } else if (b.action === "create") {
    const title = text(b.title, 200),
      instructions = text(b.instructions),
      due = date(b.dueAt),
      competencyId = text(b.competencyId, 100);
    const mode = b.mode;
    if (
      mode !== "independent" &&
      mode !== "tutorial" &&
      mode !== "face_to_face"
    )
      invalid();
    const materialId = b.materialId ? text(b.materialId, 100) : null;
    if (mode === "independent" && !materialId)
      invalid("Rencana mandiri memerlukan materi.");
    const ids = b.studentId
      ? [text(b.studentId, 100)]
      : (
          await env.DB.prepare(
            `SELECT cm.student_id FROM class_memberships cm JOIN users u ON u.id=cm.student_id WHERE cm.class_id=? AND cm.status='active' AND u.status='active' AND u.role='student'`,
          )
            .bind(cs.class_id)
            .all<{ student_id: string }>()
        ).results.map((x) => x.student_id);
    if (!ids.length) invalid("Kelas belum memiliki warga belajar aktif.");
    const statements = [];
    for (const studentId of ids) {
      await member(cs.class_id, studentId);
      const kd = await env.DB.prepare(
        `SELECT bc.id FROM basic_competencies bc JOIN core_competencies ki ON ki.id=bc.core_competency_id JOIN curriculum_assignments ca ON ca.competency_package_id=ki.competency_package_id WHERE bc.id=? AND bc.subject_id=? AND ca.class_id=? AND ca.student_id=? AND ca.status='active'`,
      )
        .bind(competencyId, cs.subject_id, cs.class_id, studentId)
        .first();
      if (!kd)
        invalid(
          "Kompetensi belum ditetapkan kepada seluruh penerima. Pilih individu atau tetapkan kurikulumnya dahulu.",
        );
      if (materialId) {
        const m = await env.DB.prepare(
          `SELECT m.id FROM materials m JOIN class_subjects cs ON cs.id=m.class_subject_id JOIN material_basic_competencies link ON link.material_id=m.id WHERE m.id=? AND m.class_subject_id=? AND link.basic_competency_id=? AND m.status='published' AND ${competencyAccess("material", "m", "?")}`,
        )
          .bind(materialId, csId, competencyId, studentId)
          .first();
        if (!m)
          invalid(
            "Materi harus terbit dan terhubung dengan kompetensi penerima.",
          );
      }
      const id = crypto.randomUUID();
      statements.push(
        env.DB.prepare(
          `INSERT INTO learning_plans (id,class_subject_id,student_id,competency_id,title,mode,material_id,due_at,instructions,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        ).bind(
          id,
          csId,
          studentId,
          competencyId,
          title,
          mode,
          materialId,
          due,
          instructions,
          user.id,
          now,
          now,
        ),
        env.DB.prepare(
          `INSERT INTO learning_plan_events (id,plan_id,actor_id,action,detail,created_at) VALUES (?,?,?,'create',?,?)`,
        ).bind(
          crypto.randomUUID(),
          id,
          user.id,
          JSON.stringify({ title, mode, due, competencyId, materialId }),
          now,
        ),
      );
    }
    await env.DB.batch(statements);
  } else invalid("Tindakan tidak dikenal.");
  return readLearningPlans(user);
}
