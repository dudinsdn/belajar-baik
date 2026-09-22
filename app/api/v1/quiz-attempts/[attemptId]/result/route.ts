import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { requireRole } from "@/server/auth/index.ts";
import { getQuizResult } from "@/server/data/quizzes.ts";

export async function GET(
  request: Request,
  context: { params: Promise<{ attemptId: string }> },
) {
  try {
    const user = await requireApiUser(request);
    requireRole(user, "student");
    return apiSuccess(
      await getQuizResult(user, (await context.params).attemptId),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
