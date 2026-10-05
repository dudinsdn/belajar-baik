import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { requireRole } from "@/server/auth/index.ts";
import { saveQuizAnswer } from "@/server/data/quizzes.ts";

export async function PUT(
  request: Request,
  context: { params: Promise<{ attemptId: string; questionId: string }> },
) {
  try {
    const user = await requireApiUser(request);
    requireRole(user, "student");
    const params = await context.params;
    let body: { selectedOptionId?: unknown; answer?: unknown };
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: { message: "JSON tidak valid." } },
        { status: 422 },
      );
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return Response.json(
        { error: { message: "Jawaban tidak valid." } },
        { status: 422 },
      );
    return apiSuccess(
      await saveQuizAnswer(
        user,
        params.attemptId,
        params.questionId,
        body.answer ?? body.selectedOptionId,
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
