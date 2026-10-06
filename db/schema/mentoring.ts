import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { classSubjects, users } from "./identity";
import { learningPlans } from "./learning-plans";

// Append-only decisions. A follow-up closes an intervention with a new event.
export const mentoringEvents = sqliteTable(
  "mentoring_events",
  {
    id: text("id").primaryKey(),
    classSubjectId: text("class_subject_id")
      .notNull()
      .references(() => classSubjects.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").notNull(),
    detail: text("detail").notNull(),
    dueAt: text("due_at"),
    parentId: text("parent_id"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("mentoring_student_subject_idx").on(
      t.studentId,
      t.classSubjectId,
      t.createdAt,
    ),
  ],
);
export const attendanceEvents = sqliteTable(
  "attendance_events",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => learningPlans.id),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull(),
    reason: text("reason").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("attendance_plan_time_idx").on(t.planId, t.createdAt)],
);
