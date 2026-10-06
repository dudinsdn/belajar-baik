import { env } from "cloudflare:workers";
import { ApiError } from "../api/error.ts";
import { requireRole } from "../auth/authorize.ts";
import type { CurrentUser } from "../auth/types.ts";
import { competencyAccess } from "./competency-access.ts";

function invalid(message = "Data pendampingan tidak valid."): never {
  throw new ApiError("VALIDATION_ERROR", 422, message);
}
function text(value: unknown, max = 100) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    invalid();
  return value.trim();
}
export async function mentoringScope(
  user: CurrentUser,
  subjectId: string,
  studentId: string,
) {
  requireRole(user, "teacher");
  const row = await env.DB.prepare(
    `SELECT cs.id,cs.class_id,cs.subject_id,u.id AS student_id,u.display_name,c.name AS class_name,s.name AS subject
    FROM class_subjects cs JOIN classes c ON c.id=cs.class_id JOIN subjects s ON s.id=cs.subject_id
    JOIN class_memberships cm ON cm.class_id=cs.class_id JOIN users u ON u.id=cm.student_id
    WHERE cs.id=? AND cs.teacher_id=? AND cm.student_id=? AND c.status='active' AND cm.status='active' AND u.status='active' AND u.role='student'`,
  )
    .bind(subjectId, user.id, studentId)
    .first<{
      id: string;
      class_id: string;
      subject_id: string;
      student_id: string;
      display_name: string;
      class_name: string;
      subject: string;
    }>();
  if (!row)
    throw new ApiError(
      "NOT_FOUND",
      404,
      "Warga belajar tidak ditemukan pada penugasan ini.",
    );
  return row;
}

async function visibleMentoringPlans(
  user: CurrentUser,
  subjectId: string,
  studentId: string,
) {
  const result = await env.DB.prepare(
    `SELECT lp.*,bc.learner_outcome,mp.percent,
    (SELECT e.detail FROM learning_plan_events e WHERE e.plan_id=lp.id AND e.action='help' ORDER BY e.created_at DESC,e.rowid DESC LIMIT 1) AS help_request
    FROM learning_plans lp JOIN class_subjects cs ON cs.id=lp.class_subject_id
    JOIN basic_competencies bc ON bc.id=lp.competency_id JOIN core_competencies ki ON ki.id=bc.core_competency_id
    JOIN curriculum_assignments ca ON ca.competency_package_id=ki.competency_package_id AND ca.class_id=cs.class_id AND ca.student_id=lp.student_id
    LEFT JOIN material_progress mp ON mp.material_id=lp.material_id AND mp.student_id=lp.student_id
    WHERE cs.id=? AND cs.teacher_id=? AND lp.student_id=? AND ca.status='active'
    AND (lp.material_id IS NULL OR EXISTS(SELECT 1 FROM materials m WHERE m.id=lp.material_id AND m.status='published' AND ${competencyAccess("material", "m", "lp.student_id")})) ORDER BY lp.due_at,lp.id`,
  )
    .bind(subjectId, user.id, studentId)
    .all();
  return { plans: result.results };
}

