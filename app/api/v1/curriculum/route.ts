import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { mutateCurriculum, readCurriculum } from "@/server/data/curriculum.ts";

export async function GET(request: Request) {
  try {
    return apiSuccess(await readCurriculum(await requireApiUser(request)));
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
    return apiSuccess(await mutateCurriculum(user, input));
  } catch (error) {
    return apiFailure(error);
  }
}
