import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { listStudentQuizzes } from "@/server/data/quizzes.ts";
export async function GET(r: Request) {
  try {
    return apiSuccess(await listStudentQuizzes(await requireApiUser(r)));
  } catch (e) {
    return apiFailure(e);
  }
}
