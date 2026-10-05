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
  const data = await r.json();
  return { status: r.status, ...data };
}
const me = await request("/api/v1/me");
assert.equal(me.status, 200);
const role = me.data.role;
if (role === "teacher") {
  assert.equal((await request("/api/v1/teacher/quizzes")).status, 200);
  assert.equal((await request("/api/v1/quizzes/catalog")).status, 403);
  assert.equal(
    (await request("/api/v1/teacher/quizzes", "POST", "{")).status,
    422,
  );
  assert.equal(
    (await request("/api/v1/teacher/quizzes", "POST", null)).status,
    422,
  );
  assert.equal((await request("/api/v1/teacher/quizzes/missing")).status, 404);
} else if (role === "student") {
  assert.equal((await request("/api/v1/teacher/quizzes")).status, 403);
  assert.equal(
    (await request("/api/v1/teacher/quizzes", "POST", {})).status,
    403,
  );
  const catalog = await request("/api/v1/quizzes/catalog");
  assert.equal(catalog.status, 200);
  for (const q of catalog.data) {
    const quiz = await request(`/api/v1/quizzes/${q.id}`);
    assert.equal(quiz.status, 200);
    const encoded = JSON.stringify(quiz.data);
    for (const key of ["is_correct", "explanation", "accepted_answer"])
      assert.equal(encoded.includes(`"${key}"`), false);
    assert.equal(
      (await request(`/api/v1/quizzes/${q.id}/history`)).status,
      200,
    );
  }
  assert.equal(
    (await request("/api/v1/quiz-attempts/foreign/result")).status,
    404,
  );
  assert.equal(
    (await request("/api/v1/quiz-attempts/foreign/answers/foreign", "PUT", "{"))
      .status,
    422,
  );
  assert.equal(
    (
      await request(
        "/api/v1/quiz-attempts/foreign/answers/foreign",
        "PUT",
        null,
      )
    ).status,
    422,
  );
  assert.equal(
    (
      await request("/api/v1/quiz-attempts/foreign/answers/foreign", "PUT", {
        answer: "x",
      })
    ).status,
    404,
  );
} else throw new Error("Role di luar skenario smoke test.");
console.log(
  `API asesmen ${role}: lulus. Tidak mengganti identitas, memulai server, atau menulis jawaban/fixture valid.`,
);
