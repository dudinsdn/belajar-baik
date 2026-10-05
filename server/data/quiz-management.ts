import { env } from "cloudflare:workers";
import { ApiError } from "../api/error.ts";
import { requireRole } from "../auth/index.ts";
import type { CurrentUser } from "../auth/types.ts";
import { moduleCatalog } from "./modules.ts";
import { invalid, text, integer } from "./quiz-validation.ts";
type Row = Record<string, string | number | null>;
async function all(sql: string, ...args: (string | number | null)[]) {
  return (
    await env.DB.prepare(sql)
      .bind(...args)
      .all<Row>()
  ).results;
}
async function own(user: CurrentUser, id: string) {
  requireRole(user, "teacher");
  const row = await env.DB.prepare(
    "SELECT q.* FROM quizzes q JOIN class_subjects cs ON cs.id=q.class_subject_id JOIN classes c ON c.id=cs.class_id WHERE q.id=? AND cs.teacher_id=? AND c.status='active'",
  )
    .bind(id, user.id)
    .first<Row>();
  if (!row) throw new ApiError("NOT_FOUND", 404, "Asesmen tidak ditemukan.");
  return row;
}
export async function quizCatalog(user: CurrentUser) {
  requireRole(user, "teacher");
  return {
    ...(await moduleCatalog(user)),
    quizzes: await all(
      "SELECT q.* FROM quizzes q JOIN class_subjects cs ON cs.id=q.class_subject_id WHERE cs.teacher_id=? ORDER BY q.created_at DESC",
      user.id,
    ),
  };
}
export async function teacherQuiz(user: CurrentUser, id: string) {
  const quiz = await own(user, id);
  const questions = await all(
    "SELECT q.*,bc.code AS competency_code FROM quiz_questions q LEFT JOIN basic_competencies bc ON bc.id=q.competency_id WHERE q.quiz_id=? ORDER BY q.order_index",
    id,
  );
  const options = await all(
    "SELECT o.* FROM quiz_options o JOIN quiz_questions q ON q.id=o.question_id WHERE q.quiz_id=? ORDER BY o.order_index",
    id,
  );
  const attempts = await all(
    `SELECT a.*,u.display_name FROM quiz_attempts a JOIN users u ON u.id=a.student_id JOIN quizzes q ON q.id=a.quiz_id JOIN class_subjects cs ON cs.id=q.class_subject_id JOIN class_memberships cm ON cm.class_id=cs.class_id AND cm.student_id=a.student_id AND cm.status='active' WHERE a.quiz_id=? ORDER BY a.started_at DESC LIMIT 100`,
    id,
  );
  const responses = await all(
    `SELECT r.*,q.prompt,a.student_id FROM quiz_responses r JOIN quiz_questions q ON q.id=r.question_id JOIN quiz_attempts a ON a.id=r.attempt_id JOIN quizzes z ON z.id=q.quiz_id JOIN class_subjects cs ON cs.id=z.class_subject_id JOIN class_memberships cm ON cm.class_id=cs.class_id AND cm.student_id=a.student_id AND cm.status='active' WHERE q.quiz_id=? AND a.status='completed' AND q.kind='essay'`,
    id,
  );
  const analysis = await all(
    `SELECT q.id,q.prompt,q.difficulty,q.competency_id,COUNT(a.id) AS attempts,SUM(CASE WHEN COALESCE(r.credit,l.is_correct)=1 THEN 1 ELSE 0 END) AS correct,SUM(CASE WHEN r.question_id IS NOT NULL AND r.credit IS NULL THEN 1 ELSE 0 END) AS pending FROM quiz_questions q LEFT JOIN quiz_attempts a ON a.quiz_id=q.quiz_id AND a.status='completed' LEFT JOIN quiz_responses r ON r.attempt_id=a.id AND r.question_id=q.id LEFT JOIN quiz_answers l ON l.attempt_id=a.id AND l.question_id=q.id WHERE q.quiz_id=? GROUP BY q.id ORDER BY q.order_index`,
    id,
  );
  const competencyResults = await all(
    `SELECT a.id AS attempt_id,a.student_id,u.display_name,z.purpose,q.competency_id,bc.code AS competency_code,a.started_at,a.completed_at,
    COUNT(q.id) AS total,SUM(CASE WHEN r.question_id IS NOT NULL AND r.credit IS NULL THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN r.question_id IS NOT NULL THEN COALESCE(r.credit,0) ELSE COALESCE(l.is_correct,0) END) AS correct
    FROM quiz_attempts a JOIN quizzes z ON z.id=a.quiz_id JOIN class_subjects cs ON cs.id=z.class_subject_id
    JOIN class_memberships cm ON cm.class_id=cs.class_id AND cm.student_id=a.student_id AND cm.status='active'
    JOIN users u ON u.id=a.student_id JOIN quiz_questions q ON q.quiz_id=z.id JOIN basic_competencies bc ON bc.id=q.competency_id
    LEFT JOIN quiz_responses r ON r.attempt_id=a.id AND r.question_id=q.id LEFT JOIN quiz_answers l ON l.attempt_id=a.id AND l.question_id=q.id
    WHERE cs.teacher_id=? AND z.class_subject_id=? AND a.status='completed' GROUP BY a.id,q.competency_id ORDER BY a.started_at DESC`,
    user.id,
    String(quiz.class_subject_id),
  );
  return {
    quiz,
    competencyResults,
    questions: questions.map((q) => ({
      ...q,
      options: options.filter((o) => o.question_id === q.id),
    })),
    attempts,
    responses,
    analysis,
  };
}
export async function createQuiz(user: CurrentUser, input: unknown) {
  requireRole(user, "teacher");
  if (!input || typeof input !== "object" || Array.isArray(input))
    return invalid("Formulir tidak valid.");
  const b = input as Record<string, unknown>;
  const title = text(b.title, "Judul", 200),
    csId = text(b.classSubjectId, "Penugasan", 100);
  const passing = integer(b.passingScore, 0, 100),
    max = integer(b.maxAttempts, 1, 20);
  if (!["diagnostic", "formative"].includes(String(b.purpose)))
    return invalid("Jenis asesmen tidak valid.");
  const catalog = await moduleCatalog(user);
  if (!catalog.subjects.some((x) => x.id === csId))
    throw new ApiError("NOT_FOUND", 404, "Penugasan tidak tersedia.");
  const materialId = b.materialId ? text(b.materialId, "Modul", 100) : null;
  if (
    materialId &&
    !catalog.materials.some(
      (x) =>
        x.id === materialId &&
        x.class_subject_id === csId &&
        x.status === "published",
    )
  )
    return invalid("Pilih modul terbit pada penugasan ini.");
  if (
    !Array.isArray(b.questions) ||
    !b.questions.length ||
    b.questions.length > 50
  )
    return invalid("Masukkan 1–50 soal.");
  const id = crypto.randomUUID(),
    now = new Date().toISOString(),
    statements = [];
  statements.push(
    env.DB.prepare(
      "INSERT INTO quizzes(id,class_subject_id,material_id,title,status,passing_score,author_id,created_at,updated_at,purpose,max_attempts) VALUES(?,?,?,?,'draft',?,?,?,?,?,?)",
    ).bind(
      id,
      csId,
      materialId,
      title,
      passing,
      user.id,
      now,
      now,
      String(b.purpose),
      max,
    ),
  );
  const kdIds = new Set<string>();
  for (let i = 0; i < b.questions.length; i++) {
    const q = b.questions[i];
    if (!q || typeof q !== "object" || Array.isArray(q))
      return invalid("Soal tidak valid.");
    const kind = text(q.kind, "Jenis soal", 20),
      kd = text(q.competencyId, "KD", 100);
    if (!["single", "multiple", "short", "essay"].includes(kind))
      return invalid("Jenis soal tidak valid.");
    if (
      !catalog.competencies.some(
        (x) => x.id === kd && x.class_subject_id === csId,
      )
    )
      return invalid("KD tidak termasuk penugasan aktif.");
    kdIds.add(kd);
    if (!["easy", "medium", "hard"].includes(q.difficulty))
      return invalid("Kesulitan tidak valid.");
    const section = q.reviewSectionId
      ? text(q.reviewSectionId, "Bagian", 100)
      : null;
    if (
      section &&
      !(await env.DB.prepare(
        "SELECT id FROM material_sections WHERE id=? AND material_id=? AND competency_id=?",
      )
        .bind(section, materialId, kd)
        .first())
    )
      return invalid(
        "Bagian ulang harus berasal dari modul dan KD yang dipilih.",
      );
    const qid = crypto.randomUUID();
    statements.push(
      env.DB.prepare(
        "INSERT INTO quiz_questions(id,quiz_id,prompt,order_index,explanation,kind,competency_id,difficulty,accepted_answer,review_section_id) VALUES(?,?,?,?,?,?,?,?,?,?)",
      ).bind(
        qid,
        id,
        text(q.prompt, "Pertanyaan"),
        i,
        text(q.explanation, "Pembahasan"),
        kind,
        kd,
        q.difficulty,
        kind === "short" ? text(q.acceptedAnswer, "Jawaban isian", 500) : null,
        section,
      ),
    );
    if (kind === "single" || kind === "multiple") {
      if (
        !Array.isArray(q.options) ||
        q.options.length < 2 ||
        q.options.length > 8 ||
        q.options.some(
          (o: Record<string, unknown>) =>
            !o || typeof o !== "object" || typeof o.correct !== "boolean",
        )
      )
        return invalid("Masukkan 2–8 pilihan dengan kunci yang valid.");
      const correct = q.options.filter(
        (o: { correct: boolean }) => o.correct,
      ).length;
      if (!correct || (kind === "single" && correct !== 1))
        return invalid(
          "Pilihan tunggal wajib satu kunci; pilihan jamak minimal satu.",
        );
      for (let j = 0; j < q.options.length; j++)
        statements.push(
          env.DB.prepare(
            "INSERT INTO quiz_options(id,question_id,label,order_index,is_correct) VALUES(?,?,?,?,?)",
          ).bind(
            crypto.randomUUID(),
            qid,
            text(q.options[j].label, "Pilihan", 1000),
            j,
            Number(q.options[j].correct),
          ),
        );
    }
  }
  for (const kd of kdIds)
    statements.push(
      env.DB.prepare(
        "INSERT INTO quiz_basic_competencies(quiz_id,basic_competency_id) VALUES(?,?)",
      ).bind(id, kd),
    );
  statements.push(
    env.DB.prepare(
      "INSERT INTO quiz_events(id,quiz_id,actor_id,action,created_at) VALUES(?,?,?,?,?)",
    ).bind(crypto.randomUUID(), id, user.id, "create", now),
  );
  await env.DB.batch(statements);
  return teacherQuiz(user, id);
}
export async function publishQuiz(user: CurrentUser, id: string) {
  const quiz = await own(user, id);
  if (quiz.status !== "draft")
    throw new ApiError(
      "CONFLICT",
      409,
      "Asesmen terbit terkunci. Buat asesmen baru untuk revisi.",
    );
  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM quiz_questions WHERE quiz_id=?",
  )
    .bind(id)
    .first<{ n: number }>();
  if (!count?.n) return invalid("Asesmen belum mempunyai soal.");
  const catalog = await moduleCatalog(user);
  const questions = await all(
    "SELECT competency_id FROM quiz_questions WHERE quiz_id=?",
    id,
  );
  if (
    questions.some(
      (q) =>
        !catalog.competencies.some(
          (k) =>
            k.id === q.competency_id &&
            k.class_subject_id === quiz.class_subject_id,
        ),
    )
  )
    return invalid(
      "Setiap soal wajib memakai KD dari kurikulum aktif sebelum terbit.",
    );
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE quizzes SET status='published',updated_at=? WHERE id=? AND status='draft'",
    ).bind(now, id),
    env.DB.prepare(
      "INSERT INTO quiz_events(id,quiz_id,actor_id,action,created_at) VALUES(?,?,?,?,?)",
    ).bind(crypto.randomUUID(), id, user.id, "publish", now),
  ]);
  return teacherQuiz(user, id);
}
export async function gradeEssay(
  user: CurrentUser,
  id: string,
  input: unknown,
) {
  await own(user, id);
  if (!input || typeof input !== "object" || Array.isArray(input))
    return invalid("Penilaian tidak valid.");
  const b = input as Record<string, unknown>,
    attemptId = text(b.attemptId, "Percobaan", 100),
    questionId = text(b.questionId, "Soal", 100),
    credit = integer(b.credit, 0, 1),
    feedback = text(b.feedback, "Umpan balik");
  const row = await env.DB.prepare(
    `SELECT r.credit FROM quiz_responses r JOIN quiz_questions q ON q.id=r.question_id JOIN quiz_attempts a ON a.id=r.attempt_id JOIN quizzes z ON z.id=a.quiz_id JOIN class_subjects cs ON cs.id=z.class_subject_id JOIN class_memberships cm ON cm.class_id=cs.class_id AND cm.student_id=a.student_id AND cm.status='active' WHERE r.attempt_id=? AND r.question_id=? AND q.quiz_id=? AND q.kind='essay' AND a.status='completed'`,
  )
    .bind(attemptId, questionId, id)
    .first<{ credit: number | null }>();
  if (!row)
    throw new ApiError("NOT_FOUND", 404, "Jawaban uraian tidak ditemukan.");
  if (row.credit !== null)
    throw new ApiError(
      "CONFLICT",
      409,
      "Nilai tersimpan terkunci agar histori utuh.",
    );
  const now = new Date().toISOString();
  const result = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO quiz_events(id,attempt_id,quiz_id,actor_id,action,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM quiz_responses WHERE attempt_id=? AND question_id=? AND credit IS NULL)",
    ).bind(
      crypto.randomUUID(),
      attemptId,
      id,
      user.id,
      "grade",
      now,
      attemptId,
      questionId,
    ),
    env.DB.prepare(
      "UPDATE quiz_responses SET credit=?,feedback=?,graded_by=?,graded_at=? WHERE attempt_id=? AND question_id=? AND credit IS NULL",
    ).bind(credit, feedback, user.id, now, attemptId, questionId),
    env.DB.prepare(
      `UPDATE quiz_attempts SET score=(SELECT CASE WHEN SUM(CASE WHEN r.credit IS NULL THEN 1 ELSE 0 END)>0 THEN NULL ELSE ROUND(100.0*SUM(r.credit)/COUNT(*)) END FROM quiz_responses r WHERE r.attempt_id=quiz_attempts.id) WHERE id=? AND status='completed'`,
    ).bind(attemptId),
  ]);
  if (result[1]?.meta?.changes === 0)
    throw new ApiError(
      "CONFLICT",
      409,
      "Jawaban sudah dinilai. Muat ulang hasil.",
    );
  return teacherQuiz(user, id);
}
