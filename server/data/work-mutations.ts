import { env } from "cloudflare:workers";
import { ApiError } from "../api/error.ts";
import type { CurrentUser } from "../auth/types.ts";
import { requireRole } from "../auth/index.ts";
import {
  workAssignment,
  workSubmission,
  submissionDetail,
  type Row,
} from "./work-access.ts";
import {
  object,
  text,
  evidence,
  version,
  gradeRubric,
  invalid,
  type Criterion,
} from "./work-validation.ts";
function conflict(
  message = "Draf berubah. Muat ulang sebelum menyimpan kembali.",
): never {
  throw new ApiError("CONFLICT", 409, message);
}
export async function ensureWork(user: CurrentUser, assignmentId: string) {
  const a = await workAssignment(user, assignmentId),
    now = new Date().toISOString();
  if (!a.rubric_json)
    throw new ApiError(
      "CONFLICT",
      409,
      "Gunakan ruang tugas sebelumnya untuk tugas lama.",
    );
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO submissions(id,assignment_id,student_id,answer_text,status,created_at,updated_at) VALUES(?,?,?,'','draft',?,?) ON CONFLICT(assignment_id,student_id) DO NOTHING`,
    ).bind(crypto.randomUUID(), assignmentId, user.id, now, now),
    env.DB.prepare(
      `INSERT INTO submission_work(submission_id,prior_learning) SELECT id,? FROM submissions WHERE assignment_id=? AND student_id=? ON CONFLICT(submission_id) DO NOTHING`,
    ).bind(a.kind === "prior_learning" ? 1 : 0, assignmentId, user.id),
  ]);
  return (await env.DB.prepare(
    "SELECT id FROM submissions WHERE assignment_id=? AND student_id=?",
  )
    .bind(assignmentId, user.id)
    .first<{ id: string }>())!.id;
}
export async function mutateWork(
  user: CurrentUser,
  id: string,
  input: unknown,
) {
  const b = object(input),
    sub = await workSubmission(user, id),
    v = version(b.version),
    action = String(b.action),
    now = new Date().toISOString();
  if (Number(sub.version ?? 0) !== v) conflict();
  const statements: D1PreparedStatement[] = [];
  let detail: unknown = b;
  if (["save", "submit", "portfolio"].includes(action)) {
    requireRole(user, "student");
    if (action === "save") {
      if (sub.status !== "draft")
        conflict("Karya sudah dikirim. Tunggu permintaan revisi tutor.");
      if (typeof b.answerText !== "string" || b.answerText.length > 5000)
        return invalid("Jawaban maksimal 5.000 karakter.");
      const links = evidence(b.evidence ?? []);
      if (typeof b.priorLearning !== "boolean")
        return invalid("Status pengajuan wajib.");
      statements.push(
        env.DB.prepare(
          "UPDATE submissions SET answer_text=?,updated_at=? WHERE id=?",
        ).bind(b.answerText, now, id),
        env.DB.prepare(
          "UPDATE submission_work SET evidence_json=?,prior_learning=? WHERE submission_id=?",
        ).bind(JSON.stringify(links), b.priorLearning ? 1 : 0, id),
      );
    } else if (action === "submit") {
      if (sub.status !== "draft") conflict("Karya sudah dikirim.");
      const files = await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM work_files WHERE submission_id=?",
      )
        .bind(id)
        .first<{ count: number }>();
      if (
        !String(sub.answer_text ?? "").trim() &&
        !JSON.parse(String(sub.evidence_json ?? "[]")).length &&
        !files?.count
      )
        return invalid("Isi jawaban atau lampirkan bukti sebelum mengirim.");
      const a = await workAssignment(user, String(sub.assignment_id));
      if (!a.allow_late && new Date(now) > new Date(String(a.personal_due_at)))
        conflict("Batas waktu telah lewat. Hubungi tutor untuk penyesuaian.");
      statements.push(
        env.DB.prepare(
          "UPDATE submissions SET status='submitted',submitted_at=?,updated_at=? WHERE id=?",
        ).bind(now, now, id),
        env.DB.prepare(
          "UPDATE submission_work SET revision_requested=0 WHERE submission_id=?",
        ).bind(id),
      );
    } else {
      if (sub.status !== "graded")
        conflict("Pilih karya yang sudah dinilai untuk portofolio.");
      if (typeof b.selected !== "boolean")
        return invalid("Pilihan portofolio tidak valid.");
      statements.push(
        env.DB.prepare(
          "UPDATE submission_work SET portfolio=? WHERE submission_id=?",
        ).bind(b.selected ? 1 : 0, id),
      );
    }
  } else if (["grade", "revise"].includes(action)) {
    requireRole(user, "teacher");
    if (sub.status !== "submitted" && sub.status !== "graded")
      conflict("Karya belum dikirim.");
    const feedback = text(b.feedback, 2000);
    if (action === "revise") {
      statements.push(
        env.DB.prepare(
          "UPDATE submissions SET status='draft',score=NULL,feedback=?,graded_by=?,graded_at=?,updated_at=? WHERE id=?",
        ).bind(feedback, user.id, now, now, id),
        env.DB.prepare(
          "UPDATE submission_work SET revision_requested=1,portfolio=0 WHERE submission_id=?",
        ).bind(id),
      );
    } else {
      if (!["supported", "insufficient"].includes(String(b.evidenceDecision)))
        return invalid("Tentukan validasi bukti karya.");
      const a = await env.DB.prepare(
        "SELECT rubric_json FROM assignment_work WHERE assignment_id=?",
      )
        .bind(sub.assignment_id)
        .first<{ rubric_json: string }>();
      if (!a)
        return invalid(
          "Tugas lama memakai penilaian pada ruang penilaian lama.",
        );
      const grade = gradeRubric(
        b.criteria,
        JSON.parse(a.rubric_json) as Criterion[],
      );
      if (sub.status === "graded") text(b.reason, 1000);
      detail = { ...b, computedScore: grade.score };
      statements.push(
        env.DB.prepare(
          "UPDATE submissions SET status='graded',score=?,feedback=?,graded_by=?,graded_at=?,updated_at=? WHERE id=?",
        ).bind(grade.score, feedback, user.id, now, now, id),
      );
    }
  } else return invalid("Tindakan karya tidak valid.");
  await commitWork(user, sub, v, action, detail, statements);
  return submissionDetail(user, id);
}
export async function commitWork(
  user: CurrentUser,
  sub: Row,
  v: number,
  event: string,
  detail: unknown,
  statements: D1PreparedStatement[],
) {
  const id = String(sub.id),
    now = new Date().toISOString();
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO submission_history VALUES(?,?,?,?,?,?)").bind(
        crypto.randomUUID(),
        id,
        user.id,
        event,
        JSON.stringify({ expectedVersion: v, before: sub, request: detail }),
        now,
      ),
      ...statements,
      env.DB.prepare(
        "UPDATE submission_work SET version=version+1 WHERE submission_id=?",
      ).bind(id),
    ]);
  } catch (e) {
    if (e instanceof Error && e.message.includes("Work version conflict"))
      conflict();
    throw e;
  }
}
