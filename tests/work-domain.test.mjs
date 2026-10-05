import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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
      const result = db.prepare(sql).run(...params);
      return { meta: { changes: Number(result.changes) }, results: [] };
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
const { createWork, publishWork, workCatalog } = await import(
  moduleUrl("server/data/work-management.ts")
);
const { ensureWork, mutateWork } = await import(
  moduleUrl("server/data/work-mutations.ts")
);
const { workDetail, submissionDetail, workPortfolio } = await import(
  moduleUrl("server/data/work-access.ts")
);
const { uploadWorkFile, downloadWorkFile } = await import(
  moduleUrl("server/data/work-files.ts")
);
const { saveAssignmentDraft, listStudentAssignments } = await import(
  moduleUrl("server/data/assignments.ts")
);
const { gradeSubmission } = await import(
  moduleUrl("server/data/teacher-grading.ts")
);
const teacher = { id: "usr_teacher_adi", role: "teacher" },
  student = { id: "usr_student_dudin", role: "student" };
test("work lifecycle, version conflicts, revision history, rubric scoring, files, portfolio and isolation", async () => {
  const mapping = await mutateCurriculum(teacher, {
    action: "create",
    classId: "cls_paket_c_10",
    code: "UJI-WORK",
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
      {
        level: "5",
        package: "5.2",
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

  const body = {
    title: "UJI Proyek",
    instructions: "UJI buat karya",
    classSubjectId: "cs_sej_10",
    kind: "project",
    competencyIds: [kd.id],
    dueAt: "2099-01-01T00:00:00Z",
    allowLate: false,
    plannedSkk: 1,
    rubric: [
      { label: "Proses", weight: 40 },
      { label: "Produk", weight: 60 },
    ],
  };
  await assert.rejects(() => createWork(student, body), { status: 403 });
  await assert.rejects(() => createWork({ ...teacher, id: "foreign" }, body), {
    status: 404,
  });
  await assert.rejects(
    () =>
      createWork(teacher, { ...body, rubric: [{ label: "UJI", weight: 50 }] }),
    { status: 422 },
  );
  await assert.rejects(
    () => createWork(teacher, { ...body, competencyIds: ["foreign"] }),
    { status: 422 },
  );
  const kd2 = mapping.mappings.find((k) => k.package_code === "5.2");
  const multi = await createWork(teacher, {
    ...body,
    title: "UJI semua KD wajib",
    competencyIds: [kd.id, kd2.id],
  });
  await publishWork(teacher, multi.id);
  await assert.rejects(() => workDetail(student, multi.id), { status: 404 });
  assert.equal(
    (await listStudentAssignments(student)).some((a) => a.id === multi.id),
    false,
  );
  const { id } = await createWork(teacher, body);
  await assert.rejects(() => workDetail(student, id), { status: 404 });
  await publishWork(teacher, id);
  assert.throws(
    () =>
      db
        .prepare(
          "UPDATE assignment_work SET rubric_json='[]' WHERE assignment_id=?",
        )
        .run(id),
    /immutable/,
  );
  assert.throws(
    () =>
      db
        .prepare("UPDATE assignments SET instructions='changed' WHERE id=?")
        .run(id),
    /immutable/,
  );
  const subId = await ensureWork(student, id);
  assert.equal(await ensureWork(student, id), subId);
  let d = await workDetail(student, id);
  assert.equal(d.competencies[0].package_code, "5.1");
  assert.equal(d.submission.version, 0);
  await assert.rejects(
    () => mutateWork(student, subId, { action: "submit", version: 0 }),
    { status: 422 },
  );
  await assert.rejects(
    () =>
      mutateWork(student, subId, {
        action: "save",
        version: 0,
        answerText: "UJI",
        evidence: [{ label: "bad", url: "javascript:alert(1)" }],
        priorLearning: false,
      }),
    { status: 422 },
  );
  await mutateWork(student, subId, {
    action: "save",
    version: 0,
    answerText: "UJI jawaban pertama",
    evidence: [{ label: "UJI tautan", url: "https://example.com/evidence" }],
    priorLearning: true,
  });
  await assert.rejects(
    () =>
      mutateWork(student, subId, {
        action: "save",
        version: 0,
        answerText: "stale",
        evidence: [],
        priorLearning: false,
      }),
    { status: 409 },
  );
  await assert.rejects(() => saveAssignmentDraft(student, id, "bypass"), {
    status: 409,
  });
  assert.equal(
    (await workDetail(student, id)).submission.answer_text,
    "UJI jawaban pertama",
  );
  const file = new File(
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0])],
    "uji.png",
    { type: "image/png" },
  );
  await uploadWorkFile(student, subId, file, 1);
  await assert.rejects(
    () =>
      uploadWorkFile(
        student,
        subId,
        new File(["<script>"], "bad.png", { type: "image/png" }),
        2,
      ),
    { status: 422 },
  );
  await assert.rejects(
    () =>
      uploadWorkFile(
        student,
        subId,
        new File([new Uint8Array(1048577)], "big.png", { type: "image/png" }),
        2,
      ),
    { status: 422 },
  );
  d = await submissionDetail(student, subId);
  assert.equal(d.files.length, 1);
  const response = await downloadWorkFile(teacher, d.files[0].id);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal((await response.arrayBuffer()).byteLength, 10);
  await assert.rejects(
    () => downloadWorkFile({ ...student, id: "other" }, d.files[0].id),
    { status: 404 },
  );
  await mutateWork(student, subId, { action: "submit", version: 2 });
  await assert.rejects(
    () =>
      mutateWork(student, subId, {
        action: "save",
        version: 3,
        answerText: "oops",
        evidence: [],
        priorLearning: false,
      }),
    { status: 409 },
  );
  await assert.rejects(
    () =>
      mutateWork(student, subId, {
        action: "grade",
        evidenceDecision: "supported",
        version: 3,
        feedback: "oops",
      }),
    { status: 403 },
  );
  await assert.rejects(() => gradeSubmission(teacher, subId, 99, "bypass"), {
    status: 409,
  });
  await mutateWork(teacher, subId, {
    action: "grade",
    evidenceDecision: "supported",
    version: 3,
    feedback: "UJI hasil",
    criteria: [
      { score: 50, comment: "Proses sebagian" },
      { score: 100, comment: "Produk lengkap" },
    ],
  });
  d = await submissionDetail(student, subId);
  assert.equal(d.submission.score, 80);
  assert.equal(d.submission.version, 4);
  await assert.rejects(
    () =>
      mutateWork(teacher, subId, {
        action: "grade",
        evidenceDecision: "supported",
        version: 4,
        feedback: "changed",
        criteria: [
          { score: 100, comment: "a" },
          { score: 100, comment: "b" },
        ],
      }),
    { status: 422 },
  );
  await mutateWork(student, subId, {
    action: "portfolio",
    version: 4,
    selected: true,
  });
  assert.equal(
    (await submissionDetail(student, subId)).submission.portfolio,
    1,
  );
  await mutateWork(teacher, subId, {
    action: "revise",
    version: 5,
    feedback: "UJI perbaiki proses",
  });
  await mutateWork(student, subId, {
    action: "save",
    version: 6,
    answerText: "UJI revisi kedua",
    evidence: [],
    priorLearning: true,
  });
  await mutateWork(student, subId, { action: "submit", version: 7 });
  await mutateWork(teacher, subId, {
    action: "grade",
    evidenceDecision: "supported",
    version: 8,
    feedback: "UJI selesai",
    criteria: [
      { score: 100, comment: "Proses diperbaiki" },
      { score: 100, comment: "Produk lengkap" },
    ],
  });
  d = await submissionDetail(student, subId);
  assert.equal(d.submission.score, 100);
  assert.equal(d.submission.portfolio, 0);
  assert.ok(d.history.some((h) => JSON.parse(h.snapshot_json).score === 80));
  assert.ok(
    d.history.some(
      (h) => JSON.parse(h.snapshot_json).answer === "UJI jawaban pertama",
    ),
  );
  assert.ok(d.history.some((h) => h.event === "revise" && h.display_name));
  assert.throws(
    () =>
      db
        .prepare("DELETE FROM submission_history WHERE submission_id=?")
        .run(subId),
    /immutable/,
  );
  assert.throws(
    () => db.prepare("DELETE FROM work_files WHERE submission_id=?").run(subId),
    /immutable/,
  );
  await assert.rejects(
    () => submissionDetail({ id: "foreign", role: "teacher" }, subId),
    { status: 404 },
  );
  await assert.rejects(
    () => submissionDetail({ id: "foreign", role: "admin" }, subId),
    { status: 403 },
  );
  await mutateWork(student, subId, {
    action: "portfolio",
    version: 9,
    selected: true,
  });
  assert.equal((await workPortfolio(student))[0].score, 100);
  const second = { id: "usr_work_second", role: "student" };
  db.exec(
    "INSERT INTO users VALUES('usr_work_second','dev:work:second','work-second@example.test','UJI Siswa Kedua','student','active','2026-10-06','2026-10-06'); INSERT INTO class_memberships VALUES('cls_paket_c_10','usr_work_second','2026-10-06','active');",
  );
  await mutateCurriculum(teacher, {
    action: "assign",
    packageId: kd.package_id,
    studentId: second.id,
  });
  assert.equal((await workDetail(second, id)).submission, null);
  await assert.rejects(() => submissionDetail(second, subId), { status: 404 });
  assert.deepEqual(await workPortfolio(second), []);
  const otherSub = await ensureWork(second, id);
  assert.notEqual(otherSub, subId);
  assert.equal(
    (await submissionDetail(second, otherSub)).submission.answer_text,
    "",
  );
  db.exec("UPDATE classes SET status='archived' WHERE id='cls_paket_c_10'");
  await assert.rejects(() => workDetail(student, id), { status: 404 });
  await assert.rejects(() => submissionDetail(teacher, subId), { status: 404 });
  db.exec("UPDATE classes SET status='active' WHERE id='cls_paket_c_10'");
  const late = await createWork(teacher, {
    ...body,
    title: "UJI tenggat lewat",
    dueAt: "2020-01-01T00:00:00Z",
  });
  await publishWork(teacher, late.id);
  const lateSub = await ensureWork(student, late.id);
  await mutateWork(student, lateSub, {
    action: "save",
    version: 0,
    answerText: "UJI terlambat",
    evidence: [],
    priorLearning: false,
  });
  await assert.rejects(
    () => mutateWork(student, lateSub, { action: "submit", version: 1 }),
    { status: 409 },
  );
  db.prepare(
    "UPDATE class_memberships SET status='inactive' WHERE student_id=?",
  ).run(student.id);
  await assert.rejects(() => submissionDetail(teacher, subId), { status: 404 });
  await assert.rejects(() => workDetail(student, id), { status: 404 });
  db.prepare(
    "UPDATE class_memberships SET status='active' WHERE student_id=?",
  ).run(student.id);
  db.prepare(
    "UPDATE curriculum_assignments SET status='withdrawn' WHERE student_id=?",
  ).run(student.id);
  await assert.rejects(() => workDetail(student, id), { status: 404 });
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  assert.ok((await workCatalog(teacher)).assignments.length);
});

test("all forward migrations work on empty database", () => {
  const empty = new DatabaseSync(":memory:");
  empty.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync("drizzle")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    empty.exec(readFileSync("drizzle/" + file, "utf8"));
  assert.deepEqual(empty.prepare("PRAGMA foreign_key_check").all(), []);
  empty.close();
});
