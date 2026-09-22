import {
  index,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { timestamps } from "./shared";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    externalIdentityId: text("external_identity_id").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role", { enum: ["student", "teacher", "admin"] }).notNull(),
    status: text("status", { enum: ["active", "inactive"] })
      .notNull()
      .default("active"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("users_external_identity_uidx").on(t.externalIdentityId),
    uniqueIndex("users_email_uidx").on(t.email),
  ],
);

export const classes = sqliteTable("classes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  program: text("program").notNull(),
  gradeLevel: text("grade_level").notNull(),
  academicYear: text("academic_year").notNull(),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => users.id),
  status: text("status", { enum: ["active", "archived"] })
    .notNull()
    .default("active"),
  ...timestamps,
});

export const classMemberships = sqliteTable(
  "class_memberships",
  {
    classId: text("class_id")
      .notNull()
      .references(() => classes.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    joinedAt: text("joined_at").notNull(),
    status: text("status", { enum: ["active", "inactive"] })
      .notNull()
      .default("active"),
  },
  (t) => [
    primaryKey({ columns: [t.classId, t.studentId] }),
    index("class_memberships_student_idx").on(t.studentId, t.status),
  ],
);

export const subjects = sqliteTable(
  "subjects",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("subjects_code_uidx").on(t.code)],
);

export const classSubjects = sqliteTable(
  "class_subjects",
  {
    id: text("id").primaryKey(),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("class_subjects_class_subject_uidx").on(t.classId, t.subjectId),
  ],
);
