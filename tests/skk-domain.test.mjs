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
      const r = db.prepare(sql).run(...params);
      return { meta: { changes: r.changes } };
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
const { readSkk, decideSkk } = await import(moduleUrl("server/data/skk.ts"));
const { getStudentDashboard } = await import(
  moduleUrl("server/data/student-read.ts")
);
const { readMentoringDetail } = await import(
  moduleUrl("server/data/mentoring.ts")
);
const teacher = { id: "usr_teacher_adi", role: "teacher" },
  student = { id: "usr_student_dudin", role: "student" };
test("SKK requires scoped evidence, tutor mastery, immutable history and conflict protection", async () => {
  const mapping = await mutateCurriculum(teacher, {
    action: "create",
    classId: "cls_paket_c_10",
    code: "UJI-SKK",
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
  await mutateCurriculum(teacher, {
    action: "publish",
    kind: "assignment",
    resourceId: "asg_refleksi",
    competencyIds: [mapping.mappings[0].id],
  });
  let view = await readSkk(student),
    a = view.allocations[0];
  assert.deepEqual(view.totals, { planned: 4, earned: 0, remaining: 4 });
  const body = {
    assignmentId: a.id,
    allocationId: a.allocation_id,
    reason: "Bukti sudah ditinjau",
    revision: 0,
  };
  await assert.rejects(
    () => decideSkk(student, { ...body, action: "credit", status: "awarded" }),
    { status: 403 },
  );
  await assert.rejects(() => readSkk({ id: "admin", role: "admin" }), {
    status: 403,
  });
  assert.equal(
    (await readSkk({ id: "foreign", role: "teacher" })).allocations.length,
    0,
  );
  await assert.rejects(
    () =>
      decideSkk(
        { id: "foreign", role: "teacher" },
        { ...body, action: "credit", status: "awarded" },
      ),
    { status: 404 },
  );
  await assert.rejects(
    () => decideSkk(teacher, { ...body, action: "credit", status: "awarded" }),
    { status: 422 },
  );
  await assert.rejects(
    () =>
      decideSkk(teacher, {
        ...body,
        reason: " ",
        action: "credit",
        status: "rejected",
      }),
    { status: 422 },
  );
  const sid = db
    .prepare(
      "SELECT id FROM submissions WHERE assignment_id='asg_refleksi' AND student_id=?",
    )
    .get(student.id).id;
  db.prepare(
    "UPDATE submissions SET status='graded',score=80,graded_by=?,graded_at='2026-10-06' WHERE id=?",
  ).run(teacher.id, sid);
  const mastery = {
    ...body,
    action: "mastery",
    competencyId: a.competencies[0].id,
    evidenceKind: "submission",
    evidenceId: sid,
    status: "mastered",
  };
  await assert.rejects(
    () => decideSkk(teacher, { ...mastery, evidenceId: "foreign" }),
    { status: 422 },
  );
  await assert.rejects(
    () => decideSkk(teacher, { ...mastery, competencyId: "foreign" }),
    { status: 422 },
  );
  await mutateCurriculum(teacher, {
    action: "publish",
    kind: "quiz",
    resourceId: "quiz_surabaya",
    competencyIds: [mastery.competencyId],
  });
  db.prepare(
    "INSERT INTO quiz_attempts(id,quiz_id,student_id,status,score,started_at,completed_at) VALUES('skk-quiz','quiz_surabaya',?,'completed',NULL,'2026-10-06','2026-10-06')",
  ).run(student.id);
  await assert.rejects(
    () =>
      decideSkk(teacher, {
        ...mastery,
        evidenceKind: "quiz",
        evidenceId: "skk-quiz",
      }),
    { status: 422 },
  );
  db.exec("UPDATE quiz_attempts SET score=0 WHERE id='skk-quiz'");
  await assert.rejects(
    () =>
      decideSkk(teacher, {
        ...mastery,
        evidenceKind: "quiz",
        evidenceId: "skk-quiz",
      }),
    { status: 422 },
  );
  await decideSkk(teacher, mastery);
  await assert.rejects(() => decideSkk(teacher, mastery), { status: 409 });
  assert.equal((await readSkk(student)).allocations[0].ledgerStatus, "pending");
  await assert.rejects(
    () =>
      decideSkk(teacher, { ...body, action: "credit", status: "recognized" }),
    { status: 422 },
  );
  await decideSkk(teacher, { ...body, action: "credit", status: "awarded" });
  assert.deepEqual((await readSkk(student)).totals, {
    planned: 4,
    earned: 4,
    remaining: 0,
  });
  await assert.rejects(() => decideSkk(teacher, { ...mastery, revision: 1 }), {
    status: 422,
  });
  await assert.rejects(
    () => decideSkk(teacher, { ...body, action: "credit", status: "awarded" }),
    { status: 409 },
  );
  assert.throws(
    () => db.exec("UPDATE skk_decisions SET credits=999"),
    /immutable/,
  );
  assert.throws(() => db.exec("DELETE FROM mastery_decisions"), /immutable/);
  await decideSkk(teacher, {
    ...body,
    revision: 1,
    action: "credit",
    status: "revoked",
  });
  assert.deepEqual((await readSkk(student)).totals, {
    planned: 4,
    earned: 0,
    remaining: 4,
  });
  assert.equal((await readSkk(student)).allocations[0].history.length, 2);
  await decideSkk(teacher, {
    ...mastery,
    revision: 1,
    status: "needs_revision",
  });
  await assert.rejects(
    () =>
      decideSkk(teacher, {
        ...body,
        revision: 2,
        action: "credit",
        status: "awarded",
      }),
    { status: 422 },
  );
  let nextMasteryRevision = 2;
  for (const mode of [
    "face_to_face",
    "tutorial_sync",
    "tutorial_async",
    "independent",
  ]) {
    const planId = "skk-plan-" + mode;
    const storedMode = mode.startsWith("tutorial") ? "tutorial" : mode;
    db.prepare(
      "INSERT INTO learning_plans(id,class_subject_id,student_id,competency_id,title,mode,material_id,due_at,instructions,created_by,created_at,updated_at) VALUES(?,'cs_sej_10',?,?,?,?,'mat_surabaya','2030-01-01','UJI',?,'2026-10-06','2026-10-06')",
    ).run(
      planId,
      student.id,
      mastery.competencyId,
      planId,
      storedMode,
      teacher.id,
    );
    if (storedMode === "independent")
      db.prepare(
        "UPDATE material_progress SET percent=100 WHERE student_id=? AND material_id='mat_surabaya'",
      ).run(student.id);
    else
      db.prepare(
        "INSERT INTO attendance_events(id,plan_id,status,reason,actor_id,created_at) VALUES(?,?,'present','UJI',?,'2026-10-06')",
      ).run("att-" + mode, planId, teacher.id);
    const activity = {
      ...mastery,
      evidenceKind: "activity",
      evidenceId: planId,
      revision: nextMasteryRevision,
      learningMode: mode,
      durationMinutes: 60,
      observation:
        "Warga belajar menjelaskan sebab dan akibat dengan bukti karya diskusi.",
    };
    await assert.rejects(
      () => decideSkk(teacher, { ...activity, observation: "" }),
      { status: 422 },
    );
    await assert.rejects(
      () => decideSkk(teacher, { ...activity, durationMinutes: 0 }),
      { status: 422 },
    );
    if (storedMode !== "independent") await decideSkk(teacher, activity);
    else {
      // An actual completed independent record is required; presence alone is insufficient.
      const hasProgress = db
        .prepare(
          "SELECT 1 FROM material_progress WHERE student_id=? AND material_id='mat_surabaya' AND percent=100",
        )
        .get(student.id);
      if (!hasProgress)
        db.prepare(
          "INSERT INTO material_progress(student_id,material_id,percent,last_position,bookmarked,updated_at) VALUES(?,'mat_surabaya',100,'UJI',0,'2026-10-06')",
        ).run(student.id);
      await decideSkk(teacher, activity);
    }
    nextMasteryRevision++;
  }
  db.prepare(
    "INSERT INTO submission_work(submission_id,prior_learning) VALUES(?,1)",
  ).run(sid);
  await decideSkk(teacher, { ...mastery, revision: nextMasteryRevision });
  await decideSkk(teacher, {
    ...body,
    revision: 2,
    action: "credit",
    status: "recognized",
  });
  const studentTotals = (await readSkk(student)).totals;
  assert.deepEqual((await getStudentDashboard(student)).skk, studentTotals);
  const tutorDetail = await readMentoringDetail(
    teacher,
    "cs_sej_10",
    student.id,
  );
  assert.equal(tutorDetail.skk.awarded, studentTotals.earned);
  assert.equal(tutorDetail.skk.planned, studentTotals.planned);
  assert.equal((await readSkk(student)).allocations[0].history.length, 3);
  assert.equal(
    (await readSkk(student)).allocations[0].ledgerStatus,
    "recognized",
  );
  db.exec("UPDATE class_memberships SET status='inactive'");
  assert.equal((await readSkk(student)).allocations.length, 0);
  await assert.rejects(
    () =>
      decideSkk(teacher, {
        ...body,
        revision: 2,
        action: "credit",
        status: "rejected",
      }),
    { status: 404 },
  );
});
