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
