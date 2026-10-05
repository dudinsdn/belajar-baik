import assert from "node:assert/strict";
const base = "http://localhost:3000";
async function request(path, method = "GET", body) {
  const r = await fetch(base + path, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body:
      body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  });
  return { status: r.status, ...(await r.json()) };
}
const me = await request("/api/v1/me");
assert.equal(me.status, 200);
if (me.data.role === "teacher") {
  assert.equal((await request("/api/v1/work")).status, 200);
  assert.equal((await request("/api/v1/work", "POST", "{")).status, 422);
  assert.equal((await request("/api/v1/work", "POST", null)).status, 422);
  assert.equal((await request("/api/v1/work/portfolio")).status, 403);
  assert.equal((await request("/api/v1/work/missing", "POST")).status, 404);
} else if (me.data.role === "student") {
  assert.equal((await request("/api/v1/work")).status, 403);
  assert.equal((await request("/api/v1/work", "POST", {})).status, 403);
  assert.equal((await request("/api/v1/work/portfolio")).status, 200);
  const assignments = await request("/api/v1/assignments");
  assert.equal(assignments.status, 200);
  for (const a of assignments.data.filter((a) => a.managed_work))
    assert.equal((await request("/api/v1/work/" + a.id)).status, 200);
} else throw new Error("Gunakan simulasi siswa atau tutor.");
assert.equal((await request("/api/v1/work/submissions/missing")).status, 404);
assert.equal((await request("/api/v1/work/files/missing")).status, 404);
console.log(
  "Tahap 5 API smoke lulus:",
  me.data.role,
  "; tanpa fixture write/reseed/server tambahan.",
);
