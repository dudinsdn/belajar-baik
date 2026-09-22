import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { classSubjects, users } from "./identity";
import { timestamps } from "./shared";

export const assignments = sqliteTable(
  "assignments",
  {
    id: text("id").primaryKey(),
    classSubjectId: text("class_subject_id")
      .notNull()
      .references(() => classSubjects.id),
    title: text("title").notNull(),
    instructions: text("instructions").notNull(),
    submissionType: text("submission_type").notNull().default("text"),
    dueAt: text("due_at").notNull(),
    allowLate: integer("allow_late", { mode: "boolean" })
      .notNull()
      .default(false),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [
    index("assignments_class_status_due_idx").on(
      t.classSubjectId,
      t.status,
      t.dueAt,
    ),
  ],
);

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    answerText: text("answer_text").notNull().default(""),
    status: text("status", { enum: ["draft", "submitted", "graded"] })
      .notNull()
      .default("draft"),
    submittedAt: text("submitted_at"),
    score: integer("score"),
    feedback: text("feedback"),
    gradedBy: text("graded_by").references(() => users.id),
    gradedAt: text("graded_at"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("submissions_assignment_student_uidx").on(
      t.assignmentId,
      t.studentId,
    ),
    index("submissions_assignment_status_idx").on(t.assignmentId, t.status),
  ],
);
