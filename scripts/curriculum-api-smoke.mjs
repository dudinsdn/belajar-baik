import assert from "node:assert/strict";

const base = "http://localhost:3000";
const teacher = {
  "oai-authenticated-user-id": "dev:teacher:adi",
  "oai-authenticated-user-email": "nerekab@gmail.com",
};
const student = {
  "oai-authenticated-user-id": "dev:student:dudin",
  "oai-authenticated-user-email": "dudin@ruangtumbuh.local",
};
async function request(
  headers,
  body,
  status = 200,
  path = "/api/v1/curriculum",
) {
  const response = await fetch(base + path, {
    headers: {
      ...headers,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  assert.equal(response.status, status, JSON.stringify(payload));
  return payload.data;
}
const initial = await request(teacher);
// Sites local middleware strips incoming identity headers. Switch .dev.vars
// between runs; one server always has exactly one simulated identity.
if (initial.role === "student") {
  await request(student, { action: "create" }, 403);
  const profile = await request(student, undefined, 200, "/api/v1/me");
  if (profile.id === "usr_student_uji_baru") {
    assert.equal(initial.versions.length, 0);
    assert.equal(initial.assignments.length, 0);
    assert.equal(initial.mappings.length, 0);
    assert.equal(initial.studentTotals.length, 0);
    console.log(
      "PASS: new validation learner has no assigned curriculum or inherited SKK; writes denied",
    );
    process.exit(0);
  }
  assert.ok(
    initial.versions.some((v) => String(v.code).startsWith("UJI-TAHAP1-")),
  );
  assert.ok(!initial.versions.some((v) => String(v.code).endsWith("-V2")));
  assert.equal(
    initial.totals.reduce((sum, t) => sum + t.skk, 0),
    10,
  );
  assert.equal(initial.studentTotals[0].skk, 10);
  console.log(
    "PASS: student reads assigned curriculum, 10 SKK reconciled, unassigned V2 hidden, writes denied",
  );
  process.exit(0);
}
assert.equal(initial.role, "teacher");
await request(teacher, { action: "create" }, 422);
console.log("PASS: teacher read and invalid input denied");
if (!process.argv.includes("--write")) {
  console.log(
    "Read-only smoke complete. Use --write to create explicitly labelled local validation versions and assignments.",
  );
} else {
  assert.ok(initial.classes.length, "Provision a local tutor class first.");
  const classId = initial.classes[0].id;
  const subjectId = initial.subjects[0].id;
  const studentId = initial.students.find((s) => s.class_id === classId)?.id;
  assert.ok(studentId, "Provision a local class membership first.");
  const stamp = Date.now();
  const row = {
    level: "5",
    package: "5.1",
    subjectId,
    group: "general",
    ki: "3",
    kiDescription: "UJI VALIDASI — pemahaman sejarah",
    kd: "3.1",
    description: "UJI VALIDASI — menelusuri perjuangan kemerdekaan",
    outcome: "UJI VALIDASI — menjelaskan makna perjuangan",
    skk: 4,
    face: 20,
    tutorial: 30,
    independent: 50,
  };
  const body = {
    action: "create",
    classId,
    code: `UJI-TAHAP1-${stamp}`,
    name: "UJI VALIDASI Tahap 1 — bukan kurikulum resmi",
    source:
      "DATA UJI LOKAL. SKK dan KI/KD hanya untuk pengujian, belum disetujui PKBM.",
    effectiveFrom: "2026-10-05",
    rows: [
      row,
      { ...row, kd: "3.2", description: "UJI VALIDASI — nilai persatuan" },
      { ...row, package: "5.2", skk: 6 },
    ],
  };
  await request(teacher, { ...body, classId: "unassigned-class" }, 404);
  await request(teacher, { ...body, rows: [{ ...row, face: -1 }] }, 422);
  const created = await request(teacher, body);
  const version = created.versions.find((v) => v.code === body.code);
  assert.ok(version);
  const mappings = created.mappings.filter((m) => m.version_id === version.id);
  assert.equal(mappings.length, 3);
  const allocations = [
    ...new Map(
      mappings.map((m) => [`${m.package_id}/${m.subject_id}`, m]),
    ).values(),
  ];
  assert.equal(
    allocations.reduce((n, m) => n + m.planned_skk, 0),
    10,
  );
  await request(teacher, { action: "activate", versionId: version.id });
  await request(teacher, { action: "activate", versionId: version.id }, 409);
  await request(
    teacher,
    {
      action: "assign",
      packageId: mappings[0].package_id,
      studentId: "other-student",
    },
    404,
  );
  for (const packageId of new Set(mappings.map((m) => m.package_id)))
    await request(teacher, { action: "assign", packageId, studentId });
  await request(
    teacher,
    { action: "assign", packageId: mappings[0].package_id, studentId },
    409,
  );
  const before = await request(teacher);
  const oldAssignments = before.assignments.filter(
    (a) => a.curriculum_version_id === version.id,
  );
  assert.equal(
    before.totals
      .filter((t) => oldAssignments.some((a) => a.id === t.assignmentId))
      .reduce((n, t) => n + t.skk, 0),
    10,
  );
  const next = await request(teacher, {
    ...body,
    code: body.code + "-V2",
    name: "UJI VALIDASI Tahap 1 V2 — tanpa penetapan",
    rows: [{ ...row, skk: 20 }],
  });
  const v2 = next.versions.find((v) => v.code === body.code + "-V2");
  await request(teacher, { action: "activate", versionId: v2.id });
  const after = await request(teacher);
  assert.deepEqual(after.assignments, before.assignments);
  assert.deepEqual(after.totals, before.totals);
  for (const r of initial.content.filter(
    (r) =>
      r.class_id === classId && r.subject_id === subjectId && !r.competency_ids,
  )) {
    await request(
      teacher,
      { action: "publish", kind: r.kind, resourceId: r.id, competencyIds: [] },
      422,
    );
    await request(
      teacher,
      {
        action: "publish",
        kind: r.kind,
        resourceId: r.id,
        competencyIds: ["foreign-kd"],
      },
      422,
    );
    await request(teacher, {
      action: "publish",
      kind: r.kind,
      resourceId: r.id,
      competencyIds: [mappings[0].id],
    });
    await request(
      teacher,
      {
        action: "publish",
        kind: r.kind,
        resourceId: r.id,
        competencyIds: [mappings[1].id],
      },
      409,
    );
  }
  const refreshed = await request(teacher);
  assert.deepEqual(refreshed.totals, after.totals);
  console.log(
    JSON.stringify(
      {
        result: "PASS",
        version: body.code,
        plannedSkk: 10,
        criteria: [
          "D1 reconciliation without duplicate SKK",
          "student-specific allocation",
          "version history unchanged",
          "unassigned version hidden",
          "publication requires KD",
          "published mapping locked",
        ],
        localDataEffect:
          "Labelled validation versions and assignments retained; existing submissions/progress preserved",
      },
      null,
      2,
    ),
  );
}
