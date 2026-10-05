import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { submissionDetail } from "@/server/data/work-access.ts";
import { mutateWork } from "@/server/data/work-mutations.ts";
import { workBody } from "@/server/api/work-body.ts";
type Context = { params: Promise<{ submissionId: string }> };
export async function GET(request: Request, c: Context) {
  try {
    return apiSuccess(
      await submissionDetail(
        await requireApiUser(request),
        (await c.params).submissionId,
      ),
    );
  } catch (e) {
    return apiFailure(e);
  }
}
export async function PUT(request: Request, c: Context) {
  try {
    return apiSuccess(
      await mutateWork(
        await requireApiUser(request),
        (await c.params).submissionId,
        await workBody(request),
      ),
    );
  } catch (e) {
    return apiFailure(e);
  }
}
