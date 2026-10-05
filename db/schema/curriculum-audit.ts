import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./identity";

export const curriculumEvents = sqliteTable("curriculum_events", {
  id: text("id").primaryKey(),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  resourceId: text("resource_id").notNull(),
  occurredAt: text("occurred_at").notNull(),
});
