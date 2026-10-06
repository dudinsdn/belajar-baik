import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import {
  curriculumAssignments,
  subjectSkkAllocations,
} from "./curriculum-planning";
import { basicCompetencies } from "./curriculum-core";
import { users } from "./identity";

// Decisions are immutable snapshots. A correction is a new revision.
export const masteryDecisions = sqliteTable(
  "mastery_decisions",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => curriculumAssignments.id),
    competencyId: text("competency_id")
      .notNull()
      .references(() => basicCompetencies.id),
    revision: integer("revision").notNull(),
    status: text("status").notNull(),
    evidenceKind: text("evidence_kind").notNull(),
    evidenceId: text("evidence_id").notNull(),
    snapshotJson: text("snapshot_json").notNull(),
    reason: text("reason").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("mastery_revision_unique").on(
      t.assignmentId,
      t.competencyId,
      t.revision,
    ),
  ],
);
export const skkDecisions = sqliteTable(
  "skk_decisions",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => curriculumAssignments.id),
    allocationId: text("allocation_id")
      .notNull()
      .references(() => subjectSkkAllocations.id),
    revision: integer("revision").notNull(),
    status: text("status").notNull(),
    credits: integer("credits").notNull(),
    snapshotJson: text("snapshot_json").notNull(),
    reason: text("reason").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("skk_revision_unique").on(
      t.assignmentId,
      t.allocationId,
      t.revision,
    ),
  ],
);
