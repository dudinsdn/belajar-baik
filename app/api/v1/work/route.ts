import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { workCatalog, createWork } from "@/server/data/work-management.ts";
import { workBody } from "@/server/api/work-body.ts";
export async function GET(request: Request) {
  try {
    return apiSuccess(await workCatalog(await requireApiUser(request)));
  } catch (e) {
    return apiFailure(e);
  }
}
export async function POST(request: Request) {
  try {
    return apiSuccess(
      await createWork(await requireApiUser(request), await workBody(request)),
    );
  } catch (e) {
    return apiFailure(e);
  }
}
