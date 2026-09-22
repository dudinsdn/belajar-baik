import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireRole } from "@/server/auth/index.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { listStudentMaterials } from "@/server/data/student-read.ts";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    requireRole(user, "student");
    return apiSuccess(await listStudentMaterials(user));
  } catch (error) {
    return apiFailure(error);
  }
}
