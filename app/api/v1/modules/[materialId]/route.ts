import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { readModule, updateSection } from "@/server/data/modules.ts";
type Context = { params: Promise<{ materialId: string }> };
export async function GET(request: Request, context: Context) {
  try {
    return apiSuccess(
      await readModule(
        await requireApiUser(request),
        (await context.params).materialId,
      ),
    );
  } catch (e) {
    return apiFailure(e);
  }
}
export async function PUT(request: Request, context: Context) {
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
    return apiSuccess(
      await updateSection(user, (await context.params).materialId, input),
    );
  } catch (e) {
    return apiFailure(e);
  }
}
