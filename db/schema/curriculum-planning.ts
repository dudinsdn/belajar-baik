import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { competencyPackages, curriculumVersions } from "./curriculum-core";
import { classes, subjects, users } from "./identity";
import { timestamps } from "./shared";

export const subjectSkkAllocations = sqliteTable(
  "subject_skk_allocations",
  {
    id: text("id").primaryKey(),
    competencyPackageId: text("competency_package_id")
      .notNull()
      .references(() => competencyPackages.id),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id),
    subjectGroup: text("subject_group", {
      enum: ["general", "specialization", "empowerment", "skills", "local"],
    }).notNull(),
    plannedSkk: integer("planned_skk").notNull(),
    faceToFacePercent: integer("face_to_face_percent").notNull().default(0),
    tutorialPercent: integer("tutorial_percent").notNull().default(0),
    independentPercent: integer("independent_percent").notNull().default(100),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("subject_skk_package_subject_uidx").on(
      t.competencyPackageId,
      t.subjectId,
    ),
  ],
);

export const learningModes = sqliteTable(
  "learning_modes",
  {
    id: text("id").primaryKey(),
    curriculumVersionId: text("curriculum_version_id")
      .notNull()
      .references(() => curriculumVersions.id),
    code: text("code", {
      enum: ["face_to_face", "tutorial", "independent"],
    }).notNull(),
    name: text("name").notNull(),
    minutesPerSkk: integer("minutes_per_skk").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("learning_modes_version_code_uidx").on(
      t.curriculumVersionId,
      t.code,
    ),
  ],
);

export const curriculumAssignments = sqliteTable(
  "curriculum_assignments",
  {
    id: text("id").primaryKey(),
    curriculumVersionId: text("curriculum_version_id")
      .notNull()
      .references(() => curriculumVersions.id),
    competencyPackageId: text("competency_package_id")
      .notNull()
      .references(() => competencyPackages.id),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    assignedAt: text("assigned_at").notNull(),
    assignedBy: text("assigned_by").references(() => users.id),
    endedAt: text("ended_at"),
    status: text("status", { enum: ["active", "completed", "cancelled"] })
      .notNull()
      .default("active"),
    ...timestamps,
  },
  (t) => [
    index("curriculum_assignments_student_status_idx").on(
      t.studentId,
      t.status,
    ),
    index("curriculum_assignments_class_status_idx").on(t.classId, t.status),
    uniqueIndex("curriculum_assignment_unique").on(
      t.studentId,
      t.competencyPackageId,
    ),
  ],
);
