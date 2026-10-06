import { env } from "cloudflare:workers";
import { ApiError } from "../api/error.ts";
import { requireRole } from "../auth/authorize.ts";
import type { CurrentUser } from "../auth/types.ts";

type Row = Record<string, string | number | null>;
async function rows(sql: string, ...args: (string | number)[]) {
  return (
    await env.DB.prepare(sql)
      .bind(...args)
      .all<Row>()
  ).results;
}
function invalid(message: string): never {
  throw new ApiError("VALIDATION_ERROR", 422, message);
}
function value(v: unknown) {
  if (typeof v !== "string" || !v.trim() || v.length > 2000)
    invalid("Isi semua data dan alasan keputusan.");
  return v.trim();
}
const scopeSql = `SELECT ca.*,a.id AS allocation_id,a.subject_id,a.planned_skk,s.name AS subject,cp.code AS package_code,u.display_name AS student_name
FROM curriculum_assignments ca JOIN subject_skk_allocations a ON a.competency_package_id=ca.competency_package_id
JOIN competency_packages cp ON cp.id=ca.competency_package_id JOIN subjects s ON s.id=a.subject_id
JOIN users u ON u.id=ca.student_id JOIN classes c ON c.id=ca.class_id
JOIN class_memberships cm ON cm.class_id=ca.class_id AND cm.student_id=ca.student_id
WHERE ca.status IN ('active','completed') AND cm.status='active' AND c.status='active' AND u.status='active' AND u.role='student'`;
function gate(user: CurrentUser) {
  return user.role === "student"
    ? "ca.student_id=?"
    : "EXISTS(SELECT 1 FROM class_subjects cs WHERE cs.class_id=ca.class_id AND cs.subject_id=a.subject_id AND cs.teacher_id=?)";
}
export async function readSkk(user: CurrentUser) {
  requireRole(user, "teacher", "student");
  const allocations = await rows(
    `${scopeSql} AND ${gate(user)} ORDER BY u.display_name,cp.code,s.name`,
    user.id,
  );
  const result: {
    id: string;
    allocation_id: string;
    class_id: string;
    student_id: string;
    subject_id: string;
    status: string;
    student_name: string;
    subject: string;
    package_code: string;
    planned_skk: number;
    competencies: Row[];
    activities: Row[];
    evidence: Row[];
    history: Row[];
    masteryHistory: Row[];
    earned: number;
    remaining: number;
    revision: number;
    ledgerStatus: string;
  }[] = [];
  for (const allocation of allocations) {
    const competencies = await rows(
      `SELECT bc.id,bc.code,bc.learner_outcome,d.status,d.revision,d.reason,d.evidence_kind,d.evidence_id,d.actor_id,d.created_at
      FROM basic_competencies bc JOIN core_competencies ki ON ki.id=bc.core_competency_id
      LEFT JOIN mastery_decisions d ON d.assignment_id=? AND d.competency_id=bc.id AND d.revision=(SELECT MAX(revision) FROM mastery_decisions WHERE assignment_id=d.assignment_id AND competency_id=d.competency_id)
      WHERE ki.competency_package_id=? AND bc.subject_id=? ORDER BY bc.order_index,bc.id`,
      String(allocation.id),
      String(allocation.competency_package_id),
      String(allocation.subject_id),
    );
    const academicEvidence = await rows(
      `SELECT sub.id,'submission' AS kind,a.title,sub.score,sw.prior_learning,link.basic_competency_id AS competency_id FROM submissions sub JOIN assignments a ON a.id=sub.assignment_id JOIN class_subjects cs ON cs.id=a.class_subject_id JOIN assignment_basic_competencies link ON link.assignment_id=a.id LEFT JOIN submission_work sw ON sw.submission_id=sub.id WHERE sub.student_id=? AND cs.class_id=? AND cs.subject_id=? AND sub.status='graded' AND COALESCE(sw.revision_requested,0)=0
      UNION ALL SELECT qa.id,'quiz',q.title,qa.score,0,link.basic_competency_id FROM quiz_attempts qa JOIN quizzes q ON q.id=qa.quiz_id JOIN class_subjects cs ON cs.id=q.class_subject_id JOIN quiz_basic_competencies link ON link.quiz_id=q.id WHERE qa.student_id=? AND cs.class_id=? AND cs.subject_id=? AND qa.status='completed' AND qa.score IS NOT NULL AND NOT EXISTS(SELECT 1 FROM quiz_responses r WHERE r.attempt_id=qa.id AND r.credit IS NULL)`,
      String(allocation.student_id),
      String(allocation.class_id),
      String(allocation.subject_id),
      String(allocation.student_id),
      String(allocation.class_id),
      String(allocation.subject_id),
    );
    const activities = await rows(
      `SELECT lp.id,lp.title,lp.mode,lp.competency_id,lp.due_at,mp.percent,
      (SELECT ae.status FROM attendance_events ae WHERE ae.plan_id=lp.id ORDER BY ae.created_at DESC,ae.rowid DESC LIMIT 1) AS attendance
      FROM learning_plans lp JOIN class_subjects cs ON cs.id=lp.class_subject_id
      JOIN basic_competencies bc ON bc.id=lp.competency_id JOIN core_competencies ki ON ki.id=bc.core_competency_id
      LEFT JOIN material_progress mp ON mp.material_id=lp.material_id AND mp.student_id=lp.student_id
      WHERE lp.student_id=? AND cs.class_id=? AND cs.subject_id=? AND ki.competency_package_id=?`,
      String(allocation.student_id),
      String(allocation.class_id),
      String(allocation.subject_id),
      String(allocation.competency_package_id),
    );
    const evidence: Row[] = [
      ...academicEvidence,
      ...activities
        .filter(
          (a) => Number(a.percent ?? 0) === 100 || a.attendance === "present",
        )
        .map((a) => ({
          id: a.id,
          kind: "activity",
          title: a.title,
          score: null,
          prior_learning: 0,
          competency_id: a.competency_id,
          mode: a.mode,
        })),
    ];
    const history = await rows(
      "SELECT d.*,u.display_name AS actor_name FROM skk_decisions d JOIN users u ON u.id=d.actor_id WHERE assignment_id=? AND allocation_id=? ORDER BY revision DESC",
      String(allocation.id),
      String(allocation.allocation_id),
    );
    const masteryHistory = await rows(
      `SELECT d.*,u.display_name AS actor_name FROM mastery_decisions d JOIN users u ON u.id=d.actor_id JOIN basic_competencies bc ON bc.id=d.competency_id WHERE d.assignment_id=? AND bc.subject_id=? ORDER BY created_at DESC,id`,
      String(allocation.id),
      String(allocation.subject_id),
    );
    const latest = history[0];
    const earned =
      latest && (latest.status === "awarded" || latest.status === "recognized")
        ? Number(latest.credits)
        : 0;
    const complete =
      competencies.length > 0 &&
      competencies.every((c) => c.status === "mastered");
    result.push({
      ...allocation,
      id: String(allocation.id),
      allocation_id: String(allocation.allocation_id),
      class_id: String(allocation.class_id),
      student_id: String(allocation.student_id),
      subject_id: String(allocation.subject_id),
      status: String(allocation.status),
      student_name: String(allocation.student_name),
      subject: String(allocation.subject),
      package_code: String(allocation.package_code),
      planned_skk: Number(allocation.planned_skk),
      competencies,
      activities,
      evidence: evidence.filter((e) =>
        competencies.some((c) => c.id === e.competency_id),
      ),
      history,
      masteryHistory,
      earned,
      remaining: Number(allocation.planned_skk) - earned,
      revision: Number(latest?.revision ?? 0),
      ledgerStatus:
        earned > 0
          ? String(latest.status)
          : latest?.status === "rejected"
            ? "rejected"
            : complete
              ? "pending"
              : competencies.some((c) => c.status) ||
                  evidence.some((e) =>
                    competencies.some((c) => c.id === e.competency_id),
                  )
                ? "incomplete"
                : activities.some(
                      (a) => Number(a.percent ?? 0) > 0 || a.attendance,
                    )
                  ? "underway"
                  : "planned",
    });
  }
  function summarize(
    key: "student_id" | "subject_id" | "package_code",
    label: "student_name" | "subject" | "package_code",
  ) {
    const groups = new Map<
      string,
      {
        id: string;
        label: string;
        planned: number;
        earned: number;
        remaining: number;
      }
    >();
    for (const a of result) {
      const id = a[key];
      const r = groups.get(id) ?? {
        id,
        label: a[label],
        planned: 0,
        earned: 0,
        remaining: 0,
      };
      r.planned += a.planned_skk;
      r.earned += a.earned;
      r.remaining += a.remaining;
      groups.set(id, r);
    }
    return [...groups.values()];
  }
  return {
    byStudent: summarize("student_id", "student_name"),
    bySubject: summarize("subject_id", "subject"),
    byPackage: summarize("package_code", "package_code"),
    allocations: result,
    totals: result.reduce(
      (t, r) => ({
        planned: t.planned + Number(r.planned_skk),
        earned: t.earned + r.earned,
        remaining: t.remaining + r.remaining,
      }),
      { planned: 0, earned: 0, remaining: 0 },
    ),
  };
}

