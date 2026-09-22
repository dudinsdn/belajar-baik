import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { subjects, users } from "./identity";
import { timestamps } from "./shared";

export const libraryItems = sqliteTable(
  "library_items",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id").references(() => subjects.id),
    title: text("title").notNull(),
    author: text("author").notNull(),
    description: text("description").notNull(),
    content: text("content").notNull(),
    pageCount: integer("page_count").notNull(),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    ...timestamps,
  },
  (t) => [index("library_items_subject_status_idx").on(t.subjectId, t.status)],
);

export const libraryProgress = sqliteTable(
  "library_progress",
  {
    libraryItemId: text("library_item_id")
      .notNull()
      .references(() => libraryItems.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    percent: integer("percent").notNull().default(0),
    lastPosition: text("last_position"),
    bookmarked: integer("bookmarked", { mode: "boolean" })
      .notNull()
      .default(false),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.libraryItemId, t.studentId] }),
    index("library_progress_student_idx").on(t.studentId, t.updatedAt),
  ],
);
