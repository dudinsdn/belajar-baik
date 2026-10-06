import * as skk from "./schema/skk";
import * as mentoring from "./schema/mentoring";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as assignmentWork from "./schema/assignment-work";
import * as assignments from "./schema/assignments";
import * as content from "./schema/content";
import * as curriculumCore from "./schema/curriculum-core";
import * as curriculumAudit from "./schema/curriculum-audit";
import * as curriculumLinks from "./schema/curriculum-links";
import * as curriculumPlanning from "./schema/curriculum-planning";
import * as identity from "./schema/identity";
import * as learningPlans from "./schema/learning-plans";
import * as library from "./schema/library";
import * as quizzes from "./schema/quizzes";

const schema = {
  ...skk,
  ...mentoring,
  ...assignments,
  ...assignmentWork,
  ...content,
  ...curriculumCore,
  ...curriculumAudit,
  ...curriculumLinks,
  ...curriculumPlanning,
  ...identity,
  ...library,
  ...learningPlans,
  ...quizzes,
};

export function getDb() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  return drizzle(env.DB, { schema });
}