export async function readMentoringDetail(
  user: CurrentUser,
  subjectId: string,
  studentId: string,
) {
  const scope = await mentoringScope(user, subjectId, studentId);
  const [
    materials,
    assignments,
    attempts,
    plans,
    interventions,
    support,
    deadlines,
    skk,
  ] = await Promise.all([
    env.DB.prepare(
      `SELECT m.id,m.title,COALESCE(mp.percent,0) AS percent,mp.updated_at
      FROM materials m JOIN class_subjects cs ON cs.id=m.class_subject_id LEFT JOIN material_progress mp ON mp.material_id=m.id AND mp.student_id=?
      WHERE cs.id=? AND m.status='published' AND ${competencyAccess("material", "m", "?")} ORDER BY m.order_index,m.id`,
    )
      .bind(studentId, subjectId, studentId)
      .all<{
        id: string;
        title: string;
        percent: number;
        updated_at: string | null;
      }>(),
    env.DB.prepare(
      `SELECT a.id,a.title,COALESCE(ad.due_at,a.due_at) AS due_at,sub.id AS submission_id,COALESCE(sub.status,'not_started') AS status,sub.score,sub.feedback,CASE WHEN sw.submission_id IS NOT NULL THEN (SELECT MAX(h.created_at) FROM submission_history h WHERE h.submission_id=sub.id AND h.actor_id=sub.student_id) ELSE CASE WHEN sub.status='draft' THEN sub.updated_at ELSE sub.submitted_at END END AS updated_at,sub.graded_at,COALESCE(sw.revision_requested,0) AS revision_requested,
      EXISTS(SELECT 1 FROM feedback_acknowledgments fa WHERE fa.submission_id=sub.id AND fa.graded_at=sub.graded_at) AS acknowledged
      FROM assignments a JOIN class_subjects cs ON cs.id=a.class_subject_id JOIN users learner ON learner.id=?
      LEFT JOIN submissions sub ON sub.assignment_id=a.id AND sub.student_id=learner.id LEFT JOIN submission_work sw ON sw.submission_id=sub.id LEFT JOIN assignment_deadlines ad ON ad.assignment_id=a.id AND ad.student_id=learner.id
      WHERE cs.id=? AND a.status='published' AND ${competencyAccess("assignment", "a", "learner.id", true)} ORDER BY due_at,a.id`,
    )
      .bind(studentId, subjectId)
      .all<{
        id: string;
        title: string;
        due_at: string;
        submission_id: string | null;
        status: string;
        score: number | null;
        feedback: string | null;
        updated_at: string | null;
        graded_at: string | null;
        revision_requested: number;
        acknowledged: number;
      }>(),
    env.DB.prepare(
      `SELECT qa.id,q.id AS quiz_id,q.title,q.purpose,q.passing_score,qa.status,qa.score,qa.started_at,qa.completed_at,
      (SELECT MAX(qe.created_at) FROM quiz_events qe WHERE qe.attempt_id=qa.id AND qe.actor_id=qa.student_id) AS answered_at,
      (SELECT COUNT(*) FROM quiz_responses qr WHERE qr.attempt_id=qa.id AND qr.credit IS NULL) AS pending_review
      FROM quiz_attempts qa JOIN quizzes q ON q.id=qa.quiz_id JOIN class_subjects cs ON cs.id=q.class_subject_id WHERE qa.student_id=? AND cs.id=? AND q.status='published' AND ${competencyAccess("quiz", "q", "?")} ORDER BY qa.started_at DESC,qa.id DESC`,
    )
      .bind(studentId, subjectId, studentId)
      .all<{
        id: string;
        quiz_id: string;
        title: string;
        purpose: string;
        passing_score: number;
        status: string;
        score: number | null;
        started_at: string;
        completed_at: string | null;
        answered_at: string | null;
        pending_review: number;
      }>(),
    visibleMentoringPlans(user, subjectId, studentId),
    env.DB.prepare(
      `SELECT e.*,u.display_name AS actor_name, EXISTS(SELECT 1 FROM mentoring_events r WHERE r.parent_id=e.id AND r.kind='resolve') AS resolved FROM mentoring_events e JOIN users u ON u.id=e.actor_id WHERE e.class_subject_id=? AND e.student_id=? ORDER BY e.created_at DESC,e.rowid DESC`,
    )
      .bind(subjectId, studentId)
      .all<{
        id: string;
        kind: string;
        detail: string;
        due_at: string | null;
        parent_id: string | null;
        created_at: string;
        actor_name: string;
        resolved: number;
      }>(),
    env.DB.prepare(
      `SELECT e.*,u.display_name AS actor_name FROM learning_support_events e JOIN users u ON u.id=e.actor_id WHERE e.class_subject_id=? AND e.student_id=? ORDER BY e.created_at DESC`,
    )
      .bind(subjectId, studentId)
      .all(),
    env.DB.prepare(
      `SELECT e.*,a.title,u.display_name AS actor_name FROM assignment_deadline_events e JOIN assignments a ON a.id=e.assignment_id JOIN users u ON u.id=e.actor_id WHERE a.class_subject_id=? AND e.student_id=? ORDER BY e.created_at DESC`,
    )
      .bind(subjectId, studentId)
      .all(),
    env.DB.prepare(
      `SELECT COALESCE(SUM(sa.planned_skk),0) AS planned FROM curriculum_assignments ca JOIN subject_skk_allocations sa ON sa.competency_package_id=ca.competency_package_id WHERE ca.class_id=? AND ca.student_id=? AND ca.status='active' AND sa.subject_id=?`,
    )
      .bind(scope.class_id, studentId, scope.subject_id)
      .first<{ planned: number }>(),
  ]);
  const visiblePlans = plans.plans.filter(
    (p) => p.class_subject_id === subjectId && p.student_id === studentId,
  );
  const attendance = visiblePlans.length
    ? (
        await env.DB.prepare(
          `SELECT ae.*,u.display_name AS actor_name FROM attendance_events ae JOIN learning_plans lp ON lp.id=ae.plan_id JOIN users u ON u.id=ae.actor_id WHERE lp.class_subject_id=? AND lp.student_id=? ORDER BY ae.created_at DESC,ae.rowid DESC`,
        )
          .bind(subjectId, studentId)
          .all<{
            id: string;
            plan_id: string;
            status: string;
            reason: string;
            created_at: string;
            actor_name: string;
          }>()
      ).results.filter((a) => visiblePlans.some((p) => p.id === a.plan_id))
    : [];
  const planChanges = (
    await env.DB.prepare(
      `SELECT e.id,e.plan_id,json_extract(e.detail,'$.previousTitle') AS previous_title,json_extract(e.detail,'$.title') AS title,json_extract(e.detail,'$.previousDueAt') AS previous_due_at,json_extract(e.detail,'$.dueAt') AS due_at,json_extract(e.detail,'$.instructions') AS instructions,e.created_at,u.display_name AS actor_name FROM learning_plan_events e JOIN learning_plans lp ON lp.id=e.plan_id JOIN users u ON u.id=e.actor_id WHERE lp.class_subject_id=? AND lp.student_id=? AND e.action='replan' ORDER BY e.created_at DESC,e.rowid DESC`,
    )
      .bind(subjectId, studentId)
      .all<{
        id: string;
        plan_id: string;
        previous_title: string;
        title: string;
        previous_due_at: string;
        due_at: string;
        instructions: string;
        created_at: string;
        actor_name: string;
      }>()
  ).results.filter((e) => visiblePlans.some((p) => p.id === e.plan_id));
  return {
    scope,
    materials: materials.results,
    assignments: assignments.results,
    attempts: attempts.results,
    plans: visiblePlans,
    attendance,
    planChanges,
    interventions: interventions.results,
    support: support.results,
    deadlines: deadlines.results,
    skk: { planned: skk?.planned ?? 0, awarded: null },
    mastery: null,
  };
}

