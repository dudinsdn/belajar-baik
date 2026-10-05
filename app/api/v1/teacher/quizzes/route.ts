import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { quizCatalog, createQuiz } from "@/server/data/quiz-management.ts";
export async function GET(r: Request) {
  try {
    return apiSuccess(await quizCatalog(await requireApiUser(r)));
  } catch (e) {
    return apiFailure(e);
  }
}
export async function POST(r: Request) {
  try {
    const u = await requireApiUser(r);
    let b;
    try {
      b = await r.json();
    } catch {
      return Response.json(
        { error: { message: "JSON tidak valid." } },
        { status: 422 },
      );
    }
    return apiSuccess(await createQuiz(u, b));
  } catch (e) {
    return apiFailure(e);
  }
}
