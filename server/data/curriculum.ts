import { env } from "cloudflare:workers";
import { ApiError } from "../api/error.ts";
import { requireRole } from "../auth/authorize.ts";
import type { CurrentUser } from "../auth/types.ts";
import {
  objectInput,
  requiredText,
  validateCurriculum,
} from "./curriculum-input.ts";

type Row = Record<string, string | number | null>;
const mappingSql = `SELECT bc.*, ki.code AS ki_code, ki.description AS ki_description,
  cp.id AS package_id, cp.code AS package_code, cl.code AS level_code,
  cl.curriculum_version_id AS version_id, s.name AS subject,
  a.planned_skk, a.subject_group, a.face_to_face_percent, a.tutorial_percent, a.independent_percent
  FROM basic_competencies bc JOIN core_competencies ki ON ki.id=bc.core_competency_id
  JOIN competency_packages cp ON cp.id=ki.competency_package_id
  JOIN competency_levels cl ON cl.id=cp.competency_level_id
  JOIN subjects s ON s.id=bc.subject_id
  JOIN subject_skk_allocations a ON a.competency_package_id=cp.id AND a.subject_id=bc.subject_id`;

async function all(sql: string, ...values: (string | number)[]) {
  return (
    await env.DB.prepare(sql)
      .bind(...values)
      .all<Row>()
  ).results;
}

export async function readCurriculum(user: CurrentUser) {
  requireRole(user, "teacher", "student");
  const teacher = user.role === "teacher";
  const classes = teacher
    ? await all(
        "SELECT * FROM classes WHERE teacher_id=? AND status='active'",
        user.id,
      )
    : [];
  const versions = teacher
    ? await all(
        "SELECT v.* FROM curriculum_versions v JOIN classes c ON c.id=v.class_id WHERE c.teacher_id=? ORDER BY v.created_at DESC",
        user.id,
      )
    : await all(
        `SELECT DISTINCT v.* FROM curriculum_versions v JOIN curriculum_assignments ca ON ca.curriculum_version_id=v.id
      JOIN class_memberships cm ON cm.class_id=ca.class_id AND cm.student_id=ca.student_id
      WHERE ca.student_id=? AND cm.status='active'`,
        user.id,
      );
  const mappings = teacher
    ? await all(
        `${mappingSql} JOIN curriculum_versions v ON v.id=cl.curriculum_version_id JOIN classes c ON c.id=v.class_id WHERE c.teacher_id=? ORDER BY cl.order_index,cp.order_index,bc.order_index`,
        user.id,
      )
    : await all(
        `${mappingSql} WHERE EXISTS(SELECT 1 FROM curriculum_assignments ca JOIN class_memberships cm ON cm.class_id=ca.class_id AND cm.student_id=ca.student_id WHERE ca.competency_package_id=cp.id AND ca.student_id=? AND cm.status='active') ORDER BY cl.order_index,cp.order_index,bc.order_index`,
        user.id,
      );
  const assignments = teacher
    ? await all(
        `SELECT ca.*,u.display_name AS student_name FROM curriculum_assignments ca JOIN classes c ON c.id=ca.class_id
      JOIN users u ON u.id=ca.student_id WHERE c.teacher_id=? ORDER BY ca.assigned_at`,
        user.id,
      )
    : await all(
        "SELECT ca.*,u.display_name AS student_name FROM curriculum_assignments ca JOIN users u ON u.id=ca.student_id JOIN class_memberships cm ON cm.class_id=ca.class_id AND cm.student_id=ca.student_id WHERE ca.student_id=? AND cm.status='active'",
        user.id,
      );
  const visibleMappings = teacher
    ? mappings
    : mappings.filter((m) =>
        assignments.some((a) => a.competency_package_id === m.package_id),
      );
  const allocations = new Map<string, Row>();
  visibleMappings.forEach((m) =>
    allocations.set(`${m.package_id}/${m.subject_id}`, m),
  );
  const totals = assignments.map((a) => ({
    assignmentId: a.id,
    studentId: a.student_id,
    studentName: a.student_name,
    packageId: a.competency_package_id,
    skk: [...allocations.values()]
      .filter((m) => m.package_id === a.competency_package_id)
      .reduce((sum, m) => sum + Number(m.planned_skk), 0),
  }));
  const totalsByStudent = new Map<
    string,
    { studentId: string; studentName: string; skk: number }
  >();
  for (const total of totals) {
    const studentId = String(total.studentId);
    const existing = totalsByStudent.get(studentId) ?? {
      studentId,
      studentName: String(total.studentName),
      skk: 0,
    };
    existing.skk += total.skk;
    totalsByStudent.set(studentId, existing);
  }
  const students = teacher
    ? await all(
        `SELECT cm.class_id,u.id,u.display_name FROM class_memberships cm JOIN classes c ON c.id=cm.class_id
    JOIN users u ON u.id=cm.student_id WHERE c.teacher_id=? AND cm.status='active' AND u.status='active'`,
        user.id,
      )
    : [];
  const subjects = teacher
    ? await all(
        "SELECT DISTINCT s.* FROM subjects s JOIN class_subjects cs ON cs.subject_id=s.id WHERE cs.teacher_id=?",
        user.id,
      )
    : [];
  const content: Row[] = [];
  if (teacher)
    for (const [table, kind, links, fk] of contentKinds) {
      content.push(
        ...(await all(
          `SELECT r.id,r.title,r.status,cs.class_id,cs.subject_id,'${kind}' AS kind,
      (SELECT group_concat(basic_competency_id) FROM ${links} WHERE ${fk}=r.id) AS competency_ids
      FROM ${table} r JOIN class_subjects cs ON cs.id=r.class_subject_id WHERE cs.teacher_id=?`,
          user.id,
        )),
      );
    }
  return {
    role: user.role,
    classes,
    versions,
    mappings: visibleMappings,
    assignments,
    totals,
    studentTotals: [...totalsByStudent.values()],
    students,
    subjects,
    content,
  };
}

