import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { classSubjects, users } from "./identity";
import { timestamps } from "./shared";

export const materials = sqliteTable(
  "materials",
  {
    id: text("id").primaryKey(),
    classSubjectId: text("class_subject_id")
      .notNull()
      .references(() => classSubjects.id),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    content: text("content").notNull(),
    orderIndex: integer("order_index").notNull(),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    publishedAt: text("published_at"),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [
    index("materials_class_status_order_idx").on(
      t.classSubjectId,
      t.status,
      t.orderIndex,
    ),
  ],
);

export const materialProgress = sqliteTable(
  "material_progress",
  {
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    percent: integer("percent").notNull().default(0),
    lastPosition: text("last_position"),
    completedAt: text("completed_at"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.materialId, t.studentId] }),
    index("material_progress_student_idx").on(t.studentId, t.updatedAt),
  ],
);
