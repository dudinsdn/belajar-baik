import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { requireRole } from "@/server/auth/index.ts";
import { updateLibraryProgress } from "@/server/data/progress.ts";
import { parseLibraryProgress } from "@/server/data/progress-validation.ts";

export async function PUT(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  try {
    const user = await requireApiUser(request);
    requireRole(user, "student");
    return apiSuccess(
      await updateLibraryProgress(
        user,
        (await context.params).itemId,
        parseLibraryProgress(await request.json()),
      ),
    );
  } catch (error) {
    return apiFailure(error);
  }
}
