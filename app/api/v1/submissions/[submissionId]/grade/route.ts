import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { requireRole } from "@/server/auth/index.ts";
import { parseGrade } from "@/server/data/assignment-validation.ts";
import { gradeSubmission } from "@/server/data/teacher-grading.ts";

export async function PUT(
  request: Request,
  context: { params: Promise<{ submissionId: string }> },
) {
  try {
    const user = await requireApiUser(request);
    requireRole(user, "teacher");
    const grade = parseGrade(await request.json());
    return apiSuccess(
      await gradeSubmission(
        user,
        (await context.params).submissionId,
        grade.score,
        grade.feedback,
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