const contentKinds = [
  ["materials", "material", "material_basic_competencies", "material_id"],
  ["quizzes", "quiz", "quiz_basic_competencies", "quiz_id"],
  [
    "assignments",
    "assignment",
    "assignment_basic_competencies",
    "assignment_id",
  ],
] as const;

async function ownClass(user: CurrentUser, id: string) {
  const c = await env.DB.prepare(
    "SELECT * FROM classes WHERE id=? AND teacher_id=? AND status='active'",
  )
    .bind(id, user.id)
    .first<Row>();
  if (!c)
    throw new ApiError(
      "NOT_FOUND",
      404,
      "Kelas tidak tersedia untuk tutor ini.",
    );
  return c;
}

export async function mutateCurriculum(user: CurrentUser, input: unknown) {
  requireRole(user, "teacher");
  const b = objectInput(input);
  const now = new Date().toISOString();
  const id = () => crypto.randomUUID();
  const statements: D1PreparedStatement[] = [];
  const add = (sql: string, ...values: (string | number | null)[]) =>
    statements.push(env.DB.prepare(sql).bind(...values));
  if (b.action === "class") {
    const name = requiredText(b.name, "Nama kelas", 200),
      year = requiredText(b.academicYear, "Tahun ajaran", 20),
      grade = requiredText(b.gradeLevel, "Kelas", 10);
    if (
      !/^\d{4}\/\d{4}$/.test(year) ||
      Number(year.slice(5)) !== Number(year.slice(0, 4)) + 1
    )
      throw new ApiError(
        "VALIDATION_ERROR",
        422,
        "Gunakan tahun ajaran seperti 2026/2027.",
      );
    if (!["10", "11", "12"].includes(grade))
      throw new ApiError(
        "VALIDATION_ERROR",
        422,
        "Pilih kelas 10, 11, atau 12.",
      );
    add(
      "INSERT INTO classes VALUES(?,?,'Paket C',?,?,?,'active',?,?)",
      id(),
      name,
      grade,
      year,
      user.id,
      now,
      now,
    );
  } else if (b.action === "subject") {
    const classId = requiredText(b.classId, "Kelas", 100);
    await ownClass(user, classId);
    const code = requiredText(b.code, "Kode mata pelajaran", 60),
      name = requiredText(b.name, "Nama mata pelajaran", 200);
    const existing = await env.DB.prepare(
      "SELECT id,name FROM subjects WHERE code=?",
    )
      .bind(code)
      .first<Row>();
    if (existing && existing.name !== name)
      throw new ApiError(
        "CONFLICT",
        409,
        "Kode sudah digunakan oleh mata pelajaran lain. Gunakan nama yang sama atau kode baru.",
      );
    const subjectId = existing ? String(existing.id) : id();
    if (!existing)
      add(
        "INSERT INTO subjects VALUES(?,?,?,?,?)",
        subjectId,
        code,
        name,
        now,
        now,
      );
    if (
      await env.DB.prepare(
        "SELECT id FROM class_subjects WHERE class_id=? AND subject_id=?",
      )
        .bind(classId, subjectId)
        .first()
    )
      throw new ApiError(
        "CONFLICT",
        409,
        "Mata pelajaran sudah ditugaskan pada kelas ini.",
      );
    add(
      "INSERT INTO class_subjects VALUES(?,?,?,?,?,?)",
      id(),
      classId,
      subjectId,
      user.id,
      now,
      now,
    );
  } else if (b.action === "create") {
    const v = validateCurriculum(b);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(v.effectiveFrom) ||
      Number.isNaN(Date.parse(v.effectiveFrom)) ||
      new Date(v.effectiveFrom).toISOString().slice(0, 10) !== v.effectiveFrom
    )
      throw new ApiError(
        "VALIDATION_ERROR",
        422,
        "Tanggal berlaku tidak valid.",
      );
    const c = await ownClass(user, v.classId);
    const allowed = await all(
      "SELECT subject_id FROM class_subjects WHERE class_id=? AND teacher_id=?",
      v.classId,
      user.id,
    );
    if (v.rows.some((r) => !allowed.some((s) => s.subject_id === r.subjectId)))
      throw new ApiError(
        "VALIDATION_ERROR",
        422,
        "Mata pelajaran di luar penugasan tutor.",
      );
    if (
      await env.DB.prepare("SELECT id FROM curriculum_versions WHERE code=?")
        .bind(v.code)
        .first()
    )
      throw new ApiError("CONFLICT", 409, "Kode versi sudah digunakan.");
    const versionId = id();
    add(
      `INSERT INTO curriculum_versions(id,code,name,framework,source_reference,effective_from,status,class_id,created_by,academic_year,program,created_at,updated_at)
      VALUES(?,?,?,'k13',?,?,'draft',?,?,?,?,?,?)`,
      versionId,
      v.code,
      v.name,
      v.source,
      v.effectiveFrom,
      v.classId,
      user.id,
      String(c.academic_year),
      String(c.program),
      now,
      now,
    );
    const levels = new Map<string, string>(),
      packages = new Map<string, string>(),
      cores = new Map<string, string>(),
      allocations = new Set<string>();
    for (const [index, r] of v.rows.entries()) {
      if (!levels.has(r.level)) {
        const levelId = id();
        levels.set(r.level, levelId);
        add(
          "INSERT INTO competency_levels VALUES(?,?,?,?,?,?,?)",
          levelId,
          versionId,
          r.level,
          r.level,
          index,
          now,
          now,
        );
      }
      const pk = JSON.stringify([r.level, r.package]);
      if (!packages.has(pk)) {
        const packageId = id();
        packages.set(pk, packageId);
        add(
          "INSERT INTO competency_packages VALUES(?,?,?,?,?,?,?)",
          packageId,
          levels.get(r.level)!,
          r.package,
          r.package,
          index,
          now,
          now,
        );
      }
      const packageId = packages.get(pk)!;
      const ck = JSON.stringify([pk, r.subjectId, r.ki]);
      if (!cores.has(ck)) {
        const coreId = id();
        cores.set(ck, coreId);
        add(
          "INSERT INTO core_competencies VALUES(?,?,?,?,?,?,?)",
          coreId,
          packageId,
          `${r.subjectId}:${r.ki}`,
          r.kiDescription,
          index,
          now,
          now,
        );
      }
      add(
        "INSERT INTO basic_competencies VALUES(?,?,?,?,?,?,?,?,?)",
        id(),
        cores.get(ck)!,
        r.subjectId,
        r.kd,
        r.description,
        r.outcome,
        index,
        now,
        now,
      );
      const ak = JSON.stringify([pk, r.subjectId]);
      if (!allocations.has(ak)) {
        allocations.add(ak);
        add(
          "INSERT INTO subject_skk_allocations(id,competency_package_id,subject_id,subject_group,planned_skk,created_at,updated_at,face_to_face_percent,tutorial_percent,independent_percent) VALUES(?,?,?,?,?,?,?,?,?,?)",
          id(),
          packageId,
          r.subjectId,
          r.group,
          r.skk,
          now,
          now,
          r.face,
          r.tutorial,
          r.independent,
        );
      }
    }
    for (const [mode, name] of [
      ["face_to_face", "Tatap muka"],
      ["tutorial", "Tutorial"],
      ["independent", "Mandiri"],
    ])
      add(
        "INSERT INTO learning_modes VALUES(?,?,?,?,?,?,?)",
        id(),
        versionId,
        mode,
        name,
        0,
        now,
        now,
      );
  } else if (b.action === "activate") {
    const versionId = requiredText(b.versionId, "Versi", 100);
    const v = await env.DB.prepare(
      "SELECT * FROM curriculum_versions WHERE id=?",
    )
      .bind(versionId)
      .first<Row>();
    if (!v || !v.class_id)
      throw new ApiError("NOT_FOUND", 404, "Versi tidak ditemukan.");
    await ownClass(user, String(v.class_id));
    if (v.status !== "draft")
      throw new ApiError(
        "CONFLICT",
        409,
        "Versi aktif terkunci. Buat versi baru untuk perubahan.",
      );
    add(
      "UPDATE curriculum_versions SET status='active',updated_at=? WHERE id=? AND status='draft'",
      now,
      versionId,
    );
  } else if (b.action === "assign") {
    const packageId = requiredText(b.packageId, "Paket", 100),
      studentId = requiredText(b.studentId, "Warga belajar", 100);
    const p = await env.DB.prepare(
      `SELECT cl.curriculum_version_id,v.class_id,v.status FROM competency_packages cp JOIN competency_levels cl ON cl.id=cp.competency_level_id JOIN curriculum_versions v ON v.id=cl.curriculum_version_id WHERE cp.id=?`,
    )
      .bind(packageId)
      .first<Row>();
    if (!p || p.status !== "active")
      throw new ApiError(
        "VALIDATION_ERROR",
        422,
        "Pilih paket dari versi aktif.",
      );
    await ownClass(user, String(p.class_id));
    if (
      await env.DB.prepare(
        "SELECT id FROM curriculum_assignments WHERE class_id=? AND student_id=? AND status='active' AND curriculum_version_id<>?",
      )
        .bind(String(p.class_id), studentId, String(p.curriculum_version_id))
        .first()
    )
      throw new ApiError(
        "CONFLICT",
        409,
        "Warga belajar masih mengikuti versi kurikulum lain pada kelas ini. Histori tidak ditimpa.",
      );
    if (
      !(await env.DB.prepare(
        "SELECT cm.student_id FROM class_memberships cm JOIN users u ON u.id=cm.student_id WHERE cm.class_id=? AND cm.student_id=? AND cm.status='active' AND u.role='student' AND u.status='active'",
      )
        .bind(p.class_id, studentId)
        .first())
    )
      throw new ApiError(
        "NOT_FOUND",
        404,
        "Warga belajar bukan anggota kelas.",
      );
    if (
      await env.DB.prepare(
        "SELECT id FROM curriculum_assignments WHERE competency_package_id=? AND student_id=?",
      )
        .bind(packageId, studentId)
        .first()
    )
      throw new ApiError(
        "CONFLICT",
        409,
        "Paket sudah ditetapkan kepada warga belajar ini.",
      );
    add(
      "INSERT INTO curriculum_assignments(id,curriculum_version_id,competency_package_id,class_id,student_id,assigned_at,status,created_at,updated_at,assigned_by) VALUES(?,?,?,?,?,?,'active',?,?,?)",
      id(),
      String(p.curriculum_version_id),
      packageId,
      String(p.class_id),
      studentId,
      now,
      now,
      now,
      user.id,
    );
  } else if (b.action === "publish") {
    const kind = contentKinds.find((k) => k[1] === b.kind);
    if (!kind)
      throw new ApiError(
        "VALIDATION_ERROR",
        422,
        "Jenis pembelajaran tidak valid.",
      );
    const [table, , links, fk] = kind;
    const resourceId = requiredText(b.resourceId, "Pembelajaran", 100);
    const r = await env.DB.prepare(
      `SELECT r.*,cs.class_id,cs.subject_id FROM ${table} r JOIN class_subjects cs ON cs.id=r.class_subject_id WHERE r.id=? AND cs.teacher_id=?`,
    )
      .bind(resourceId, user.id)
      .first<Row>();
    if (!r)
      throw new ApiError("NOT_FOUND", 404, "Pembelajaran tidak tersedia.");
    const existingLinks = await all(
      `SELECT basic_competency_id FROM ${links} WHERE ${fk}=?`,
      resourceId,
    );
    if (r.status === "published" && existingLinks.length)
      throw new ApiError(
        "CONFLICT",
        409,
        "Pemetaan pembelajaran terbit terkunci agar histori tetap utuh.",
      );
    if (
      !Array.isArray(b.competencyIds) ||
      !b.competencyIds.length ||
      b.competencyIds.length > 100
    )
      throw new ApiError(
        "VALIDATION_ERROR",
        422,
        "Pilih setidaknya satu KD sebelum menerbitkan.",
      );
    const ids = [
      ...new Set(b.competencyIds.map((v) => requiredText(v, "KD", 100))),
    ];
    for (const kd of ids) {
      const m = await env.DB.prepare(
        `${mappingSql} JOIN curriculum_versions v ON v.id=cl.curriculum_version_id WHERE bc.id=? AND v.class_id=? AND bc.subject_id=? AND v.status='active'`,
      )
        .bind(kd, r.class_id, r.subject_id)
        .first();
      if (!m)
        throw new ApiError(
          "VALIDATION_ERROR",
          422,
          "KD harus dari versi aktif pada kelas dan mata pelajaran yang sama.",
        );
    }
    if (b.kind === "material") {
      const sections = await all(
        "SELECT competency_id FROM material_sections WHERE material_id=?",
        resourceId,
      );
      if (
        sections.some((section) => !ids.includes(String(section.competency_id)))
      )
        throw new ApiError(
          "VALIDATION_ERROR",
          422,
          "Semua KD bagian modul harus disertakan saat penerbitan.",
        );
    }
    add(`DELETE FROM ${links} WHERE ${fk}=?`, resourceId);
    for (const kd of ids)
      add(`INSERT INTO ${links} VALUES(?,?)`, resourceId, kd);
    add(
      `UPDATE ${table} SET status='published',updated_at=? WHERE id=?`,
      now,
      resourceId,
    );
  } else throw new ApiError("VALIDATION_ERROR", 422, "Tindakan tidak valid.");
  add(
    "INSERT INTO curriculum_events VALUES(?,?,?,?,?)",
    id(),
    user.id,
    String(b.action),
    String(
      b.versionId ??
        b.packageId ??
        b.resourceId ??
        b.classId ??
        b.code ??
        b.name,
    ),
    now,
  );
  await env.DB.batch(statements);
  return readCurriculum(user);
}
