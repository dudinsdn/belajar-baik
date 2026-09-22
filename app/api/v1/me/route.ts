import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireRole } from "@/server/auth/index.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { getStudentProfile } from "@/server/data/student-read.ts";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    if (user.role === "student")
      return apiSuccess(await getStudentProfile(user));
    requireRole(user, "teacher", "admin");
    return apiSuccess({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      enrollment: null,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