// Signals describe observable process, never mastery or a decision to award SKK.
export function mentoringSignals(
  detail: Awaited<ReturnType<typeof readMentoringDetail>>,
  now = Date.now(),
) {
  const activity =
    [
      ...detail.materials.map((m) => m.updated_at),
      ...detail.assignments.map((a) => a.updated_at),
      ...detail.attempts.flatMap((a) => [
        a.started_at,
        a.completed_at,
        a.answered_at,
      ]),
    ]
      .filter((v): v is string => !!v && Number.isFinite(Date.parse(v)))
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
  const latest = detail.attempts.filter(
    (a, i, all) => all.findIndex((b) => b.quiz_id === a.quiz_id) === i,
  );
  const overdue =
    detail.assignments.filter(
      (a) =>
        (a.status === "not_started" || a.status === "draft") &&
        Date.parse(a.due_at) < now,
    ).length +
    detail.plans.filter(
      (p) =>
        p.mode === "independent" &&
        Number(p.percent ?? 0) < 100 &&
        Date.parse(String(p.due_at)) < now,
    ).length;
  const waiting =
    detail.assignments.filter((a) => a.status === "submitted").length +
    detail.attempts.filter(
      (a) =>
        a.status === "completed" && a.score === null && a.pending_review > 0,
    ).length;
  const remedial = latest.filter(
    (a) =>
      a.purpose === "formative" &&
      a.status === "completed" &&
      a.score !== null &&
      a.score < a.passing_score,
  ).length;
  const revision = detail.assignments.filter(
    (a) => a.revision_requested,
  ).length;
  const pending = detail.interventions.filter(
    (e) =>
      ["remedial", "enrichment", "reminder"].includes(e.kind) && !e.resolved,
  );
  const labels = [
    overdue > 0 ? "Terlambat" : null,
    waiting > 0 ? "Menunggu penilaian" : null,
    revision > 0 ? "Perlu revisi" : null,
    remedial > 0 ? "Perlu remedial" : null,
    pending.length ? "Tindak lanjut terbuka" : null,
    !activity
      ? "Belum mulai"
      : Date.parse(activity) <= now - 7 * 86400000
        ? "Tidak aktif ≥7 hari"
        : "Sedang belajar",
  ].filter((v): v is string => !!v);
  return {
    lastActivity: activity,
    overdue,
    waiting,
    remedial,
    revision,
    openInterventions: pending.length,
    labels,
    priority:
      overdue +
      waiting +
      remedial +
      revision +
      pending.length +
      (!activity || Date.parse(activity) <= now - 7 * 86400000 ? 1 : 0),
  };
}
export async function readMentoringDashboard(user: CurrentUser) {
  requireRole(user, "teacher");
  const rows = (
    await env.DB.prepare(
      `SELECT cs.id AS class_subject_id,cm.student_id,u.display_name,c.name AS class_name,s.name AS subject FROM class_subjects cs JOIN classes c ON c.id=cs.class_id JOIN subjects s ON s.id=cs.subject_id JOIN class_memberships cm ON cm.class_id=cs.class_id JOIN users u ON u.id=cm.student_id WHERE cs.teacher_id=? AND c.status='active' AND cm.status='active' AND u.status='active' AND u.role='student' ORDER BY c.name,s.name,u.display_name,cm.student_id`,
    )
      .bind(user.id)
      .all<{
        class_subject_id: string;
        student_id: string;
        display_name: string;
        class_name: string;
        subject: string;
      }>()
  ).results;
  const students = [];
  for (const row of rows)
    students.push({
      ...row,
      ...mentoringSignals(
        await readMentoringDetail(user, row.class_subject_id, row.student_id),
      ),
    });
  students.sort(
    (a, b) =>
      b.priority - a.priority || a.display_name.localeCompare(b.display_name),
  );
  return { students, generatedAt: new Date().toISOString(), inactivityDays: 7 };
}
export async function mutateMentoring(user: CurrentUser, input: unknown) {
  requireRole(user, "teacher");
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid();
  const b = input as Record<string, unknown>;
  const csId = text(b.classSubjectId),
    studentId = text(b.studentId);
  await mentoringScope(user, csId, studentId);
  const detail = text(b.detail, 2000),
    now = new Date().toISOString(),
    id = crypto.randomUUID();
  if (b.kind === "attendance") {
    const planId = text(b.planId);
    if (!["present", "absent", "excused"].includes(String(b.status))) invalid();
    const plans = await visibleMentoringPlans(user, csId, studentId);
    if (
      !plans.plans.some(
        (p) =>
          p.id === planId &&
          p.class_subject_id === csId &&
          p.student_id === studentId &&
          ["tutorial", "face_to_face"].includes(String(p.mode)),
      )
    )
      throw new ApiError(
        "NOT_FOUND",
        404,
        "Kegiatan tatap muka/tutorial tidak ditemukan.",
      );
    await env.DB.prepare(
      `INSERT INTO attendance_events(id,plan_id,actor_id,status,reason,created_at) VALUES (?,?,?,?,?,?)`,
    )
      .bind(id, planId, user.id, b.status, detail, now)
      .run();
  } else {
    const kind = text(b.kind);
    if (
      !["note", "remedial", "enrichment", "reminder", "resolve"].includes(kind)
    )
      invalid();
    let dueAt: string | null = null,
      parentId: string | null = null;
    if (["remedial", "enrichment", "reminder"].includes(kind)) {
      const due = text(b.dueAt, 40);
      if (!/^\d{4}-\d{2}-\d{2}T/.test(due) || !Number.isFinite(Date.parse(due)))
        invalid("Tenggat tidak valid.");
      dueAt = new Date(due).toISOString();
    }
    if (kind === "resolve") {
      parentId = text(b.parentId);
      const parent = await env.DB.prepare(
        `SELECT e.id FROM mentoring_events e WHERE e.id=? AND e.class_subject_id=? AND e.student_id=? AND e.kind IN ('remedial','enrichment','reminder') AND NOT EXISTS(SELECT 1 FROM mentoring_events r WHERE r.parent_id=e.id AND r.kind='resolve')`,
      )
        .bind(parentId, csId, studentId)
        .first();
      if (!parent)
        throw new ApiError(
          "CONFLICT",
          409,
          "Tindak lanjut tidak tersedia atau sudah ditutup.",
        );
    }
    try {
      await env.DB.prepare(
        `INSERT INTO mentoring_events(id,class_subject_id,student_id,actor_id,kind,detail,due_at,parent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
      )
        .bind(id, csId, studentId, user.id, kind, detail, dueAt, parentId, now)
        .run();
    } catch (error) {
      if (
        kind === "resolve" &&
        error instanceof Error &&
        /UNIQUE/.test(error.message)
      )
        throw new ApiError("CONFLICT", 409, "Tindak lanjut sudah ditutup.");
      throw error;
    }
  }
  return readMentoringDetail(user, csId, studentId);
}
export async function readStudentInterventions(user: CurrentUser) {
  requireRole(user, "student");
  return (
    await env.DB.prepare(
      `SELECT e.id,e.kind,e.detail,e.due_at,e.created_at,u.display_name AS tutor,s.name AS subject FROM mentoring_events e JOIN class_subjects cs ON cs.id=e.class_subject_id JOIN classes c ON c.id=cs.class_id JOIN subjects s ON s.id=cs.subject_id JOIN users u ON u.id=e.actor_id JOIN class_memberships cm ON cm.class_id=cs.class_id AND cm.student_id=e.student_id WHERE e.student_id=? AND cm.status='active' AND c.status='active' AND e.kind IN ('remedial','enrichment','reminder') AND NOT EXISTS(SELECT 1 FROM mentoring_events r WHERE r.parent_id=e.id AND r.kind='resolve') ORDER BY e.due_at,e.created_at`,
    )
      .bind(user.id)
      .all()
  ).results;
}
