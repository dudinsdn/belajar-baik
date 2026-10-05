import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { materials } from "./content";
import { classSubjects, users } from "./identity";
import { basicCompetencies } from "./curriculum-core";
import { materialSections } from "./material-sections";
import { timestamps } from "./shared";

export const quizzes = sqliteTable("quizzes", {
  id: text("id").primaryKey(),
  classSubjectId: text("class_subject_id")
    .notNull()
    .references(() => classSubjects.id),
  materialId: text("material_id").references(() => materials.id),
  title: text("title").notNull(),
  status: text("status", { enum: ["draft", "published", "archived"] })
    .notNull()
    .default("draft"),
  purpose: text("purpose", { enum: ["diagnostic", "formative"] })
    .notNull()
    .default("formative"),
  maxAttempts: integer("max_attempts").notNull().default(3),
  passingScore: integer("passing_score").notNull().default(70),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  ...timestamps,
});

export const quizQuestions = sqliteTable(
  "quiz_questions",
  {
    id: text("id").primaryKey(),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id),
    kind: text("kind", { enum: ["single", "multiple", "short", "essay"] })
      .notNull()
      .default("single"),
    competencyId: text("competency_id").references(() => basicCompetencies.id),
    difficulty: text("difficulty").notNull().default("medium"),
    acceptedAnswer: text("accepted_answer"),
    reviewSectionId: text("review_section_id").references(
      () => materialSections.id,
    ),
    prompt: text("prompt").notNull(),
    orderIndex: integer("order_index").notNull(),
    explanation: text("explanation").notNull(),
  },
  (t) => [
    uniqueIndex("quiz_questions_quiz_order_uidx").on(t.quizId, t.orderIndex),
  ],
);

export const quizOptions = sqliteTable(
  "quiz_options",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => quizQuestions.id),
    label: text("label").notNull(),
    orderIndex: integer("order_index").notNull(),
    isCorrect: integer("is_correct", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (t) => [
    uniqueIndex("quiz_options_question_order_uidx").on(
      t.questionId,
      t.orderIndex,
    ),
  ],
);

export const quizAttempts = sqliteTable(
  "quiz_attempts",
  {
    id: text("id").primaryKey(),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    status: text("status", { enum: ["active", "completed"] })
      .notNull()
      .default("active"),
    score: integer("score"),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
  },
  (t) => [
    index("quiz_attempts_student_quiz_status_idx").on(
      t.studentId,
      t.quizId,
      t.status,
    ),
  ],
);

export const quizAnswers = sqliteTable(
  "quiz_answers",
  {
    attemptId: text("attempt_id")
      .notNull()
      .references(() => quizAttempts.id),
    questionId: text("question_id")
      .notNull()
      .references(() => quizQuestions.id),
    selectedOptionId: text("selected_option_id")
      .notNull()
      .references(() => quizOptions.id),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.questionId] })],
);

export const quizResponses = sqliteTable(
  "quiz_responses",
  {
    attemptId: text("attempt_id")
      .notNull()
      .references(() => quizAttempts.id),
    questionId: text("question_id")
      .notNull()
      .references(() => quizQuestions.id),
    answerJson: text("answer_json").notNull(),
    credit: integer("credit"),
    feedback: text("feedback"),
    gradedBy: text("graded_by").references(() => users.id),
    gradedAt: text("graded_at"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.questionId] })],
);
export const quizEvents = sqliteTable("quiz_events", {
  id: text("id").primaryKey(),
  attemptId: text("attempt_id").references(() => quizAttempts.id),
  quizId: text("quiz_id")
    .notNull()
    .references(() => quizzes.id),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  createdAt: text("created_at").notNull(),
});
