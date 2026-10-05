import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { assignments, submissions } from "./assignments";
import { users } from "./identity";
export const assignmentWork = sqliteTable("assignment_work", {
  assignmentId: text("assignment_id")
    .primaryKey()
    .references(() => assignments.id),
  kind: text("kind").notNull(),
  rubricJson: text("rubric_json").notNull(),
  plannedSkk: integer("planned_skk").notNull(),
});
export const submissionWork = sqliteTable("submission_work", {
  submissionId: text("submission_id")
    .primaryKey()
    .references(() => submissions.id),
  version: integer("version").notNull().default(0),
  revisionRequested: integer("revision_requested").notNull().default(0),
  evidenceJson: text("evidence_json").notNull().default("[]"),
  portfolio: integer("portfolio").notNull().default(0),
  priorLearning: integer("prior_learning").notNull().default(0),
});
export const submissionHistory = sqliteTable("submission_history", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id")
    .notNull()
    .references(() => submissions.id),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id),
  event: text("event").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  createdAt: text("created_at").notNull(),
});
export const workFiles = sqliteTable("work_files", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id")
    .notNull()
    .references(() => submissions.id),
  name: text("name").notNull(),
  mime: text("mime").notNull(),
  data: text("data").notNull(),
  size: integer("size").notNull(),
  createdAt: text("created_at").notNull(),
});
