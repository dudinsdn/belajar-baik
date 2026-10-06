import assert from "node:assert/strict";
async function request(path, method = "GET", body) {
  const r = await fetch("http://localhost:3000" + path, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, ...(await r.json()) };
}
const me = await request("/api/v1/me");
assert.equal(me.status, 200);
if (me.data.role === "teacher") {
  const d = await request("/api/v1/teacher/mentoring");
  assert.equal(d.status, 200);
  assert.ok(Array.isArray(d.data.students));
  for (const s of d.data.students) {
    const detail = await request(
      `/api/v1/teacher/mentoring?subject=${encodeURIComponent(s.class_subject_id)}&student=${encodeURIComponent(s.student_id)}`,
    );
    assert.equal(detail.status, 200);
    assert.equal(detail.data.scope.student_id, s.student_id);
    assert.equal(typeof detail.data.skk.awarded, "number");
    assert.ok(Array.isArray(detail.data.mastery));
  }
  assert.equal(
    (await request("/api/v1/teacher/mentoring?subject=missing&student=missing"))
      .status,
    404,
  );
  assert.equal(
    (await request("/api/v1/teacher/mentoring", "POST", null)).status,
    422,
  );
} else {
  assert.equal((await request("/api/v1/teacher/mentoring")).status, 403);
  assert.equal(
    (await request("/api/v1/teacher/mentoring", "POST", {})).status,
    403,
  );
}
console.log(
  "Tahap 6 API smoke lulus:",
  me.data.role,
  "; tanpa mutasi/reseed/server tambahan.",
);
