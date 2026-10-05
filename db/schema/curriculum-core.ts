import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { classes, subjects, users } from "./identity";
import { timestamps } from "./shared";

export const curriculumVersions = sqliteTable(
  "curriculum_versions",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    classId: text("class_id").references(() => classes.id),
    createdBy: text("created_by").references(() => users.id),
    academicYear: text("academic_year"),
    program: text("program"),
    name: text("name").notNull(),
    framework: text("framework", {
      enum: ["k13", "merdeka", "local"],
    }).notNull(),
    sourceReference: text("source_reference").notNull(),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    status: text("status", { enum: ["draft", "active", "retired"] })
      .notNull()
      .default("draft"),
    ...timestamps,
  },
  (t) => [uniqueIndex("curriculum_versions_code_uidx").on(t.code)],
);

export const competencyLevels = sqliteTable(
  "competency_levels",
  {
    id: text("id").primaryKey(),
    curriculumVersionId: text("curriculum_version_id")
      .notNull()
      .references(() => curriculumVersions.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    orderIndex: integer("order_index").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("competency_levels_version_code_uidx").on(
      t.curriculumVersionId,
      t.code,
    ),
  ],
);

export const competencyPackages = sqliteTable(
  "competency_packages",
  {
    id: text("id").primaryKey(),
    competencyLevelId: text("competency_level_id")
      .notNull()
      .references(() => competencyLevels.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    orderIndex: integer("order_index").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("competency_packages_level_code_uidx").on(
      t.competencyLevelId,
      t.code,
    ),
  ],
);

export const coreCompetencies = sqliteTable(
  "core_competencies",
  {
    id: text("id").primaryKey(),
    competencyPackageId: text("competency_package_id")
      .notNull()
      .references(() => competencyPackages.id),
    code: text("code").notNull(),
    description: text("description").notNull(),
    orderIndex: integer("order_index").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("core_competencies_package_code_uidx").on(
      t.competencyPackageId,
      t.code,
    ),
  ],
);

export const basicCompetencies = sqliteTable(
  "basic_competencies",
  {
    id: text("id").primaryKey(),
    coreCompetencyId: text("core_competency_id")
      .notNull()
      .references(() => coreCompetencies.id),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id),
    code: text("code").notNull(),
    description: text("description").notNull(),
    learnerOutcome: text("learner_outcome").notNull(),
    orderIndex: integer("order_index").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("basic_competencies_core_subject_code_uidx").on(
      t.coreCompetencyId,
      t.subjectId,
      t.code,
    ),
  ],
);
