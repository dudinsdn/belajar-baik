import { env } from "cloudflare:workers";
import { AuthError } from "../auth/errors.ts";
import { ApiError } from "../api/error.ts";
import type { CurrentUser } from "../auth/types.ts";
import { competencyAccess } from "./competency-access.ts";

type Row = Record<string, string | number | null>;
const invalid = (message: string): never => {
  throw new ApiError("VALIDATION_ERROR", 422, message);
};
function text(value: unknown, label: string, max = 10000): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    return invalid(`${label} harus diisi (maksimal ${max} karakter).`);
  return value.trim();
}
function role(user: CurrentUser, expected: string) {
  if (user.role !== expected)
    throw new AuthError("FORBIDDEN", 403, "Peran tidak diizinkan.");
}
async function all(sql: string, ...args: (string | number | null)[]) {
  return (
    await env.DB.prepare(sql)
      .bind(...args)
      .all<Row>()
  ).results;
}
export async function moduleCatalog(user: CurrentUser) {
  role(user, "teacher");
  return {
    subjects: await all(
      `SELECT cs.id,s.name,c.name AS class_name FROM class_subjects cs JOIN subjects s ON s.id=cs.subject_id JOIN classes c ON c.id=cs.class_id WHERE cs.teacher_id=? AND c.status='active'`,
      user.id,
    ),
    materials: await all(
      `SELECT m.* FROM materials m JOIN class_subjects cs ON cs.id=m.class_subject_id WHERE cs.teacher_id=? ORDER BY m.order_index`,
      user.id,
    ),
    competencies: await all(
      `SELECT bc.id,bc.code,bc.learner_outcome,cp.code AS package_code,v.code AS version_code,cs.id AS class_subject_id FROM basic_competencies bc JOIN core_competencies ki ON ki.id=bc.core_competency_id JOIN competency_packages cp ON cp.id=ki.competency_package_id JOIN competency_levels cl ON cl.id=cp.competency_level_id JOIN curriculum_versions v ON v.id=cl.curriculum_version_id JOIN class_subjects cs ON cs.class_id=v.class_id AND cs.subject_id=bc.subject_id WHERE cs.teacher_id=? AND v.status='active'`,
      user.id,
    ),
  };
}
async function accessible(user: CurrentUser, id: string) {
  let m: Row | null;
  if (user.role === "teacher")
    m = await env.DB.prepare(
      `SELECT m.*,s.name AS subject FROM materials m JOIN class_subjects cs ON cs.id=m.class_subject_id JOIN subjects s ON s.id=cs.subject_id WHERE m.id=? AND cs.teacher_id=?`,
    )
      .bind(id, user.id)
      .first<Row>();
  else {
    role(user, "student");
    m = await env.DB.prepare(
      `SELECT m.*,s.name AS subject FROM materials m JOIN class_subjects cs ON cs.id=m.class_subject_id JOIN classes c ON c.id=cs.class_id JOIN subjects s ON s.id=cs.subject_id JOIN class_memberships cm ON cm.class_id=cs.class_id WHERE m.id=? AND cm.student_id=? AND cm.status='active' AND c.status='active' AND m.status='published' AND ${competencyAccess("material", "m", "cm.student_id")}`,
    )
      .bind(id, user.id)
      .first<Row>();
  }
  if (!m) throw new ApiError("NOT_FOUND", 404, "Modul tidak ditemukan.");
  return m;
}
async function prerequisite(user: CurrentUser, id: string) {
  const settings = await env.DB.prepare(
    "SELECT * FROM material_module_settings WHERE material_id=?",
  )
    .bind(id)
    .first<Row>();
  if (user.role === "student" && settings?.prerequisite_id) {
    const prior = await accessible(user, String(settings.prerequisite_id));
    const progress = await env.DB.prepare(
      "SELECT completed_at FROM material_progress WHERE material_id=? AND student_id=?",
    )
      .bind(settings.prerequisite_id, user.id)
      .first<Row>();
    if (!progress?.completed_at)
      throw new ApiError(
        "CONFLICT",
        409,
        `Selesaikan modul prasyarat “${prior.title}” terlebih dahulu.`,
      );
  }
  return settings;
}
export async function readModule(user: CurrentUser, id: string) {
  const material = await accessible(user, id);
  const settings = await prerequisite(user, id);
  const stats =
    user.role === "teacher"
      ? await all(
          `SELECT ms.id,ms.title,COUNT(sp.completed_at) AS completed_count,COUNT(sp.section_id) AS started_count,(SELECT COUNT(*) FROM material_section_events e WHERE e.section_id=ms.id AND e.action='help') AS help_count FROM material_sections ms LEFT JOIN material_section_progress sp ON sp.section_id=ms.id WHERE ms.material_id=? GROUP BY ms.id ORDER BY ms.order_index`,
          id,
        )
      : [];
  const allocations = await all(
    `SELECT DISTINCT cp.code AS package_code, sa.planned_skk,sa.face_to_face_percent,sa.tutorial_percent,sa.independent_percent FROM material_basic_competencies link JOIN basic_competencies bc ON bc.id=link.basic_competency_id JOIN core_competencies ki ON ki.id=bc.core_competency_id JOIN competency_packages cp ON cp.id=ki.competency_package_id JOIN subject_skk_allocations sa ON sa.competency_package_id=cp.id AND sa.subject_id=bc.subject_id WHERE link.material_id=?`,
    id,
  );
  const sections = await all(
    `SELECT ms.*,bc.code AS competency_code,bc.learner_outcome,sp.completed_at,COALESCE(sp.bookmarked,0) AS bookmarked FROM material_sections ms JOIN basic_competencies bc ON bc.id=ms.competency_id LEFT JOIN material_section_progress sp ON sp.section_id=ms.id AND sp.student_id=? WHERE ms.material_id=? ORDER BY ms.order_index`,
    user.id,
    id,
  );
  const events =
    user.role === "teacher"
      ? await all(
          `SELECT e.*,u.display_name,ms.title FROM material_section_events e JOIN material_sections ms ON ms.id=e.section_id JOIN users u ON u.id=e.actor_id WHERE ms.material_id=? AND e.action='help' ORDER BY e.created_at DESC LIMIT 100`,
          id,
        )
      : [];
  const progress = await env.DB.prepare(
    `SELECT * FROM material_progress WHERE material_id=? AND student_id=?`,
  )
    .bind(id, user.id)
    .first<Row>();
  return { material, sections, events, progress, settings, stats, allocations };
}
export async function saveModule(user: CurrentUser, input: unknown) {
  role(user, "teacher");
  if (!input || typeof input !== "object" || Array.isArray(input))
    return invalid("Data modul tidak valid.");
  const b = input as Record<string, unknown>;
  const classSubjectId = text(b.classSubjectId, "Mata pelajaran", 100);
  const cs = await env.DB.prepare(
    `SELECT cs.* FROM class_subjects cs JOIN classes c ON c.id=cs.class_id WHERE cs.id=? AND cs.teacher_id=? AND c.status='active'`,
  )
    .bind(classSubjectId, user.id)
    .first<Row>();
  if (!cs) throw new ApiError("NOT_FOUND", 404, "Penugasan tidak ditemukan.");
  const materialId = b.id ? text(b.id, "Modul", 100) : crypto.randomUUID();
  if (b.id) {
    const m = await accessible(user, materialId);
    if (m.status !== "draft" || m.class_subject_id !== classSubjectId)
      throw new ApiError(
        "CONFLICT",
        409,
        "Modul terbit terkunci. Buat draf baru untuk revisi.",
      );
  }
  const title = text(b.title, "Judul", 200),
    summary = text(b.summary, "Ringkasan", 2000);
  if (typeof b.orderIndex !== "number")
    return invalid("Urutan harus berupa angka.");
  const order = Number(b.orderIndex);
  if (!Number.isSafeInteger(order) || order < 1 || order > 10000)
    return invalid("Urutan harus 1–10000.");
  if (
    !Array.isArray(b.sections) ||
    !b.sections.length ||
    b.sections.length > 50
  )
    return invalid("Isi 1–50 bagian modul.");
  if (
    b.estimatedMinutes !== undefined &&
    typeof b.estimatedMinutes !== "number"
  )
    return invalid("Estimasi harus berupa angka.");
  const estimatedMinutes = Number(b.estimatedMinutes ?? 30);
  if (
    !Number.isSafeInteger(estimatedMinutes) ||
    estimatedMinutes < 1 ||
    estimatedMinutes > 10000
  )
    return invalid("Estimasi menit harus 1–10000.");
  const prerequisiteId = b.prerequisiteId
    ? text(b.prerequisiteId, "Prasyarat", 100)
    : null;
  if (prerequisiteId) {
    const previous = await accessible(user, prerequisiteId);
    if (
      previous.id === materialId ||
      previous.class_subject_id !== classSubjectId ||
      previous.status !== "published"
    )
      return invalid(
        "Prasyarat harus modul terbit lain pada penugasan yang sama.",
      );
  }
  if (
    b.plannedSkk !== undefined &&
    b.plannedSkk !== null &&
    b.plannedSkk !== "" &&
    typeof b.plannedSkk !== "number" &&
    !(typeof b.plannedSkk === "string" && /^\d+$/.test(b.plannedSkk))
  )
    return invalid("Bobot SKK harus berupa angka.");
  const plannedSkk =
    b.plannedSkk === undefined || b.plannedSkk === null || b.plannedSkk === ""
      ? null
      : Number(b.plannedSkk);
  if (
    plannedSkk !== null &&
    (!Number.isSafeInteger(plannedSkk) || plannedSkk < 1)
  )
    return invalid("Bobot SKK rencana modul harus bilangan bulat positif.");
  const sections = [];
  for (const item of b.sections) {
    if (!item || typeof item !== "object")
      return invalid("Bagian tidak valid.");
    const s = item as Record<string, unknown>;
    const competencyId = text(s.competencyId, "KD", 100);
    const kd = await env.DB.prepare(
      `SELECT bc.id FROM basic_competencies bc JOIN core_competencies ki ON ki.id=bc.core_competency_id JOIN competency_packages cp ON cp.id=ki.competency_package_id JOIN competency_levels cl ON cl.id=cp.competency_level_id JOIN curriculum_versions v ON v.id=cl.curriculum_version_id WHERE bc.id=? AND v.class_id=? AND bc.subject_id=? AND v.status='active'`,
    )
      .bind(competencyId, cs.class_id, cs.subject_id)
      .first();
    if (!kd)
      return invalid(
        "KD harus dari versi aktif pada kelas dan mata pelajaran yang sama.",
      );
    if (plannedSkk !== null) {
      const allocation = await env.DB.prepare(
        `SELECT sa.planned_skk FROM basic_competencies bc JOIN core_competencies ki ON ki.id=bc.core_competency_id JOIN subject_skk_allocations sa ON sa.competency_package_id=ki.competency_package_id AND sa.subject_id=bc.subject_id WHERE bc.id=?`,
      )
        .bind(competencyId)
        .first<Row>();
      if (!allocation || plannedSkk > Number(allocation.planned_skk))
        return invalid(
          "Bobot modul tidak boleh melebihi alokasi SKK mata pelajaran pada KD bagian.",
        );
    }
    const kind = text(s.kind, "Jenis bagian", 50),
      mode = text(s.mode, "Mode belajar", 50);
    if (
      ![
        "identity",
        "context",
        "content",
        "activity",
        "practice",
        "reflection",
        "summary",
        "assessment",
        "evidence",
        "media",
      ].includes(kind) ||
      !["independent", "tutorial", "face_to_face"].includes(mode)
    )
      return invalid("Jenis atau mode bagian tidak valid.");
    let mediaUrl: string | null = null,
      mediaType: string | null = null;
    if (s.mediaUrl) {
      mediaUrl = text(s.mediaUrl, "URL media", 2000);
      let url: URL;
      try {
        url = new URL(mediaUrl);
      } catch {
        return invalid("URL media tidak valid.");
      }
      if (url.protocol !== "https:" || url.username || url.password)
        return invalid("Media harus memakai URL HTTPS tanpa kredensial.");
      mediaType = text(s.mediaType, "Jenis media", 10);
      if (!["audio", "video"].includes(mediaType))
        return invalid("Jenis media tidak valid.");
    }
    sections.push({
      mediaUrl,
      mediaType,
      title: text(s.title, "Judul bagian", 200),
      body: text(s.body, "Isi bagian", 30000),
      kind,
      mode,
      competencyId,
    });
  }
  const now = new Date().toISOString();
  const statements = [
    env.DB.prepare(
      `INSERT INTO materials(id,class_subject_id,title,summary,content,order_index,status,author_id,created_at,updated_at) VALUES(?,?,?,?,?,?,'draft',?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,summary=excluded.summary,content=excluded.content,order_index=excluded.order_index,updated_at=excluded.updated_at`,
    ).bind(
      materialId,
      classSubjectId,
      title,
      summary,
      sections.map((s) => s.body).join("\n\n"),
      order,
      user.id,
      now,
      now,
    ),
    env.DB.prepare(`DELETE FROM material_sections WHERE material_id=?`).bind(
      materialId,
    ),
  ];
  statements.push(
    env.DB.prepare(
      "INSERT INTO material_module_settings(material_id,prerequisite_id,estimated_minutes,planned_skk) VALUES(?,?,?,?) ON CONFLICT(material_id) DO UPDATE SET prerequisite_id=excluded.prerequisite_id,estimated_minutes=excluded.estimated_minutes,planned_skk=excluded.planned_skk",
    ).bind(materialId, prerequisiteId, estimatedMinutes, plannedSkk),
  );
  for (const [i, s] of sections.entries())
    statements.push(
      env.DB.prepare(
        `INSERT INTO material_sections(id,material_id,title,kind,body,mode,competency_id,order_index,media_url,media_type) VALUES(?,?,?,?,?,?,?,?,?,?)`,
      ).bind(
        crypto.randomUUID(),
        materialId,
        s.title,
        s.kind,
        s.body,
        s.mode,
        s.competencyId,
        i + 1,
        s.mediaUrl,
        s.mediaType,
      ),
    );
  statements.push(
    env.DB.prepare(`INSERT INTO curriculum_events VALUES(?,?,?,?,?)`).bind(
      crypto.randomUUID(),
      user.id,
      "save_module",
      JSON.stringify({ materialId }),
      now,
    ),
  );
  await env.DB.batch(statements);
  return { id: materialId };
}
export async function updateSection(
  user: CurrentUser,
  materialId: string,
  input: unknown,
) {
  role(user, "student");
  await accessible(user, materialId);
  await prerequisite(user, materialId);
  if (!input || typeof input !== "object")
    return invalid("Tindakan tidak valid.");
  const b = input as Record<string, unknown>;
  const sectionId = text(b.sectionId, "Bagian", 100);
  const section = await env.DB.prepare(
    `SELECT * FROM material_sections WHERE id=? AND material_id=?`,
  )
    .bind(sectionId, materialId)
    .first<Row>();
  if (!section) throw new ApiError("NOT_FOUND", 404, "Bagian tidak ditemukan.");
  if (!["visit", "complete", "bookmark", "help"].includes(String(b.action)))
    return invalid("Tindakan tidak valid.");
  const now = new Date().toISOString(),
    statements = [];
  if (b.action === "help")
    statements.push(
      env.DB.prepare(
        `INSERT INTO material_section_events VALUES(?,?,?,?,?,?)`,
      ).bind(
        crypto.randomUUID(),
        sectionId,
        user.id,
        "help",
        text(b.note, "Pertanyaan", 2000),
        now,
      ),
    );
  else {
    if (b.action === "bookmark" && typeof b.bookmarked !== "boolean")
      return invalid("Penanda tidak valid.");
    statements.push(
      env.DB.prepare(
        `INSERT INTO material_section_progress VALUES(?,?,?,?,?) ON CONFLICT(section_id,student_id) DO UPDATE SET completed_at=CASE WHEN ?='complete' THEN COALESCE(completed_at,excluded.completed_at) ELSE completed_at END,bookmarked=CASE WHEN ?='bookmark' THEN excluded.bookmarked ELSE bookmarked END,updated_at=excluded.updated_at`,
      ).bind(
        sectionId,
        user.id,
        b.action === "complete" ? now : null,
        b.action === "bookmark" && b.bookmarked === true ? 1 : 0,
        now,
        String(b.action),
        String(b.action),
      ),
    );
    if (b.action === "complete")
      statements.push(
        env.DB.prepare(
          `INSERT INTO material_section_events VALUES(?,?,?,?,?,?)`,
        ).bind(
          crypto.randomUUID(),
          sectionId,
          user.id,
          "complete",
          "Bagian ditandai selesai; bukan pengakuan kompetensi/SKK.",
          now,
        ),
      );
    statements.push(
      env.DB.prepare(
        `INSERT INTO material_progress(material_id,student_id,percent,last_position,completed_at,updated_at) SELECT ?,?,CAST(100.0*SUM(CASE WHEN sp.completed_at IS NOT NULL THEN 1 ELSE 0 END)/COUNT(*) AS INTEGER),?,CASE WHEN COUNT(*)=SUM(CASE WHEN sp.completed_at IS NOT NULL THEN 1 ELSE 0 END) THEN ? ELSE NULL END,? FROM material_sections ms LEFT JOIN material_section_progress sp ON sp.section_id=ms.id AND sp.student_id=? WHERE ms.material_id=? ON CONFLICT(material_id,student_id) DO UPDATE SET percent=excluded.percent,last_position=excluded.last_position,completed_at=COALESCE(material_progress.completed_at,excluded.completed_at),updated_at=excluded.updated_at`,
      ).bind(materialId, user.id, sectionId, now, now, user.id, materialId),
    );
  }
  await env.DB.batch(statements);
  return readModule(user, materialId);
}
