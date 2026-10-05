import assert from "node:assert/strict";
const base = "http://localhost:3000";
async function request(path, expected = 200, body) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    signal: AbortSignal.timeout(45000),
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  assert.equal(
    response.status,
    expected,
    `${path}: ${JSON.stringify(payload.error ?? {})}`,
  );
  return payload.data;
}
const me = await request("/api/v1/me");
const plans = await request("/api/v1/learning-plans");
assert.ok(Array.isArray(plans.plans));
if (me.role === "teacher") {
  await request("/api/v1/dashboard", 403);
  await request("/api/v1/learning-plans", 404, {
    action: "create",
    classSubjectId: "foreign",
  });
  await request("/api/v1/learning-plans", 422, {
    action: "unknown",
    classSubjectId: plans.subjects[0].id,
  });
} else {
  assert.equal(me.role, "student");
  assert.ok(plans.plans.every((p) => p.student_id === me.id));
  const dashboard = await request("/api/v1/dashboard");
  assert.deepEqual(dashboard.plans, plans.plans);
  assert.ok(Number.isFinite(dashboard.skk.planned));
  await request("/api/v1/learning-plans", 403, {
    action: "create",
    classSubjectId: "foreign",
  });
  await request("/api/v1/learning-plans", 404, {
    action: "help",
    planId: "foreign",
    reason: "UJI",
  });
  await request("/api/v1/learning-plans", 404, {
    action: "acknowledge",
    submissionId: "foreign",
  });
}
console.log(
  `Planning API smoke passed: ${me.role}, ${plans.plans.length} visible plans; no records created.`,
);
