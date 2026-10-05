import assert from "node:assert/strict";
const base = "http://localhost:3000";
async function check(path, status = 200, options) {
  const response = await fetch(base + path, {
    ...options,
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.json();
  assert.equal(
    response.status,
    status,
    `${path}: ${body.error?.message ?? response.status}`,
  );
  return body.data;
}
const me = await check("/api/v1/me");
await check("/api/v1/modules/missing-module", 404);
await check("/api/v1/modules", 422, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{",
});
if (me.role === "teacher") {
  const catalog = await check("/api/v1/modules");
  await check("/api/v1/modules", 422, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  const fixture = catalog.materials.find(
    (m) =>
      m.title === "UJI Tahap 3 — modul sejarah bertahap" &&
      m.status === "published",
  );
  assert.ok(fixture, "Terbitkan fixture berlabel UJI Tahap 3 terlebih dahulu.");
  const detail = await check(`/api/v1/modules/${fixture.id}`);
  assert.equal(detail.sections.length, 2);
  const file = await fetch(`${base}/api/v1/modules/${fixture.id}/download`, {
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(file.status, 200);
  assert.match(file.headers.get("content-type"), /text\/plain/);
  assert.match(file.headers.get("content-disposition"), /attachment/);
  const content = await file.text();
  assert.ok(content.includes("UJI Mengamati lingkungan"));
  assert.ok(content.includes("UJI Refleksi dan bukti"));
  await check(`/api/v1/modules/${fixture.id}`, 403, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "complete",
      sectionId: detail.sections[0].id,
    }),
  });
} else if (me.role === "student") {
  await check("/api/v1/modules", 403);
  await check("/api/v1/modules", 403, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  const list = await check("/api/v1/materials");
  const fixture = list.find(
    (m) => m.title === "UJI Tahap 3 — modul sejarah bertahap",
  );
  assert.ok(
    fixture,
    "Fixture UJI Tahap 3 harus dipetakan ke kurikulum warga belajar.",
  );
  const detail = await check(`/api/v1/modules/${fixture.id}`);
  assert.equal(detail.sections.length, 2);
  const file = await fetch(`${base}/api/v1/modules/${fixture.id}/download`, {
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(file.status, 200);
  assert.match(file.headers.get("content-type"), /text\/plain/);
  assert.match(file.headers.get("content-disposition"), /attachment/);
  const content = await file.text();
  assert.ok(content.includes("UJI Mengamati lingkungan"));
  assert.ok(content.includes("UJI Refleksi dan bukti"));
  await check(`/api/v1/modules/${fixture.id}`, 404, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "complete", sectionId: "foreign-section" }),
  });
  await check(`/api/v1/materials/${fixture.id}/progress`, 422, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ percent: 100, lastPosition: "fake" }),
  });
} else throw new Error("Jalankan sebagai tutor atau warga belajar.");
console.log(
  `Modules API smoke passed (${me.role}). Tidak menulis catatan valid atau mengubah role/server.`,
);
