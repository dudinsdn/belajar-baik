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
  "drizzle/0009_glamorous_masque.sql",
  "drizzle/0010_living_freak.sql",
  "drizzle/0011_cuddly_old_lace.sql",
  "drizzle/0012_module_guards.sql",
  "drizzle/0013_vengeful_goblin_queen.sql",
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
let source = stripTypeScriptTypes(
  readFileSync("server/data/curriculum.ts", "utf8"),
);
source = source.replace(
  'import { env } from "cloudflare:workers";',
  "const env={DB:globalThis.__curriculumTestDb};",
);
source = source.replace(
  /from "(\.\.?\/[^\"]+)"/g,
  (_, relative) =>
    `from "${new URL(relative, pathToFileURL(process.cwd() + "/server/data/curriculum.ts")).href}"`,
);
const { readCurriculum, mutateCurriculum } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const teacher = { id: "usr_teacher_adi", role: "teacher" };
const student = { id: "usr_student_dudin", role: "student" };
const row = {
  level: "5",
  package: "5.1",
  subjectId: "sub_sej",
  group: "general",
  ki: "3",
  kiDescription: "UJI",
  kd: "3.1",
  description: "UJI",
  outcome: "UJI",
  skk: 4,
  face: 20,
  tutorial: 30,
  independent: 50,
};
const body = {
  action: "create",
  classId: "cls_paket_c_10",
  code: "UJI-1",
  name: "UJI-1",
  source: "UJI",
  effectiveFrom: "2026-10-05",
  rows: [row, { ...row, kd: "3.2" }, { ...row, package: "5.2", skk: 6 }],
};
test("domain creates D1 mapping, reconciles SKK, preserves old cohort and enforces access", async () => {
  await assert.rejects(() => mutateCurriculum(student, body), { status: 403 });
  await assert.rejects(() => readCurriculum({ id: "admin", role: "admin" }), {
    status: 403,
  });
  await assert.rejects(
    () => mutateCurriculum({ id: "another-tutor", role: "teacher" }, body),
    { status: 404 },
  );
  await assert.rejects(
    () =>
      mutateCurriculum(teacher, {
        ...body,
        rows: [{ ...row, subjectId: "sub_mat" }],
      }),
    { status: 422 },
  );
  assert.equal((await readCurriculum(student)).versions.length, 0);
  const created = await mutateCurriculum(teacher, body);
  const version = created.versions[0];
  assert.equal(created.mappings.length, 3);
  const packageIds = [...new Set(created.mappings.map((m) => m.package_id))];
  await assert.rejects(
    () =>
      mutateCurriculum(teacher, {
        action: "assign",
        packageId: packageIds[0],
        studentId: student.id,
      }),
    { status: 422 },
  );
  await mutateCurriculum(teacher, {
    action: "activate",
    versionId: version.id,
  });
  await assert.rejects(
    () =>
      mutateCurriculum(teacher, { action: "activate", versionId: version.id }),
    { status: 409 },
  );
  for (const packageId of packageIds)
    await mutateCurriculum(teacher, {
      action: "assign",
      packageId,
      studentId: student.id,
    });
  const before = await readCurriculum(student);
  assert.equal(
    before.totals.reduce((sum, t) => sum + t.skk, 0),
    10,
  );
  await assert.rejects(
    () =>
      mutateCurriculum(teacher, {
        action: "assign",
        packageId: packageIds[0],
        studentId: student.id,
      }),
    { status: 409 },
  );
  const newer = await mutateCurriculum(teacher, {
    ...body,
    code: "UJI-2",
    rows: [{ ...row, skk: 20 }],
  });
  const newVersion = newer.versions.find((v) => v.code === "UJI-2");
  await mutateCurriculum(teacher, {
    action: "activate",
    versionId: newVersion.id,
  });
  const after = await readCurriculum(student);
  assert.deepEqual(after, before);
  assert.equal(after.studentTotals[0].skk, 10);
  const newPackage = newer.mappings.find(
    (m) => m.version_id === newVersion.id,
  ).package_id;
  await assert.rejects(
    () =>
      mutateCurriculum(teacher, {
        action: "assign",
        packageId: newPackage,
        studentId: student.id,
      }),
    { status: 409 },
  );
  for (const [kind, resourceId] of [
    ["material", "mat_surabaya"],
    ["quiz", "quiz_surabaya"],
    ["assignment", "asg_refleksi"],
  ]) {
    await assert.rejects(
      () =>
        mutateCurriculum(teacher, {
          action: "publish",
          kind,
          resourceId,
          competencyIds: [],
        }),
      { status: 422 },
    );
    await assert.rejects(
      () =>
        mutateCurriculum(teacher, {
          action: "publish",
          kind,
          resourceId,
          competencyIds: ["foreign-kd"],
        }),
      { status: 422 },
    );
    await mutateCurriculum(teacher, {
      action: "publish",
      kind,
      resourceId,
      competencyIds: [created.mappings[0].id, created.mappings[1].id],
    });
    await assert.rejects(
      () =>
        mutateCurriculum(teacher, {
          action: "publish",
          kind,
          resourceId,
          competencyIds: [newer.mappings[0].id],
        }),
      { status: 409 },
    );
  }
  assert.equal(
    db
      .prepare(
        "SELECT count(*) AS n FROM curriculum_events WHERE actor_id='usr_teacher_adi'",
      )
      .get().n,
    9,
  );
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  await assert.rejects(
    () =>
      mutateCurriculum(teacher, {
        action: "class",
        name: "UJI",
        academicYear: "2026/2030",
        gradeLevel: "10",
      }),
    { status: 422 },
  );
  const withClass = await mutateCurriculum(teacher, {
    action: "class",
    name: "UJI KELAS",
    academicYear: "2027/2028",
    gradeLevel: "11",
  });
  const newClass = withClass.classes.find((c) => c.name === "UJI KELAS");
  assert.equal(newClass.program, "Paket C");
  const withSubject = await mutateCurriculum(teacher, {
    action: "subject",
    classId: newClass.id,
    code: "UJI-KTR",
    name: "UJI Keterampilan",
  });
  const subject = withSubject.subjects.find((s) => s.code === "UJI-KTR");
  assert.ok(subject);
  await assert.rejects(
    () =>
      mutateCurriculum(teacher, {
        action: "subject",
        classId: newClass.id,
        code: "UJI-KTR",
        name: "UJI Keterampilan",
      }),
    { status: 409 },
  );
  db.exec(
    "UPDATE class_memberships SET status='inactive' WHERE student_id='usr_student_dudin'",
  );
  const revoked = await readCurriculum(student);
  assert.equal(revoked.versions.length, 0);
  assert.equal(revoked.mappings.length, 0);
  assert.equal(revoked.assignments.length, 0);
});
