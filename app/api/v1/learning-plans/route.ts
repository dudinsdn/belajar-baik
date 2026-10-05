import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import {
  mutateLearningPlans,
  readLearningPlans,
} from "@/server/data/learning-plans.ts";

export async function GET(request: Request) {
  try {
    return apiSuccess(await readLearningPlans(await requireApiUser(request)));
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return Response.json(
        { error: { message: "JSON tidak valid." } },
        { status: 422 },
      );
    }
    return apiSuccess(await mutateLearningPlans(user, input));
  } catch (error) {
    return apiFailure(error);
  }
}
