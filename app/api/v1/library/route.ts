import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireRole } from "@/server/auth/index.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { listStudentLibrary } from "@/server/data/student-read.ts";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    requireRole(user, "student");
    const query = new URL(request.url).searchParams.get("query") ?? "";
    return apiSuccess(await listStudentLibrary(user, query));
  } catch (error) {
    return apiFailure(error);
  }
}
