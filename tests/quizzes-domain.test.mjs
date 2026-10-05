import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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
  "drizzle/0014_damp_veda.sql",
  "drizzle/0015_quiz_guards.sql",
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
      const result = db.prepare(sql).run(...params);
      return { meta: { changes: Number(result.changes) }, results: [] };
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
const { createQuiz, publishQuiz, teacherQuiz, gradeEssay } = await import(
  moduleUrl("server/data/quiz-management.ts")
);
const {
  getStudentQuiz,
  startQuizAttempt,
  saveQuizAnswer,
  submitQuizAttempt,
  getQuizResult,
  quizHistory,
  listStudentQuizzes,
} = await import(moduleUrl("server/data/quizzes.ts"));
const teacher = { id: "usr_teacher_adi", role: "teacher" },
  student = { id: "usr_student_dudin", role: "student" };
test("assessment lifecycle, scoring, resume, answer secrecy, ownership and audit", async () => {
  const mapping = await mutateCurriculum(teacher, {
    action: "create",
    classId: "cls_paket_c_10",
    code: "UJI-QUIZ",
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
  const common = {
    competencyId: kd.id,
    difficulty: "medium",
    explanation: "UJI pembahasan",
  };
  const body = {
    title: "UJI asesmen",
    classSubjectId: "cs_sej_10",
    purpose: "diagnostic",
    passingScore: 70,
    maxAttempts: 2,
    questions: [
      {
        ...common,
        kind: "single",
        prompt: "Tunggal",
        options: [
          { label: "A", correct: true },
          { label: "B", correct: false },
        ],
      },
      {
        ...common,
        kind: "multiple",
        prompt: "Jamak",
        options: [
          { label: "A", correct: true },
          { label: "B", correct: true },
          { label: "C", correct: false },
        ],
      },
      { ...common, kind: "short", prompt: "Isian", acceptedAnswer: "Sejarah" },
      { ...common, kind: "essay", prompt: "Uraian" },
    ],
  };
  await assert.rejects(() => createQuiz(student, body), { status: 403 });
  await assert.rejects(
    () => createQuiz({ id: "foreign", role: "teacher" }, body),
    { status: 404 },
  );
  await assert.rejects(
    () => createQuiz(teacher, { ...body, maxAttempts: true }),
    { status: 422 },
  );
  await assert.rejects(
    () =>
      createQuiz(teacher, {
        ...body,
        questions: [{ ...body.questions[0], competencyId: "foreign" }],
      }),
    { status: 422 },
  );
  await assert.rejects(
    () =>
      createQuiz(teacher, {
        ...body,
        questions: [
          {
            ...body.questions[0],
            options: [
              { label: "A", correct: true },
              { label: "B", correct: true },
            ],
          },
        ],
      }),
    { status: 422 },
  );
  const draft = await createQuiz(teacher, body),
    id = draft.quiz.id;
  await assert.rejects(() => getStudentQuiz(student, id), { status: 404 });
  await publishQuiz(teacher, id);
  const quiz = await getStudentQuiz(student, id);
  assert.equal(JSON.stringify(quiz).includes("explanation"), false);
  assert.equal(JSON.stringify(quiz).includes("is_correct"), false);
  assert.equal(JSON.stringify(quiz).includes("accepted_answer"), false);
  assert.equal(
    (await listStudentQuizzes(student)).some((q) => q.id === id),
    true,
  );
  const attempt = await startQuizAttempt(student, id);
  await assert.rejects(() => startQuizAttempt(teacher, id), { status: 403 });
  await assert.rejects(() => getQuizResult(student, attempt.id), {
    status: 409,
  });
  await assert.rejects(() => submitQuizAttempt(student, attempt.id), {
    status: 422,
  });
  await assert.rejects(
    () =>
      saveQuizAnswer(
        student,
        attempt.id,
        quiz.questions[0].id,
        quiz.questions[1].options[0].id,
      ),
    { status: 422 },
  );
  await assert.rejects(
    () =>
      saveQuizAnswer(
        { id: "other", role: "student" },
        attempt.id,
        quiz.questions[0].id,
        quiz.questions[0].options[0].id,
      ),
    { status: 404 },
  );
  const answers = [
    quiz.questions[0].options[0].id,
    quiz.questions[1].options.slice(0, 2).map((o) => o.id),
    " SEJARAH ",
    "UJI uraian",
  ];
  for (let i = 0; i < answers.length; i++)
    await saveQuizAnswer(student, attempt.id, quiz.questions[i].id, answers[i]);
  const resumed = await startQuizAttempt(student, id);
  assert.equal(resumed.id, attempt.id);
  assert.equal(resumed.answers.length, 4);
  assert.deepEqual(
    resumed.answers.find((x) => x.question_id === quiz.questions[1].id).answer,
    answers[1],
  );
  assert.equal(JSON.stringify(resumed).includes("credit"), false);
  assert.equal((await submitQuizAttempt(student, attempt.id)).score, null);
  const pending = await getQuizResult(student, attempt.id);
  assert.equal(pending.passed, null);
  assert.equal(pending.answers.length, 4);
  await assert.rejects(
    () => saveQuizAnswer(student, attempt.id, quiz.questions[0].id, answers[0]),
    { status: 409 },
  );
  const beforeGrade = await teacherQuiz(teacher, id);
  assert.equal(beforeGrade.responses.length, 1);
  assert.equal(beforeGrade.competencyResults[0].pending, 1);
  await gradeEssay(teacher, id, {
    attemptId: attempt.id,
    questionId: quiz.questions[3].id,
    credit: 1,
    feedback: "UJI tepat",
  });
  assert.equal((await getQuizResult(student, attempt.id)).attempt.score, 100);
  await assert.rejects(
    () =>
      gradeEssay(teacher, id, {
        attemptId: attempt.id,
        questionId: quiz.questions[3].id,
        credit: 0,
        feedback: "ubah",
      }),
    { status: 409 },
  );
  await assert.rejects(
    () => teacherQuiz({ id: "foreign", role: "teacher" }, id),
    { status: 404 },
  );
  const gradedReport = await teacherQuiz(teacher, id);
  assert.equal(gradedReport.competencyResults[0].pending, 0);
  assert.equal(gradedReport.competencyResults[0].correct, 4);
  const second = await startQuizAttempt(student, id);
  await saveQuizAnswer(
    student,
    second.id,
    quiz.questions[0].id,
    quiz.questions[0].options[1].id,
  );
  await saveQuizAnswer(student, second.id, quiz.questions[1].id, [
    quiz.questions[1].options[0].id,
  ]);
  await saveQuizAnswer(student, second.id, quiz.questions[2].id, "salah");
  await saveQuizAnswer(student, second.id, quiz.questions[3].id, "uraian");
  await submitQuizAttempt(student, second.id);
  await gradeEssay(teacher, id, {
    attemptId: second.id,
    questionId: quiz.questions[3].id,
    credit: 0,
    feedback: "UJI ulang",
  });
  assert.equal((await getQuizResult(student, second.id)).attempt.score, 0);
  await assert.rejects(() => startQuizAttempt(student, id), { status: 409 });
  assert.equal((await quizHistory(student, id)).length, 2);
  assert.equal((await teacherQuiz(teacher, id)).analysis[0].correct, 1);
  assert.throws(
    () =>
      db
        .prepare("UPDATE quiz_options SET is_correct=0 WHERE id=?")
        .run(answers[0]),
    /immutable/,
  );
  assert.throws(
    () => db.prepare("UPDATE quizzes SET max_attempts=10 WHERE id=?").run(id),
    /immutable/,
  );
  db.exec(
    `INSERT INTO users(id,external_identity_id,email,display_name,role,status,created_at,updated_at) VALUES('usr_other','dev:other','other@local','UJI Other','student','active','2026-10-05','2026-10-05'); INSERT INTO class_memberships(class_id,student_id,joined_at,status) VALUES('cls_paket_c_10','usr_other','2026-10-05','active');`,
  );
  const other = { id: "usr_other", role: "student" };
  await assert.rejects(() => getStudentQuiz(other, id), { status: 404 });
  await mutateCurriculum(teacher, {
    action: "assign",
    packageId: kd.package_id,
    studentId: other.id,
  });
  assert.equal((await getStudentQuiz(other, id)).id, id);
  const otherAttempt = await startQuizAttempt(other, id);
  assert.equal(otherAttempt.answers.length, 0);
  await assert.rejects(() => getQuizResult(other, attempt.id), { status: 404 });
  await assert.rejects(
    () => saveQuizAnswer(other, attempt.id, quiz.questions[0].id, answers[0]),
    { status: 404 },
  );
  db.exec(
    "UPDATE curriculum_assignments SET status='cancelled' WHERE student_id='usr_other'",
  );
  await assert.rejects(() => startQuizAttempt(other, id), { status: 404 });
  db.exec("UPDATE classes SET status='archived' WHERE id='cls_paket_c_10'");
  await assert.rejects(() => getQuizResult(student, attempt.id), {
    status: 404,
  });
  db.exec("UPDATE classes SET status='active' WHERE id='cls_paket_c_10'");
  const afterSubmitEvents = db
    .prepare(
      "SELECT COUNT(*) AS n FROM quiz_events WHERE attempt_id=? AND action='submit'",
    )
    .get(second.id).n;
  await submitQuizAttempt(student, second.id);
  assert.equal(
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM quiz_events WHERE attempt_id=? AND action='submit'",
      )
      .get(second.id).n,
    afterSubmitEvents,
  );
  await assert.rejects(() => createQuiz({ id: "admin", role: "admin" }, body), {
    status: 403,
  });
  await assert.rejects(
    () => getStudentQuiz({ id: "admin", role: "admin" }, id),
    { status: 403 },
  );
  await assert.rejects(
    () => saveQuizAnswer(student, second.id, quiz.questions[0].id, {}),
    { status: 409 },
  );
  // Published legacy questions remain single-choice; legacy answers also resume.
  await mutateCurriculum(teacher, {
    action: "publish",
    kind: "quiz",
    resourceId: "quiz_surabaya",
    competencyIds: [kd.id],
  });
  const legacy = await getStudentQuiz(student, "quiz_surabaya");
  const legacyAttempt = await startQuizAttempt(student, legacy.id);
  db.prepare(
    "INSERT INTO quiz_answers(attempt_id,question_id,selected_option_id,is_correct) VALUES(?,?,?,0)",
  ).run(
    legacyAttempt.id,
    legacy.questions[0].id,
    legacy.questions[0].options[0].id,
  );
  assert.equal(
    (await startQuizAttempt(student, legacy.id)).answers[0].answer,
    legacy.questions[0].options[0].id,
  );
  for (const q of legacy.questions)
    await saveQuizAnswer(student, legacyAttempt.id, q.id, q.options[0].id);
  assert.equal(
    typeof (await submitQuizAttempt(student, legacyAttempt.id)).score,
    "number",
  );
  assert.equal(
    (await getQuizResult(student, legacyAttempt.id)).answers.length,
    legacy.questions.length,
  );
  db.prepare(
    "UPDATE class_memberships SET status='inactive' WHERE student_id=?",
  ).run(student.id);
  await assert.rejects(() => getQuizResult(student, attempt.id), {
    status: 404,
  });
  await assert.rejects(
    () => saveQuizAnswer(student, second.id, quiz.questions[0].id, answers[0]),
    { status: 404 },
  );
  assert.equal((await teacherQuiz(teacher, id)).responses.length, 0);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM quiz_events").get().n > 10,
    true,
  );
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
});

test("all forward migrations apply to an empty database", () => {
  const empty = new DatabaseSync(":memory:");
  empty.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync("drizzle")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    empty.exec(readFileSync("drizzle/" + file, "utf8"));
  assert.equal(empty.prepare("PRAGMA foreign_key_check").all().length, 0);
  assert.equal(
    empty.prepare("SELECT COUNT(*) AS n FROM quiz_responses").get().n,
    0,
  );
  empty.close();
});
