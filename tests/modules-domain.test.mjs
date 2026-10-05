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
const { saveModule, readModule, updateSection, moduleCatalog } = await import(
  moduleUrl("server/data/modules.ts")
);
const { updateMaterialProgress } = await import(
  moduleUrl("server/data/progress.ts")
);
const teacher = { id: "usr_teacher_adi", role: "teacher" },
  student = { id: "usr_student_dudin", role: "student" };
test("modular content, publication, section progress, prerequisites, audit and isolation", async () => {
  const mapping = await mutateCurriculum(teacher, {
    action: "create",
    classId: "cls_paket_c_10",
    code: "UJI-MOD",
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
        package: "5.1",
        subjectId: "sub_sej",
        group: "general",
        ki: "3",
        kiDescription: "UJI",
        kd: "3.2",
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
    classSubjectId: "cs_sej_10",
    title: "UJI Modul",
    summary: "UJI",
    orderIndex: 2,
    estimatedMinutes: 45,
    plannedSkk: 2,
    sections: [
      {
        title: "UJI Konteks",
        body: "Isi konteks dari D1",
        kind: "context",
        mode: "independent",
        competencyId: kd.id,
      },
      {
        title: "UJI Refleksi",
        body: "Jelaskan peristiwa di lingkunganmu",
        kind: "reflection",
        mode: "tutorial",
        competencyId: kd.id,
      },
    ],
  };
  await assert.rejects(() => saveModule(student, body), { status: 403 });
  await assert.rejects(() => moduleCatalog({ id: "admin", role: "admin" }), {
    status: 403,
  });
  await assert.rejects(
    () => saveModule({ id: "foreign", role: "teacher" }, body),
    { status: 404 },
  );
  await assert.rejects(
    () =>
      saveModule(teacher, {
        ...body,
        sections: [{ ...body.sections[0], competencyId: "foreign" }],
      }),
    { status: 422 },
  );
  await assert.rejects(
    () =>
      saveModule(teacher, {
        ...body,
        sections: [
          {
            ...body.sections[0],
            mediaUrl: "javascript:alert(1)",
            mediaType: "video",
          },
        ],
      }),
    { status: 422 },
  );
  await assert.rejects(() => saveModule(teacher, { ...body, sections: [] }), {
    status: 422,
  });
  await assert.rejects(() => saveModule(teacher, { ...body, plannedSkk: 5 }), {
    status: 422,
  });
  for (const field of ["orderIndex", "estimatedMinutes", "plannedSkk"])
    await assert.rejects(
      () => saveModule(teacher, { ...body, [field]: true }),
      { status: 422 },
    );
  const { id } = await saveModule(teacher, body);
  await saveModule(teacher, { ...body, id, title: "UJI Modul revisi draf" });
  const unmapped = await saveModule(teacher, {
    ...body,
    title: "UJI KD bagian",
    sections: [
      {
        ...body.sections[0],
        competencyId: mapping.mappings.find((m) => m.code === "3.2").id,
      },
    ],
  });
  await assert.rejects(
    () =>
      mutateCurriculum(teacher, {
        action: "publish",
        kind: "material",
        resourceId: unmapped.id,
        competencyIds: [kd.id],
      }),
    { status: 422 },
  );
  assert.equal(
    (await readModule(teacher, unmapped.id)).material.status,
    "draft",
  );
  await assert.rejects(() => readModule(student, id), { status: 404 });
  await assert.rejects(
    () => readModule({ id: "foreign", role: "teacher" }, id),
    { status: 404 },
  );
  await mutateCurriculum(teacher, {
    action: "publish",
    kind: "material",
    resourceId: id,
    competencyIds: [kd.id],
  });
  await assert.rejects(() => saveModule(teacher, { ...body, id }), {
    status: 409,
  });
  assert.throws(() =>
    db
      .prepare("UPDATE material_sections SET body='tamper' WHERE material_id=?")
      .run(id),
  );
  await assert.rejects(
    () =>
      updateMaterialProgress(student, id, {
        percent: 100,
        lastPosition: "fake",
      }),
    { status: 422 },
  );
  let d = await readModule(student, id);
  assert.equal(d.sections.length, 2);
  assert.equal(d.sections[0].body, "Isi konteks dari D1");
  assert.equal(d.settings.estimated_minutes, 45);
  assert.equal(d.settings.planned_skk, 2);
  assert.equal(d.allocations[0].planned_skk, 4);
  const [first, second] = d.sections.map((s) => s.id);
  await assert.rejects(
    () =>
      updateSection(student, id, { action: "complete", sectionId: "foreign" }),
    { status: 404 },
  );
  await assert.rejects(
    () => updateSection(teacher, id, { action: "complete", sectionId: first }),
    { status: 403 },
  );
  await assert.rejects(
    () =>
      updateSection(student, id, {
        action: "bookmark",
        sectionId: first,
        bookmarked: "yes",
      }),
    { status: 422 },
  );
  d = await updateSection(student, id, { action: "visit", sectionId: second });
  assert.equal(d.progress.percent, 0);
  assert.equal(d.sections[1].bookmarked, 0);
  assert.equal(d.progress.last_position, second);
  d = await updateSection(student, id, {
    action: "complete",
    sectionId: first,
    percent: 100,
  });
  assert.equal(d.progress.percent, 50);
  assert.equal(d.sections[0].bookmarked, 0);
  const completed = d.sections[0].completed_at;
  d = await updateSection(student, id, {
    action: "complete",
    sectionId: first,
  });
  assert.equal(d.progress.percent, 50);
  assert.equal(d.sections[0].completed_at, completed);
  d = await updateSection(student, id, {
    action: "bookmark",
    sectionId: second,
    bookmarked: true,
  });
  assert.equal(d.progress.percent, 50);
  assert.equal(d.sections[1].bookmarked, 1);
  await updateSection(student, id, {
    action: "help",
    sectionId: second,
    note: "UJI mohon penjelasan",
  });
  assert.equal(
    (await readModule(teacher, id)).events[0].note,
    "UJI mohon penjelasan",
  );
  assert.equal((await readModule(teacher, id)).stats[0].completed_count, 1);
  assert.deepEqual((await readModule(student, id)).events, []);
  db.exec(
    `INSERT INTO users (id,external_identity_id,email,display_name,role,status,created_at,updated_at) VALUES ('usr_other','dev:other','other@ruangtumbuh.local','UJI lain','student','active',datetime('now'),datetime('now')); INSERT INTO class_memberships VALUES('cls_paket_c_10','usr_other',datetime('now'),'active');`,
  );
  const other = { id: "usr_other", role: "student" };
  await assert.rejects(() => readModule(other, id), { status: 404 });
  await mutateCurriculum(teacher, {
    action: "assign",
    packageId: kd.package_id,
    studentId: other.id,
  });
  const isolated = await readModule(other, id);
  assert.equal(isolated.progress, null);
  assert.equal(isolated.sections[1].bookmarked, 0);
  assert.equal(isolated.sections[0].completed_at, null);
  await assert.rejects(() => readModule({ id: "admin", role: "admin" }, id), {
    status: 403,
  });
  await assert.rejects(
    () => saveModule(teacher, { ...body, prerequisiteId: "foreign" }),
    { status: 404 },
  );
  const follow = await saveModule(teacher, {
    ...body,
    title: "UJI Lanjutan",
    prerequisiteId: id,
    orderIndex: 3,
  });
  await mutateCurriculum(teacher, {
    action: "publish",
    kind: "material",
    resourceId: follow.id,
    competencyIds: [kd.id],
  });
  await assert.rejects(() => readModule(student, follow.id), { status: 409 });
  const nextSection = (await readModule(teacher, follow.id)).sections[0].id;
  await assert.rejects(
    () =>
      updateSection(student, follow.id, {
        action: "complete",
        sectionId: nextSection,
      }),
    { status: 409 },
  );
  d = await updateSection(student, id, {
    action: "complete",
    sectionId: second,
  });
  assert.equal(d.progress.percent, 100);
  assert.ok(d.progress.completed_at);
  assert.equal((await readModule(student, follow.id)).sections.length, 2);
  assert.equal((await readModule(student, id)).progress.last_position, second);
  db.prepare(
    "UPDATE class_memberships SET status='inactive' WHERE student_id=?",
  ).run(student.id);
  await assert.rejects(() => readModule(student, id), { status: 404 });
  await assert.rejects(
    () => updateSection(student, id, { action: "visit", sectionId: first }),
    { status: 404 },
  );
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
});
test("new module migrations also apply to empty database", () => {
  const empty = new DatabaseSync(":memory:");
  empty.exec("PRAGMA foreign_keys=ON");
  for (const file of [
    "0000_foamy_daredevil",
    "0003_overrated_reaper",
    "0004_oval_red_hulk",
    "0005_curriculum_guards",
    "0006_long_silver_surfer",
    "0007_nifty_aqueduct",
    "0008_breezy_marten_broadcloak",
    "0009_glamorous_masque",
    "0010_living_freak",
    "0011_cuddly_old_lace",
    "0012_module_guards",
    "0013_vengeful_goblin_queen",
  ])
    empty.exec(readFileSync(`drizzle/${file}.sql`, "utf8"));
  assert.deepEqual(empty.prepare("PRAGMA foreign_key_check").all(), []);
  empty.close();
});
