import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { moduleCatalog, saveModule } from "@/server/data/modules.ts";
export async function GET(request: Request) {
  try {
    return apiSuccess(await moduleCatalog(await requireApiUser(request)));
  } catch (e) {
    return apiFailure(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return Response.json(
        { error: { message: "JSON tidak valid." } },
        { status: 422 },
      );
    }
    return apiSuccess(await saveModule(user, input));
  } catch (e) {
    return apiFailure(e);
  }
}
