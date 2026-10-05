import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { workPortfolio } from "@/server/data/work-access.ts";
export async function GET(request: Request) {
  try {
    return apiSuccess(await workPortfolio(await requireApiUser(request)));
  } catch (e) {
    return apiFailure(e);
  }
}
