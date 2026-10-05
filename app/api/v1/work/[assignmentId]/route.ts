import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { workDetail } from "@/server/data/work-access.ts";
import { ensureWork } from "@/server/data/work-mutations.ts";
import { publishWork } from "@/server/data/work-management.ts";
type Context = { params: Promise<{ assignmentId: string }> };
export async function GET(request: Request, c: Context) {
  try {
    return apiSuccess(
      await workDetail(
        await requireApiUser(request),
        (await c.params).assignmentId,
      ),
    );
  } catch (e) {
    return apiFailure(e);
  }
}
export async function POST(request: Request, c: Context) {
  try {
    const user = await requireApiUser(request),
      id = (await c.params).assignmentId;
    return apiSuccess(
      user.role === "teacher"
        ? await publishWork(user, id)
        : { id: await ensureWork(user, id) },
    );
  } catch (e) {
    return apiFailure(e);
  }
}
