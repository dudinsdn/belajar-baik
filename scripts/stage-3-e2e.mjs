import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const baseUrl = "http://localhost:3100";
const varsPath = new URL("../.dev.vars", import.meta.url);
const originalVars = await readFile(varsPath, "utf8");
let server;

const identities = {
  student: `RUNTIME_ENV=development
RT_DEV_AUTH=enabled
RT_DEV_USER_ID=usr_student_dudin
RT_DEV_EXTERNAL_ID=dev:student:dudin
RT_DEV_USER_EMAIL=dudin@ruangtumbuh.local
RT_DEV_USER_NAME=Dudin Sahidin
RT_DEV_USER_ROLE=student
`,
  teacher: `RUNTIME_ENV=development
RT_DEV_AUTH=enabled
RT_DEV_USER_ID=usr_teacher_adi
RT_DEV_EXTERNAL_ID=dev:teacher:adi
RT_DEV_USER_EMAIL=adi@ruangtumbuh.local
RT_DEV_USER_NAME=Adi Rama
RT_DEV_USER_ROLE=teacher
`,
};

function run(command, args) {
  execFileSync(command, args, {
    cwd: new URL("..", import.meta.url),
    stdio: "inherit",
  });
}

function resetFixture() {
  run("npm", ["run", "db:local:seed"]);
  const wrangler = [
    "wrangler",
    "d1",
    "execute",
    "site-creator-d1",
    "--local",
    "--config",
    "wrangler.local.jsonc",
    "--command",
  ];
  run("npx", [
    ...wrangler,
    "DELETE FROM submissions WHERE assignment_id = 'asg_refleksi' AND student_id = 'usr_student_dudin'",
  ]);
  run("npx", [
    ...wrangler,
    "DELETE FROM quiz_answers WHERE attempt_id IN (SELECT id FROM quiz_attempts WHERE quiz_id = 'quiz_surabaya' AND student_id = 'usr_student_dudin')",
  ]);
  run("npx", [
    ...wrangler,
    "DELETE FROM quiz_attempts WHERE quiz_id = 'quiz_surabaya' AND student_id = 'usr_student_dudin'",
  ]);
}

async function request(path, init, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const payload = await response.json();
  assert.equal(
    response.status,
    expectedStatus,
    `${init?.method ?? "GET"} ${path}: ${JSON.stringify(payload)}`,
  );
  return payload;
}

async function waitUntilReady() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/v1/me`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Server lokal tidak siap dalam 20 detik.");
}

async function startAs(role) {
  await writeFile(varsPath, identities[role]);
  server = spawn("npm", ["run", "dev", "--", "--port", "3100"], {
    cwd: new URL("..", import.meta.url),
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  server.stdout.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await waitUntilReady();
}

async function stopServer() {
  if (!server || server.exitCode !== null || server.signalCode !== null) {
    server = undefined;
    return;
  }
  const killGroup = (signal) => {
    try {
      process.kill(-server.pid, signal);
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
  };
  killGroup("SIGINT");
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  if (server.exitCode === null && server.signalCode === null)
    killGroup("SIGTERM");
  server = undefined;
}

try {
  resetFixture();

  await startAs("student");
  const student = (await request("/api/v1/me")).data;
  assert.equal(student.role, "student");
  await request("/api/v1/dashboard");
  await request("/api/v1/materials/mat_surabaya/progress", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ percent: 72, lastPosition: "e2e-halaman-13" }),
  });
  await request("/api/v1/library/lib_kemerdekaan/progress", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      percent: 55,
      lastPosition: "e2e-halaman-70",
      bookmarked: true,
    }),
  });
  await request("/api/v1/assignments/asg_refleksi/submission", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      answerText:
        "Semangat persatuan diwujudkan melalui belajar, gotong royong, dan tanggung jawab.",
    }),
  });
  const submitted = (
    await request("/api/v1/assignments/asg_refleksi/submission/submit", {
      method: "POST",
    })
  ).data;
  assert.equal(submitted.submission_status, "submitted");
  await request("/api/v1/teacher/submissions", undefined, 403);

  const quiz = (await request("/api/v1/quizzes/quiz_surabaya")).data;
  assert.equal(quiz.questions.length, 2);
  const attempt = (
    await request("/api/v1/quizzes/quiz_surabaya/attempts", { method: "POST" })
  ).data;
  await request(`/api/v1/quiz-attempts/${attempt.id}/answers/qq_surabaya_1`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ selectedOptionId: "qo_sby_1b" }),
  });
  await request(`/api/v1/quiz-attempts/${attempt.id}/answers/qq_surabaya_2`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ selectedOptionId: "qo_sby_2a" }),
  });
  const quizAttempt = (
    await request(`/api/v1/quiz-attempts/${attempt.id}/submit`, {
      method: "POST",
    })
  ).data;
  assert.equal(quizAttempt.score, 100);
  const quizResult = (
    await request(`/api/v1/quiz-attempts/${attempt.id}/result`)
  ).data;
  assert.equal(quizResult.passed, true);
  await stopServer();

  await startAs("teacher");
  const teacher = (await request("/api/v1/me")).data;
  assert.equal(teacher.role, "teacher");
  await request("/api/v1/assignments", undefined, 403);
  const queue = (await request("/api/v1/teacher/submissions?status=submitted"))
    .data;
  assert.equal(queue.length, 1);
  assert.equal(queue[0].id, submitted.submission_id);
  const graded = (
    await request(`/api/v1/submissions/${queue[0].id}/grade`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        score: 91,
        feedback:
          "Jawaban jelas dan relevan. Tambahkan contoh dari lingkungan sekitar.",
      }),
    })
  ).data;
  assert.equal(graded.status, "graded");
  assert.equal(graded.score, 91);
  await stopServer();

  await startAs("student");
  const assignments = (await request("/api/v1/assignments")).data;
  const result = assignments.find((item) => item.id === "asg_refleksi");
  assert.equal(result.submission_status, "graded");
  assert.equal(result.score, 91);
  assert.match(result.feedback, /lingkungan sekitar/);
  await request("/api/v1/teacher/submissions", undefined, 403);

  console.log(
    JSON.stringify(
      {
        student: student.email,
        teacher: teacher.email,
        materialProgress: 72,
        libraryProgress: 55,
        assignmentStatus: result.submission_status,
        assignmentScore: result.score,
        quizScore: quizAttempt.score,
        authorizationChecks: 2,
      },
      null,
      2,
    ),
  );
} finally {
  await stopServer();
  await writeFile(varsPath, originalVars);
}
