import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { quizHistory } from "@/server/data/quizzes.ts";
export async function GET(
  r: Request,
  c: { params: Promise<{ quizId: string }> },
) {
  try {
    return apiSuccess(
      await quizHistory(await requireApiUser(r), (await c.params).quizId),
    );
  } catch (e) {
    return apiFailure(e);
  }
}
