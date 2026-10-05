import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { validateCurriculum } from "../server/data/curriculum-input.ts";
import { competencyAccess } from "../server/data/competency-access.ts";

const migrations = [
  "0003_overrated_reaper",
  "0004_oval_red_hulk",
  "0005_curriculum_guards",
  "0006_long_silver_surfer",
  "0007_nifty_aqueduct",
];
function database(seed = true) {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys=ON");
  d.exec(readFileSync("drizzle/0000_foamy_daredevil.sql", "utf8"));
  if (seed) d.exec(readFileSync("db/seed.sql", "utf8"));
  for (const migration of migrations)
    d.exec(readFileSync(`drizzle/${migration}.sql`, "utf8"));
  return d;
}
function version(d: DatabaseSync, n: string, skk: number) {
  d.prepare(
    "INSERT INTO curriculum_versions(id,code,name,framework,source_reference,effective_from,status,class_id,created_by,academic_year,program,created_at,updated_at) VALUES(?,?,?,'k13','UJI VALIDASI','2026-10-05','draft','cls_paket_c_10','usr_teacher_adi','2026/2027','Paket C','now','now')",
  ).run(`v${n}`, `v${n}`, `UJI VALIDASI ${n}`);
  d.prepare(
    "INSERT INTO competency_levels VALUES(?,?,?,'Tingkat',1,'now','now')",
  ).run(`l${n}`, `v${n}`, n);
  d.prepare(
    "INSERT INTO competency_packages VALUES(?,?,?,'Paket',1,'now','now')",
  ).run(`p${n}`, `l${n}`, n);
  d.prepare(
    "INSERT INTO core_competencies VALUES(?,?,'KI','Deskripsi',1,'now','now')",
  ).run(`ki${n}`, `p${n}`);
  d.prepare(
    "INSERT INTO basic_competencies VALUES(?,?,'sub_sej','KD','Deskripsi','Tujuan',1,'now','now')",
  ).run(`kd${n}`, `ki${n}`);
  d.prepare(
    "INSERT INTO subject_skk_allocations(id,competency_package_id,subject_id,subject_group,planned_skk,created_at,updated_at,face_to_face_percent,tutorial_percent,independent_percent) VALUES(?,?,'sub_sej','general',?,'now','now',20,30,50)",
  ).run(`a${n}`, `p${n}`, skk);
}

