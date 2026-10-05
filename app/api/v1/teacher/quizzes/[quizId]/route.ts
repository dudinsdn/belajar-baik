import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import {
  teacherQuiz,
  publishQuiz,
  gradeEssay,
} from "@/server/data/quiz-management.ts";
type Context = { params: Promise<{ quizId: string }> };
export async function GET(r: Request, c: Context) {
  try {
    return apiSuccess(
      await teacherQuiz(await requireApiUser(r), (await c.params).quizId),
    );
  } catch (e) {
    return apiFailure(e);
  }
}
export async function POST(r: Request, c: Context) {
  try {
    const u = await requireApiUser(r);
    let b: Record<string, unknown>;
    try {
      b = await r.json();
    } catch {
      return Response.json(
        { error: { message: "JSON tidak valid." } },
        { status: 422 },
      );
    }
    const id = (await c.params).quizId;
    return apiSuccess(
      b && typeof b === "object" && b.action === "publish"
        ? await publishQuiz(u, id)
        : await gradeEssay(u, id, b),
    );
  } catch (e) {
    return apiFailure(e);
  }
}
