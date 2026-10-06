import { apiSuccess, apiFailure } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { readSkk, decideSkk } from "@/server/data/skk.ts";
export async function GET(request: Request) {
  try {
    return apiSuccess(await readSkk(await requireApiUser(request)));
  } catch (error) {
    return apiFailure(error);
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
    return apiSuccess(await decideSkk(user, input));
  } catch (error) {
    return apiFailure(error);
  }
}
