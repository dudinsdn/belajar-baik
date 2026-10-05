import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { materials } from "./content";
import { users } from "./identity";
import { basicCompetencies } from "./curriculum-core";

export const materialSections = sqliteTable("material_sections", {
  id: text("id").primaryKey(),
  materialId: text("material_id")
    .notNull()
    .references(() => materials.id),
  title: text("title").notNull(),
  kind: text("kind").notNull(),
  body: text("body").notNull(),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  mode: text("mode").notNull(),
  competencyId: text("competency_id")
    .notNull()
    .references(() => basicCompetencies.id),
  orderIndex: integer("order_index").notNull(),
});
export const sectionProgress = sqliteTable(
  "material_section_progress",
  {
    sectionId: text("section_id")
      .notNull()
      .references(() => materialSections.id),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    completedAt: text("completed_at"),
    bookmarked: integer("bookmarked").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.sectionId, t.studentId] })],
);
export const materialSectionEvents = sqliteTable("material_section_events", {
  id: text("id").primaryKey(),
  sectionId: text("section_id")
    .notNull()
    .references(() => materialSections.id),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  note: text("note").notNull(),
  createdAt: text("created_at").notNull(),
});

export const materialModuleSettings = sqliteTable("material_module_settings", {
  materialId: text("material_id")
    .primaryKey()
    .references(() => materials.id),
  prerequisiteId: text("prerequisite_id").references(() => materials.id),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  plannedSkk: integer("planned_skk"),
});
