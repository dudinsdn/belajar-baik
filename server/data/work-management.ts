import { env } from "cloudflare:workers";
import { ApiError } from "../api/error.ts";
import { requireRole } from "../auth/index.ts";
import type { CurrentUser } from "../auth/types.ts";
import { moduleCatalog } from "./modules.ts";
import { rows } from "./work-access.ts";
import { object, text, rubric, invalid } from "./work-validation.ts";
export async function workCatalog(user: CurrentUser) {
  requireRole(user, "teacher");
  return {
    ...(await moduleCatalog(user)),
    assignments: await rows(
      `SELECT a.*,w.kind,w.rubric_json,w.planned_skk FROM assignments a JOIN class_subjects cs ON cs.id=a.class_subject_id JOIN classes c ON c.id=cs.class_id LEFT JOIN assignment_work w ON w.assignment_id=a.id WHERE cs.teacher_id=? AND c.status='active' ORDER BY a.created_at DESC`,
      user.id,
    ),
  };
}
export async function createWork(user: CurrentUser, input: unknown) {
  requireRole(user, "teacher");
  const b = object(input),
    catalog = await moduleCatalog(user),
    cs = text(b.classSubjectId, 100);
  if (!catalog.subjects.some((s) => s.id === cs))
    throw new ApiError("NOT_FOUND", 404, "Penugasan tidak tersedia.");
  if (!["task", "project", "skill", "prior_learning"].includes(String(b.kind)))
    return invalid("Jenis tugas tidak valid.");
  const criteria = rubric(b.rubric),
    title = text(b.title, 200),
    instructions = text(b.instructions),
    due = text(b.dueAt, 40);
  if (!Number.isFinite(Date.parse(due))) return invalid("Tenggat tidak valid.");
  if (typeof b.allowLate !== "boolean")
    return invalid("Aturan keterlambatan wajib.");
  const skk = Number(b.plannedSkk);
  if (!Number.isInteger(skk) || skk < 0 || skk > 100)
    return invalid("SKK terkait harus 0–100.");
  if (
    !Array.isArray(b.competencyIds) ||
    !b.competencyIds.length ||
    b.competencyIds.length > 20
  )
    return invalid("Pilih 1–20 KD.");
  const kd = [...new Set(b.competencyIds.map((v) => text(v, 100)))];
  if (
    kd.some(
      (id) =>
        !catalog.competencies.some(
          (k) => k.id === id && k.class_subject_id === cs,
        ),
    )
  )
    return invalid("KD harus berasal dari penugasan aktif.");
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO assignments(id,class_subject_id,title,instructions,submission_type,due_at,allow_late,status,author_id,created_at,updated_at) VALUES(?,?,?,?,'mixed',?,?,'draft',?,?,?)`,
    ).bind(
      id,
      cs,
      title,
      instructions,
      new Date(due).toISOString(),
      b.allowLate ? 1 : 0,
      user.id,
      now,
      now,
    ),
    env.DB.prepare("INSERT INTO assignment_work VALUES(?,?,?,?)").bind(
      id,
      String(b.kind),
      JSON.stringify(criteria),
      skk,
    ),
    env.DB.prepare("INSERT INTO curriculum_events VALUES(?,?,?,?,?)").bind(
      crypto.randomUUID(),
      user.id,
      "create_work",
      id,
      now,
    ),
    ...kd.map((k) =>
      env.DB.prepare(
        "INSERT INTO assignment_basic_competencies VALUES(?,?)",
      ).bind(id, k),
    ),
  ]);
  return { id };
}
export async function publishWork(user: CurrentUser, id: string) {
  requireRole(user, "teacher");
  const catalog = await workCatalog(user),
    a = catalog.assignments.find((a) => a.id === id);
  if (!a) throw new ApiError("NOT_FOUND", 404, "Tugas tidak ditemukan.");
  if (a.status !== "draft" || !a.rubric_json)
    throw new ApiError(
      "CONFLICT",
      409,
      "Hanya draf dengan rubrik dapat diterbitkan.",
    );
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE assignments SET status='published',updated_at=? WHERE id=? AND status='draft'",
    ).bind(now, id),
    env.DB.prepare("INSERT INTO curriculum_events VALUES(?,?,?,?,?)").bind(
      crypto.randomUUID(),
      user.id,
      "publish_work",
      id,
      now,
    ),
  ]);
  return { id };
}
