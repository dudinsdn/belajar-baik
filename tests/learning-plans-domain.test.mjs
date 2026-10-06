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
  "drizzle/0020_curious_shriek.sql",
  "drizzle/0021_skk_guards.sql",
])
  db.exec(readFileSync(file, "utf8"));
function statement(sql, params = []) {
  return {
    bind(...values) {
      return statement(sql, values);
    },
    async all() {
      return { results: db.prepare(sql).all(...params) };
    },
    async first() {
      return db.prepare(sql).get(...params) ?? null;
    },
    async run() {
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

test("personal plans, class atomicity, deadlines, feedback and resume respect access and preserve history", async () => {
  const mapping = await mutateCurriculum(teacher, {
    action: "create",
    classId: "cls_paket_c_10",
    code: "UJI-PLAN",
    name: "UJI",
    source: "UJI",
    effectiveFrom: "2026-10-05",
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
  const kd = mapping.mappings[0];
  await mutateCurriculum(teacher, {
    action: "activate",
    versionId: mapping.versions[0].id,
  });
  await mutateCurriculum(teacher, {
    action: "assign",
    packageId: kd.package_id,
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
      competencyIds: [kd.id],
    });
  const body = {
    action: "create",
    classSubjectId: "cs_sej_10",
    studentId: student.id,
    competencyId: kd.id,
    title: "UJI Rencana",
    mode: "independent",
    materialId: "mat_surabaya",
    dueAt: "2030-01-01T00:00:00Z",
    instructions: "Lanjutkan membaca",
  };
  await assert.rejects(() => mutateLearningPlans(student, body), {
    status: 403,
  });
  await assert.rejects(
    () => readLearningPlans({ id: "admin", role: "admin" }),
    { status: 403 },
  );
  await assert.rejects(
    () => mutateLearningPlans({ id: "foreign", role: "teacher" }, body),
    { status: 404 },
  );
  await assert.rejects(
    () => mutateLearningPlans(teacher, { ...body, mode: "invalid" }),
    { status: 422 },
  );
  await assert.rejects(
    () => mutateLearningPlans(teacher, { ...body, dueAt: "invalid" }),
    { status: 422 },
  );
  await assert.rejects(
    () => mutateLearningPlans(teacher, { ...body, competencyId: "foreign" }),
    { status: 422 },
  );
  await assert.rejects(
    () => mutateLearningPlans(teacher, { ...body, materialId: "foreign" }),
    { status: 422 },
  );
  await assert.rejects(
    () => mutateLearningPlans(teacher, { ...body, studentId: "foreign" }),
    { status: 404 },
  );
  assert.equal((await readLearningPlans(student)).plans.length, 0);
  await mutateLearningPlans(teacher, body);
  await mutateLearningPlans(teacher, {
    ...body,
    mode: "tutorial",
    materialId: null,
    title: "UJI Tutorial",
  });
  db.exec(
    `INSERT INTO users (id,external_identity_id,email,display_name,role,status,created_at,updated_at) VALUES ('other','other','other@test.local','Other','student','active','now','now'); INSERT INTO class_memberships VALUES ('cls_paket_c_10','other','now','active');`,
  );
  await assert.rejects(
    () => mutateLearningPlans(teacher, { ...body, studentId: "" }),
    { status: 422 },
  );
  assert.equal(db.prepare("SELECT COUNT(*) n FROM learning_plans").get().n, 2);
  assert.equal(
    (await readLearningPlans({ id: "other", role: "student" })).plans.length,
    0,
  );
  await mutateCurriculum(teacher, {
    action: "assign",
    packageId: kd.package_id,
    studentId: "other",
  });
  await mutateLearningPlans(teacher, { ...body, studentId: "" });
  assert.equal((await readLearningPlans(student)).plans.length, 3);
  assert.equal(
    (await readLearningPlans({ id: "other", role: "student" })).plans.length,
    1,
  );
  const ownPlan = (await readLearningPlans(student)).plans[0];
  await assert.rejects(
    () =>
      mutateLearningPlans(
        { id: "other", role: "student" },
        { action: "help", planId: ownPlan.id, reason: "UJI" },
      ),
    { status: 404 },
  );
  await mutateLearningPlans(student, {
    action: "help",
    planId: ownPlan.id,
    reason: "UJI Mohon arahan",
  });
  assert.equal(
    (await readLearningPlans(teacher)).plans.find((p) => p.id === ownPlan.id)
      .help_request,
    "UJI Mohon arahan",
  );
  const deadline = {
    action: "deadline",
    classSubjectId: "cs_sej_10",
    studentId: student.id,
    assignmentId: "asg_refleksi",
    dueAt: "2031-01-01T00:00:00Z",
    reason: "UJI Penyesuaian",
  };
  await mutateLearningPlans(teacher, deadline);
  await mutateLearningPlans(teacher, {
    ...deadline,
    dueAt: "2032-01-01T00:00:00Z",
  });
  assert.equal(
    (await getStudentAssignment(student, "asg_refleksi")).due_at,
    "2032-01-01T00:00:00.000Z",
  );
  assert.notEqual(
    (
      await getStudentAssignment(
        { id: "other", role: "student" },
        "asg_refleksi",
      )
    ).due_at,
    "2032-01-01T00:00:00.000Z",
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) n FROM assignment_deadline_events").get().n,
    2,
  );
  await mutateLearningPlans(teacher, {
    action: "support",
    classSubjectId: "cs_sej_10",
    studentId: student.id,
    reason: "UJI Hubungi tutor",
  });
  assert.equal(
    (await readLearningPlans(teacher)).students.find((s) => s.id === student.id)
      .reason,
    "UJI Hubungi tutor",
  );
  db.exec(
    "UPDATE submissions SET status='draft',graded_by='usr_teacher_adi' WHERE student_id='usr_student_dudin'",
  );
  let dashboard = await getStudentDashboard(student);
  assert.equal(dashboard.skk.planned, 4);
  assert.equal(dashboard.continueMaterial.id, "mat_surabaya");
  assert.equal(dashboard.continueMaterial.last_position, "halaman-12");
  assert.equal(dashboard.assignments[0].due_at, "2032-01-01T00:00:00.000Z");
  await saveAssignmentDraft(student, "asg_refleksi", "Jawaban UJI");
  await submitAssignment(student, "asg_refleksi");
  assert.equal((await getStudentDashboard(student)).assignments.length, 0);
  db.exec(
    `UPDATE submissions SET status='graded',feedback='UJI Pelajari kembali',graded_at='2026-10-05T10:00:00Z' WHERE student_id='usr_student_dudin'`,
  );
  dashboard = await getStudentDashboard(student);
  const feedback = dashboard.feedback[0];
  assert.ok(feedback);
  await assert.rejects(
    () =>
      mutateLearningPlans(
        { id: "other", role: "student" },
        { action: "acknowledge", submissionId: feedback.id },
      ),
    { status: 404 },
  );
  await mutateLearningPlans(student, {
    action: "acknowledge",
    submissionId: feedback.id,
  });
  assert.equal((await getStudentDashboard(student)).feedback.length, 0);
  db.exec(
    `UPDATE submissions SET graded_at='2026-10-06T10:00:00Z' WHERE student_id='usr_student_dudin'`,
  );
  assert.equal((await getStudentDashboard(student)).feedback.length, 1);
  db.exec(
    `UPDATE material_progress SET percent=100 WHERE student_id='usr_student_dudin'; UPDATE learning_plans SET due_at='2020-01-01T00:00:00Z' WHERE mode='tutorial'`,
  );
  const finished = await getStudentDashboard(student);
  assert.equal(finished.continueMaterial, null);
  assert.equal(finished.nextPlan, null);
  db.exec(
    `UPDATE class_memberships SET status='inactive' WHERE student_id='usr_student_dudin'`,
  );
  const revoked = await getStudentDashboard(student);
  assert.equal(revoked.continueMaterial, null);
  assert.equal(revoked.progress.started, 0);
  assert.equal(revoked.skk.planned, 0);
  assert.equal(revoked.plans.length, 0);
  assert.equal(revoked.feedback.length, 0);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(
    db
      .prepare(
        "SELECT COUNT(*) n FROM learning_plan_events WHERE action='create'",
      )
      .get().n,
    4,
  );
});

test("stage 2 migration works on an empty database without rewriting earlier migrations", () => {
  const fresh = new DatabaseSync(":memory:");
  fresh.exec("PRAGMA foreign_keys=ON");
  for (const file of [
    "drizzle/0000_foamy_daredevil.sql",
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
    "drizzle/0020_curious_shriek.sql",
    "drizzle/0021_skk_guards.sql",
  ])
    fresh.exec(readFileSync(file, "utf8"));
  assert.equal(
    fresh.prepare("SELECT COUNT(*) n FROM learning_plans").get().n,
    0,
  );
  assert.deepEqual(fresh.prepare("PRAGMA foreign_key_check").all(), []);
  fresh.close();
});