export async function decideSkk(user: CurrentUser, input: unknown) {
  requireRole(user, "teacher");
  if (!input || typeof input !== "object" || Array.isArray(input))
    invalid("Data keputusan tidak valid.");
  const p = input as Record<string, unknown>;
  const assignmentId = value(p.assignmentId),
    allocationId = value(p.allocationId),
    reason = value(p.reason);
  if (!Number.isSafeInteger(p.revision) || Number(p.revision) < 0)
    invalid("Revisi tidak valid.");
  const revision = Number(p.revision);
  const scope = (
    await rows(
      `${scopeSql} AND ${gate(user)} AND ca.id=? AND a.id=? AND ca.status='active'`,
      user.id,
      assignmentId,
      allocationId,
    )
  )[0];
  if (!scope)
    throw new ApiError(
      "NOT_FOUND",
      404,
      "Penetapan kurikulum tidak ditemukan.",
    );
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  if (p.action === "mastery") {
    const competencyId = value(p.competencyId),
      status = value(p.status),
      evidenceKind = value(p.evidenceKind),
      evidenceId = value(p.evidenceId);
    if (!["mastered", "needs_revision"].includes(status))
      invalid("Status ketuntasan tidak valid.");
    const competency = (
      await rows(
        `SELECT bc.* FROM basic_competencies bc JOIN core_competencies ki ON ki.id=bc.core_competency_id WHERE bc.id=? AND bc.subject_id=? AND ki.competency_package_id=?`,
        competencyId,
        String(scope.subject_id),
        String(scope.competency_package_id),
      )
    )[0];
    if (!competency) invalid("KD tidak sesuai alokasi.");
    let evidence: Row | undefined;
    if (evidenceKind === "submission")
      evidence = (
        await rows(
          `SELECT sub.*,a.title AS evidence_title,sw.evidence_json,sw.prior_learning,sw.revision_requested FROM submissions sub JOIN assignments a ON a.id=sub.assignment_id JOIN class_subjects cs ON cs.id=a.class_subject_id JOIN assignment_basic_competencies link ON link.assignment_id=a.id LEFT JOIN submission_work sw ON sw.submission_id=sub.id WHERE sub.id=? AND sub.student_id=? AND cs.class_id=? AND cs.subject_id=? AND link.basic_competency_id=? AND sub.status='graded' AND COALESCE(sw.revision_requested,0)=0`,
          evidenceId,
          String(scope.student_id),
          String(scope.class_id),
          String(scope.subject_id),
          competencyId,
        )
      )[0];
    else if (evidenceKind === "quiz")
      evidence = (
        await rows(
          `SELECT qa.*,q.title AS evidence_title,q.passing_score FROM quiz_attempts qa JOIN quizzes q ON q.id=qa.quiz_id JOIN class_subjects cs ON cs.id=q.class_subject_id JOIN quiz_basic_competencies link ON link.quiz_id=q.id WHERE qa.id=? AND qa.student_id=? AND cs.class_id=? AND cs.subject_id=? AND link.basic_competency_id=? AND qa.status='completed' AND qa.score IS NOT NULL AND NOT EXISTS(SELECT 1 FROM quiz_responses r WHERE r.attempt_id=qa.id AND r.credit IS NULL)`,
          evidenceId,
          String(scope.student_id),
          String(scope.class_id),
          String(scope.subject_id),
          competencyId,
        )
      )[0];
    else if (evidenceKind === "activity") {
      evidence = (
        await rows(
          `SELECT lp.*,lp.title AS evidence_title,mp.percent,
        (SELECT ae.status FROM attendance_events ae WHERE ae.plan_id=lp.id ORDER BY ae.created_at DESC,ae.rowid DESC LIMIT 1) AS attendance
        FROM learning_plans lp JOIN class_subjects cs ON cs.id=lp.class_subject_id
        LEFT JOIN material_progress mp ON mp.material_id=lp.material_id AND mp.student_id=lp.student_id
        WHERE lp.id=? AND lp.student_id=? AND lp.competency_id=? AND cs.class_id=? AND cs.subject_id=?`,
          evidenceId,
          String(scope.student_id),
          competencyId,
          String(scope.class_id),
          String(scope.subject_id),
        )
      )[0];
      if (
        evidence &&
        Number(evidence.percent ?? 0) !== 100 &&
        evidence.attendance !== "present"
      )
        evidence = undefined;
      value(p.observation);
      if (
        !Number.isSafeInteger(p.durationMinutes) ||
        Number(p.durationMinutes) <= 0 ||
        Number(p.durationMinutes) > 1440
      )
        invalid("Catat durasi kegiatan dalam menit (1–1440).");
      const mode = value(p.learningMode);
      if (
        !evidence ||
        !(evidence.mode === "tutorial"
          ? ["tutorial_sync", "tutorial_async"].includes(mode)
          : mode === evidence.mode)
      )
        invalid("Mode bukti tidak sesuai kegiatan belajar.");
    }
    if (!evidence)
      invalid(
        "Bukti belum dinilai atau tidak terkait warga belajar dan KD ini.",
      );
    if (
      status === "mastered" &&
      evidenceKind === "quiz" &&
      Number(evidence.score) < Number(evidence.passing_score)
    )
      invalid("Asesmen belum mencapai ambang ketuntasan.");
    // An active award must be revoked first, preventing stale credit after a mastery correction.
    const current = (
      await rows(
        "SELECT status FROM skk_decisions WHERE assignment_id=? AND allocation_id=? ORDER BY revision DESC LIMIT 1",
        assignmentId,
        allocationId,
      )
    )[0];
    if (current && ["awarded", "recognized"].includes(String(current.status)))
      invalid("Cabut SKK dengan alasan sebelum mengubah ketuntasan KD.");
    try {
      const inserted = await env.DB.prepare(
        `INSERT INTO mastery_decisions(id,assignment_id,competency_id,revision,status,evidence_kind,evidence_id,snapshot_json,reason,actor_id,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE COALESCE((SELECT MAX(revision) FROM mastery_decisions WHERE assignment_id=? AND competency_id=?),0)=?`,
      )
        .bind(
          id,
          assignmentId,
          competencyId,
          revision + 1,
          status,
          evidenceKind,
          evidenceId,
          JSON.stringify({
            competency,
            evidence,
            observation:
              evidenceKind === "activity" ? value(p.observation) : null,
            durationMinutes:
              evidenceKind === "activity" ? Number(p.durationMinutes) : null,
            learningMode: evidenceKind === "activity" ? p.learningMode : null,
          }),
          reason,
          user.id,
          now,
          assignmentId,
          competencyId,
          revision,
        )
        .run();
      if (!inserted.meta.changes)
        throw new ApiError(
          "CONFLICT",
          409,
          "Keputusan telah berubah. Muat ulang.",
        );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("CONFLICT", 409, "Keputusan bertabrakan. Muat ulang.");
    }
  } else if (p.action === "credit") {
    const status = value(p.status);
    if (!["awarded", "recognized", "revoked", "rejected"].includes(status))
      invalid("Status SKK tidak valid.");
    const view = await readSkk(user);
    const row = view.allocations.find(
      (a) => a.id === assignmentId && a.allocation_id === allocationId,
    )!;
    const credit = ["awarded", "recognized"].includes(status);
    if (
      credit &&
      (!row.competencies.length ||
        row.competencies.some((c) => c.status !== "mastered"))
    )
      invalid(
        "Semua KD pada alokasi harus tuntas dengan bukti yang divalidasi tutor.",
      );
    if (status === "recognized") {
      for (const c of row.competencies) {
        const d = JSON.parse(
          String(
            (
              await rows(
                "SELECT snapshot_json FROM mastery_decisions WHERE assignment_id=? AND competency_id=? ORDER BY revision DESC LIMIT 1",
                assignmentId,
                String(c.id),
              )
            )[0]?.snapshot_json ?? "{}",
          ),
        );
        if (
          c.evidence_kind !== "submission" ||
          d.evidence?.prior_learning !== 1
        )
          invalid(
            "Alih kredit memerlukan bukti pengalaman terdahulu untuk setiap KD.",
          );
      }
    }
    try {
      const inserted = await env.DB.prepare(
        `INSERT INTO skk_decisions(id,assignment_id,allocation_id,revision,status,credits,snapshot_json,reason,actor_id,created_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE COALESCE((SELECT MAX(revision) FROM skk_decisions WHERE assignment_id=? AND allocation_id=?),0)=?`,
      )
        .bind(
          id,
          assignmentId,
          allocationId,
          revision + 1,
          status,
          credit ? Number(scope.planned_skk) : 0,
          JSON.stringify({ allocation: scope, mastery: row.competencies }),
          reason,
          user.id,
          now,
          assignmentId,
          allocationId,
          revision,
        )
        .run();
      if (!inserted.meta.changes)
        throw new ApiError(
          "CONFLICT",
          409,
          "Keputusan telah berubah. Muat ulang.",
        );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("CONFLICT", 409, "Keputusan bertabrakan. Muat ulang.");
    }
  } else invalid("Tindakan tidak valid.");
  return readSkk(user);
}