test("forward migrations work on an empty database", () => {
  const d = database(false);
  assert.equal(
    d.prepare("SELECT count(*) AS n FROM curriculum_versions").get()?.n,
    0,
  );
  assert.deepEqual(d.prepare("PRAGMA foreign_key_check").all(), []);
  d.close();
});
test("forward migration preserves existing grades, submissions and progress", () => {
  const d = database();
  assert.equal(
    d
      .prepare(
        "SELECT percent FROM material_progress WHERE material_id='mat_surabaya'",
      )
      .get()?.percent,
    68,
  );
  assert.equal(
    d
      .prepare("SELECT status FROM submissions WHERE id='sub_refleksi_dudin'")
      .get()?.status,
    "submitted",
  );
  assert.equal(
    d.prepare("SELECT count(*) AS n FROM quiz_questions").get()?.n,
    2,
  );
  assert.deepEqual(d.prepare("PRAGMA foreign_key_check").all(), []);
  d.close();
});
test("active curriculum and cohort SKK remain unchanged when a new version appears", () => {
  const d = database();
  version(d, "old", 4);
  d.exec("UPDATE curriculum_versions SET status='active' WHERE id='vold'");
  d.exec(
    "INSERT INTO curriculum_assignments(id,curriculum_version_id,competency_package_id,class_id,student_id,assigned_at,status,created_at,updated_at,assigned_by) VALUES('cohort','vold','pold','cls_paket_c_10','usr_student_dudin','now','active','now','now','usr_teacher_adi')",
  );
  version(d, "new", 8);
  d.exec("UPDATE curriculum_versions SET status='active' WHERE id='vnew'");
  assert.throws(
    () =>
      d.exec(
        "UPDATE subject_skk_allocations SET planned_skk=99 WHERE id='aold'",
      ),
    /immutable/,
  );
  assert.throws(
    () =>
      d.exec(
        "UPDATE basic_competencies SET learner_outcome='changed' WHERE id='kdold'",
      ),
    /immutable/,
  );
  assert.throws(
    () =>
      d.exec("UPDATE curriculum_versions SET status='draft' WHERE id='vold'"),
    /immutable/,
  );
  assert.throws(
    () => d.exec("DELETE FROM competency_packages WHERE id='pold'"),
    /immutable/,
  );
  assert.equal(
    d
      .prepare(
        "SELECT SUM(a.planned_skk) AS skk FROM curriculum_assignments ca JOIN subject_skk_allocations a ON a.competency_package_id=ca.competency_package_id WHERE ca.student_id='usr_student_dudin'",
      )
      .get()?.skk,
    4,
  );
  assert.throws(
    () =>
      d.exec(
        "INSERT INTO curriculum_assignments(id,curriculum_version_id,competency_package_id,class_id,student_id,assigned_at,status,created_at,updated_at) VALUES('bad','vnew','pold','cls_paket_c_10','usr_student_dudin','now','active','now','now')",
      ),
    /Invalid curriculum assignment/,
  );
  d.close();
});
test("publication requires KD for material, quiz and assignment, legacy rows are quarantined", () => {
  const d = database();
  version(d, "one", 4);
  d.exec("UPDATE curriculum_versions SET status='active' WHERE id='vone'");
  for (const [table, resource, links, fk, kind, alias] of [
    [
      "materials",
      "mat_surabaya",
      "material_basic_competencies",
      "material_id",
      "material",
      "m",
    ],
    [
      "quizzes",
      "quiz_surabaya",
      "quiz_basic_competencies",
      "quiz_id",
      "quiz",
      "q",
    ],
    [
      "assignments",
      "asg_refleksi",
      "assignment_basic_competencies",
      "assignment_id",
      "assignment",
      "a",
    ],
  ] as const) {
    d.prepare(`UPDATE ${table} SET status='draft' WHERE id=?`).run(resource);
    assert.throws(
      () =>
        d
          .prepare(`UPDATE ${table} SET status='published' WHERE id=?`)
          .run(resource),
      /requires competency/,
    );
    d.prepare(`INSERT INTO ${links} VALUES(?,'kdone')`).run(resource);
    d.prepare(`UPDATE ${table} SET status='published' WHERE id=?`).run(
      resource,
    );
    assert.throws(
      () => d.prepare(`DELETE FROM ${links} WHERE ${fk}=?`).run(resource),
      /immutable/,
    );
    const sql = `SELECT ${alias}.id FROM ${table} ${alias} JOIN class_subjects cs ON cs.id=${alias}.class_subject_id WHERE ${competencyAccess(kind, alias, "'usr_student_dudin'")}`;
    assert.equal(d.prepare(sql).all().length, 0);
  }
  d.exec(
    "INSERT INTO curriculum_assignments(id,curriculum_version_id,competency_package_id,class_id,student_id,assigned_at,status,created_at,updated_at) VALUES('one','vone','pone','cls_paket_c_10','usr_student_dudin','now','active','now','now')",
  );
  assert.equal(
    d
      .prepare(
        `SELECT m.id FROM materials m JOIN class_subjects cs ON cs.id=m.class_subject_id WHERE ${competencyAccess("material", "m", "'usr_student_dudin'")}`,
      )
      .all().length,
    1,
  );
  assert.equal(
    d
      .prepare(
        `SELECT m.id FROM materials m JOIN class_subjects cs ON cs.id=m.class_subject_id WHERE ${competencyAccess("material", "m", "'someone-else'")}`,
      )
      .all().length,
    0,
  );
  d.close();
});
test("mapping validation rejects inconsistent SKK, negative mode percentages, duplicate KD and malformed input", () => {
  const row = {
    level: "5",
    package: "5.1",
    subjectId: "sub_sej",
    group: "general",
    ki: "3",
    kiDescription: "KI",
    kd: "3.1",
    description: "KD",
    outcome: "Belajar",
    skk: 4,
    face: 20,
    tutorial: 30,
    independent: 50,
  };
  const base = {
    classId: "class",
    code: "version",
    name: "Version",
    source: "Dokumen",
    effectiveFrom: "2026-10-05",
    rows: [row],
  };
  assert.equal(validateCurriculum(base).rows[0].skk, 4);
  for (const rows of [
    [row, row],
    [row, { ...row, kd: "3.2", skk: 5 }],
    [{ ...row, face: -1, independent: 71 }],
    [{ ...row, skk: 0 }],
    [{ ...row, outcome: "" }],
  ])
    assert.throws(() => validateCurriculum({ ...base, rows }));
  for (const value of [null, [], "bad", {}])
    assert.throws(() => validateCurriculum(value));
});
