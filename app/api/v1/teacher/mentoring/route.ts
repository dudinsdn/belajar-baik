import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import {
  mutateMentoring,
  readMentoringDashboard,
  readMentoringDetail,
} from "@/server/data/mentoring.ts";
export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request),
      url = new URL(request.url);
    const cs = url.searchParams.get("subject"),
      student = url.searchParams.get("student");
    return apiSuccess(
      cs !== null || student !== null
        ? await readMentoringDetail(user, cs ?? "", student ?? "")
        : await readMentoringDashboard(user),
    );
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
    return apiSuccess(await mutateMentoring(user, input));
  } catch (error) {
    return apiFailure(error);
  }
}
