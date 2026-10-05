import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { assignments } from "./assignments";
import { materials } from "./content";
import { basicCompetencies } from "./curriculum-core";
import { quizzes } from "./quizzes";

export const materialBasicCompetencies = sqliteTable(
  "material_basic_competencies",
  {
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id),
    basicCompetencyId: text("basic_competency_id")
      .notNull()
      .references(() => basicCompetencies.id),
  },
  (t) => [primaryKey({ columns: [t.materialId, t.basicCompetencyId] })],
);

export const quizBasicCompetencies = sqliteTable(
  "quiz_basic_competencies",
  {
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.id),
    basicCompetencyId: text("basic_competency_id")
      .notNull()
      .references(() => basicCompetencies.id),
  },
  (t) => [primaryKey({ columns: [t.quizId, t.basicCompetencyId] })],
);

export const assignmentBasicCompetencies = sqliteTable(
  "assignment_basic_competencies",
  {
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id),
    basicCompetencyId: text("basic_competency_id")
      .notNull()
      .references(() => basicCompetencies.id),
  },
  (t) => [primaryKey({ columns: [t.assignmentId, t.basicCompetencyId] })],
);
