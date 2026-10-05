import { sqliteTable, text, index, primaryKey } from "drizzle-orm/sqlite-core";
import { classSubjects, users } from "./identity";
import { basicCompetencies } from "./curriculum-core";
import { materials } from "./content";
import { assignments, submissions } from "./assignments";
import { timestamps } from "./shared";

export const learningPlans = sqliteTable(
  "learning_plans",
  {
    id: text("id").primaryKey(),
    classSubjectId: text("class_subject_id")
      .notNull()
      .references(() => classSubjects.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    competencyId: text("competency_id")
      .notNull()
      .references(() => basicCompetencies.id),
    title: text("title").notNull(),
    mode: text("mode", {
      enum: ["independent", "tutorial", "face_to_face"],
    }).notNull(),
    materialId: text("material_id").references(() => materials.id),
    dueAt: text("due_at").notNull(),
    instructions: text("instructions").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [index("learning_plans_student_due_idx").on(t.studentId, t.dueAt)],
);

export const learningPlanEvents = sqliteTable("learning_plan_events", {
  id: text("id").primaryKey(),
  planId: text("plan_id")
    .notNull()
    .references(() => learningPlans.id),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  detail: text("detail").notNull(),
  createdAt: text("created_at").notNull(),
});

export const learningSupport = sqliteTable(
  "learning_support",
  {
    classSubjectId: text("class_subject_id")
      .notNull()
      .references(() => classSubjects.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason").notNull(),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => users.id),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.classSubjectId, t.studentId] })],
);

export const learningSupportEvents = sqliteTable("learning_support_events", {
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
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull(),
});

export const assignmentDeadlines = sqliteTable(
  "assignment_deadlines",
  {
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    dueAt: text("due_at").notNull(),
    reason: text("reason").notNull(),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => users.id),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.assignmentId, t.studentId] })],
);

export const assignmentDeadlineEvents = sqliteTable(
  "assignment_deadline_events",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    dueAt: text("due_at").notNull(),
    reason: text("reason").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
);

export const feedbackAcknowledgments = sqliteTable(
  "feedback_acknowledgments",
  {
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id),
    gradedAt: text("graded_at").notNull(),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    acknowledgedAt: text("acknowledged_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.submissionId, t.gradedAt] })],
);
