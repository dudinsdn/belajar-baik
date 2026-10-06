import assert from "node:assert/strict";
async function request(path, method = "GET", body) {
  const response = await fetch("http://localhost:3000" + path, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, ...(await response.json()) };
}
const me = await request("/api/v1/me");
assert.equal(me.status, 200);
const ledger = await request("/api/v1/skk");
assert.equal(ledger.status, 200);
const totals = ledger.data.allocations.reduce(
  (sum, a) => ({
    planned: sum.planned + a.planned_skk,
    earned: sum.earned + a.earned,
    remaining: sum.remaining + a.remaining,
  }),
  { planned: 0, earned: 0, remaining: 0 },
);
assert.deepEqual(totals, ledger.data.totals);
if (me.data.role === "student") {
  assert.ok(ledger.data.allocations.every((a) => a.student_id === me.data.id));
  const dashboard = await request("/api/v1/dashboard");
  assert.equal(dashboard.status, 200);
  assert.deepEqual(dashboard.data.skk, totals);
  assert.equal((await request("/api/v1/skk", "POST", {})).status, 403);
} else {
  assert.equal((await request("/api/v1/skk", "POST", {})).status, 422);
}
console.log(
  "Tahap 7 smoke lulus:",
  me.data.role,
  JSON.stringify(totals),
  "; tanpa mutasi atau reseed.",
);
