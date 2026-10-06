import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import test from "node:test";

// Execute the actual domain module with a SQLite-backed D1 adapter. Only the
// Worker environment import is substituted; authorization and SQL stay intact.
const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys=ON");
for (const file of [
  "drizzle/0000_foamy_daredevil.sql",
  "db/seed.sql",
  "drizzle/0003_overrated_reaper.sql",
  "drizzle/0004_oval_red_hulk.sql",
  "drizzle/0005_curriculum_guards.sql",
  "drizzle/0006_long_silver_surfer.sql",
  "drizzle/0007_nifty_aqueduct.sql",
  "drizzle/0008_breezy_marten_broadcloak.sql",
  "drizzle/0009_glamorous_masque.sql",
  "drizzle/0010_living_freak.sql",
  "drizzle/0011_cuddly_old_lace.sql",
  "drizzle/0012_module_guards.sql",
  "drizzle/0013_vengeful_goblin_queen.sql",
  "drizzle/0014_damp_veda.sql",
  "drizzle/0015_quiz_guards.sql",
  "drizzle/0016_luxuriant_marvel_apes.sql",
  "drizzle/0017_work_guards.sql",
  "drizzle/0018_polite_luckman.sql",
  "drizzle/0019_mentoring_guards.sql",
])
  db.exec(readFileSync(file, "utf8"));
