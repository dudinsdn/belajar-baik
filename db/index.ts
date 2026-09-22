import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as assignments from "./schema/assignments";
import * as content from "./schema/content";
import * as identity from "./schema/identity";
import * as library from "./schema/library";
import * as quizzes from "./schema/quizzes";

const schema = {
  ...assignments,
  ...content,
  ...identity,
  ...library,
  ...quizzes,
};

export function getDb() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  return drizzle(env.DB, { schema });
}
