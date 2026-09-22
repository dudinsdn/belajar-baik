import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { requireRole } from "@/server/auth/index.ts";
import { submitAssignment } from "@/server/data/assignments.ts";

export async function POST(
  request: Request,
  context: { params: Promise<{ assignmentId: string }> },
) {
  try {
    const user = await requireApiUser(request);
    requireRole(user, "student");
    return apiSuccess(
      await submitAssignment(user, (await context.params).assignmentId),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