function statement(sql, params = []) {
  const checkBindings = () =>
    assert.equal(
      (sql.match(/\?/g) ?? []).length,
      params.length,
      "D1 binding count",
    );
  return {
    bind(...values) {
      return statement(sql, values);
    },
    async all() {
      checkBindings();
      return { results: db.prepare(sql).all(...params) };
    },
    async first() {
      checkBindings();
      return db.prepare(sql).get(...params) ?? null;
    },
    async run() {
      checkBindings();
      return db.prepare(sql).run(...params);
    },
  };
}
globalThis.__curriculumTestDb = {
  prepare: statement,
  async batch(statements) {
    db.exec("BEGIN");
    try {
      const result = [];
      for (const s of statements) result.push(await s.run());
      db.exec("COMMIT");
      return result;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  },
};
function moduleUrl(path) {
  let source = stripTypeScriptTypes(readFileSync(path, "utf8"));
  source = source.replace(
    'import { env } from "cloudflare:workers";',
    "const env={DB:globalThis.__curriculumTestDb};",
  );
  source = source.replace(/from "(\.\.?\/[^\"]+)"/g, (_, relative) => {
    const url = new URL(
      relative,
      pathToFileURL(path.startsWith("/") ? path : process.cwd() + "/" + path),
    );
    const child = readFileSync(url, "utf8");
    return `from "${child.includes('from "cloudflare:workers"') ? moduleUrl(url.pathname) : url.href}"`;
  });
  return (
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
}
const { mutateCurriculum } = await import(
  moduleUrl("server/data/curriculum.ts")
);
const { readLearningPlans, mutateLearningPlans } = await import(
  moduleUrl("server/data/learning-plans.ts")
);
const { getStudentDashboard } = await import(
  moduleUrl("server/data/student-read.ts")
);
const { getStudentAssignment, saveAssignmentDraft, submitAssignment } =
  await import(moduleUrl("server/data/assignments.ts"));
const teacher = { id: "usr_teacher_adi", role: "teacher" };
const student = { id: "usr_student_dudin", role: "student" };

const {
  readMentoringDashboard,
  readMentoringDetail,
  mutateMentoring,
  readStudentInterventions,
  mentoringSignals,
} = await import(moduleUrl("server/data/mentoring.ts"));
test("priorities, append-only interventions, attendance and class isolation use real records", async () => {
  const mapping = await mutateCurriculum(teacher, {
    action: "create",
    classId: "cls_paket_c_10",
    code: "UJI-MENTOR",
    name: "UJI",
    source: "UJI",
    effectiveFrom: "2026-10-06",
    rows: [
      {
        level: "5",
        package: "5.1",
        subjectId: "sub_sej",
        group: "general",
        ki: "3",
        kiDescription: "UJI",
        kd: "3.1",
        description: "UJI",
        outcome: "Menjelaskan sejarah",
        skk: 4,
        face: 20,
        tutorial: 30,
        independent: 50,
      },
    ],
  });
  await mutateCurriculum(teacher, {
    action: "activate",
    versionId: mapping.versions[0].id,
  });
  await mutateCurriculum(teacher, {
    action: "assign",
    packageId: mapping.mappings[0].package_id,
    studentId: student.id,
  });
  for (const [kind, resourceId] of [
    ["material", "mat_surabaya"],
    ["assignment", "asg_refleksi"],
    ["quiz", "quiz_surabaya"],
  ])
    await mutateCurriculum(teacher, {
      action: "publish",
      kind,
      resourceId,
      competencyIds: [mapping.mappings[0].id],
    });
  const body = {
    classSubjectId: "cs_sej_10",
    studentId: student.id,
    kind: "remedial",
    detail: "UJI Pelajari kembali bagian sebab",
    dueAt: "2030-01-01T00:00:00Z",
  };
  for (const role of [student, { id: "admin", role: "admin" }]) {
    await assert.rejects(() => readMentoringDashboard(role), { status: 403 });
    await assert.rejects(() => mutateMentoring(role, body), { status: 403 });
  }
  await assert.rejects(
    () => mutateMentoring({ id: "foreign", role: "teacher" }, body),
    { status: 404 },
  );
  await assert.rejects(
    () => readMentoringDetail(teacher, "cs_sej_10", "foreign"),
    { status: 404 },
  );
  await assert.rejects(
    () => mutateMentoring(teacher, { ...body, detail: " " }),
    { status: 422 },
  );
  await assert.rejects(
    () => mutateMentoring(teacher, { ...body, kind: "mastery" }),
    { status: 422 },
  );
  await assert.rejects(
    () => mutateMentoring(teacher, { ...body, dueAt: "bad" }),
    { status: 422 },
  );
  const empty = await readMentoringDetail(teacher, "cs_sej_10", student.id);
  assert.equal(empty.interventions.length, 0);
  assert.equal(empty.mastery, null);
  assert.equal(empty.skk.awarded, null);
  assert.equal(empty.skk.planned, 4);
  const initial = mentoringSignals(empty, Date.parse("2040-01-01T00:00:00Z"));
  assert.equal(initial.overdue, 0);
  assert.equal(initial.waiting, 1);
  assert.ok(initial.labels.includes("Tidak aktif ≥7 hari"));
  const saved = await mutateMentoring(teacher, body);
  const remedial = saved.interventions[0];
  assert.equal(remedial.actor_name, "Adi Rama");
  assert.ok(remedial.created_at);
  assert.equal((await readStudentInterventions(student)).length, 1);
  await mutateMentoring(teacher, {
    ...body,
    kind: "note",
    detail: "Catatan privat tutor",
  });
  assert.equal((await readStudentInterventions(student)).length, 1);
  await mutateMentoring(teacher, {
    ...body,
    kind: "resolve",
    parentId: remedial.id,
    detail: "Sudah mendiskusikan bukti; belum keputusan mastery",
  });
  assert.equal((await readStudentInterventions(student)).length, 0);
  await assert.rejects(
    () =>
      mutateMentoring(teacher, {
        ...body,
        kind: "resolve",
        parentId: remedial.id,
      }),
    { status: 409 },
  );
  assert.throws(
    () => db.exec("UPDATE mentoring_events SET detail='changed'"),
    /immutable/,
  );
  assert.throws(() => db.exec("DELETE FROM mentoring_events"), /immutable/);
  await mutateLearningPlans(teacher, {
    action: "create",
    classSubjectId: "cs_sej_10",
    studentId: student.id,
    competencyId: mapping.mappings[0].id,
    title: "UJI Tutorial",
    mode: "tutorial",
    dueAt: "2020-01-01T00:00:00Z",
    instructions: "Diskusi bukti",
  });
  const plan = (await readLearningPlans(student)).plans[0];
  await mutateLearningPlans(teacher, {
    action: "replan",
    classSubjectId: "cs_sej_10",
    studentId: student.id,
    planId: plan.id,
    title: "UJI Tutorial ulang",
    instructions: "Alasan: butuh pendampingan tambahan",
    dueAt: "2030-01-01T00:00:00Z",
  });
  assert.equal(
    (await readLearningPlans(student)).plans[0].title,
    "UJI Tutorial ulang",
  );
  const change = db
    .prepare(
      "SELECT detail FROM learning_plan_events WHERE plan_id=? AND action='replan'",
    )
    .get(plan.id);
  assert.equal(JSON.parse(change.detail).previousTitle, "UJI Tutorial");
  await assert.rejects(
    () =>
      mutateLearningPlans(teacher, {
        action: "replan",
        classSubjectId: "cs_sej_10",
        studentId: student.id,
        planId: "foreign",
        title: "UJI",
        instructions: "UJI",
        dueAt: "2030-01-01T00:00:00Z",
      }),
    { status: 404 },
  );
  const attendance = {
    ...body,
    kind: "attendance",
    planId: plan.id,
    status: "present",
    detail: "UJI Daftar hadir",
  };
  await mutateMentoring(teacher, attendance);
  await mutateMentoring(teacher, {
    ...attendance,
    status: "excused",
    detail: "Koreksi dengan alasan",
  });
  let detail = await readMentoringDetail(teacher, "cs_sej_10", student.id);
  assert.equal(detail.attendance.length, 2);
  assert.equal(detail.attendance[0].status, "excused");
  assert.throws(() => db.exec("DELETE FROM attendance_events"), /immutable/);
  await assert.rejects(
    () => mutateMentoring(teacher, { ...attendance, planId: "foreign" }),
    { status: 404 },
  );
  await assert.rejects(
    () => mutateMentoring(teacher, { ...attendance, status: "bad" }),
    { status: 422 },
  );
  db.exec(
    "INSERT INTO quiz_attempts (id,quiz_id,student_id,status,score,started_at,completed_at) VALUES ('attempt-old','quiz_surabaya','usr_student_dudin','completed',20,'2026-01-01T00:00:00Z','2026-01-01T00:00:01Z'),('attempt-new','quiz_surabaya','usr_student_dudin','completed',100,'2026-01-02T00:00:00Z','2026-01-02T00:00:01Z')",
  );
  detail = await readMentoringDetail(teacher, "cs_sej_10", student.id);
  assert.equal(mentoringSignals(detail).remedial, 0);
  db.exec("UPDATE quiz_attempts SET score=30 WHERE id='attempt-new'");
  detail = await readMentoringDetail(teacher, "cs_sej_10", student.id);
  assert.equal(mentoringSignals(detail).remedial, 1);
  detail = await readMentoringDetail(teacher, "cs_sej_10", student.id);
  assert.equal(mentoringSignals(detail).waiting, 1);
  await mutateLearningPlans(teacher, {
    action: "deadline",
    classSubjectId: "cs_sej_10",
    studentId: student.id,
    assignmentId: "asg_refleksi",
    dueAt: "2030-01-01T00:00:00Z",
    reason: "UJI Penyesuaian",
  });
  detail = await readMentoringDetail(teacher, "cs_sej_10", student.id);
  assert.equal(detail.deadlines.length, 1);
  assert.equal(detail.assignments[0].due_at, "2030-01-01T00:00:00.000Z");
  assert.equal(
    (await readMentoringDashboard({ id: "foreign", role: "teacher" })).students
      .length,
    0,
  );
  db.exec(
    "UPDATE class_memberships SET status='inactive' WHERE student_id='usr_student_dudin'",
  );
  await assert.rejects(
    () => readMentoringDetail(teacher, "cs_sej_10", student.id),
    { status: 404 },
  );
  assert.equal((await readStudentInterventions(student)).length, 0);
  db.exec(
    "UPDATE class_memberships SET status='active' WHERE student_id='usr_student_dudin'; UPDATE classes SET status='archived'",
  );
  await assert.rejects(() => mutateMentoring(teacher, body), { status: 404 });
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
});

test("signals distinguish empty, recent, inactive, pending review and revisions", () => {
  const base = {
    materials: [],
    assignments: [],
    attempts: [],
    plans: [],
    interventions: [],
  };
  const now = Date.parse("2026-10-06T00:00:00Z");
  assert.deepEqual(mentoringSignals(base, now).labels, ["Belum mulai"]);
  assert.ok(
    mentoringSignals(
      { ...base, materials: [{ updated_at: "2026-10-05T00:00:00Z" }] },
      now,
    ).labels.includes("Sedang belajar"),
  );
  assert.ok(
    mentoringSignals(
      { ...base, materials: [{ updated_at: "2026-09-01T00:00:00Z" }] },
      now,
    ).labels.includes("Tidak aktif ≥7 hari"),
  );
  assert.ok(
    mentoringSignals(
      { ...base, materials: [{ updated_at: "2026-09-29T00:00:00Z" }] },
      now,
    ).labels.includes("Tidak aktif ≥7 hari"),
  );
  const d = {
    ...base,
    assignments: [
      {
        status: "draft",
        due_at: "2026-10-01T00:00:00Z",
        revision_requested: 1,
      },
    ],
    attempts: [
      {
        id: "x",
        quiz_id: "q",
        purpose: "formative",
        status: "completed",
        score: null,
        pending_review: 1,
        started_at: "2026-10-05T00:00:00Z",
      },
    ],
  };
  const result = mentoringSignals(d, now);
  assert.equal(result.overdue, 1);
  assert.equal(result.waiting, 1);
  assert.equal(result.revision, 1);
  assert.equal(result.remedial, 0);
});
