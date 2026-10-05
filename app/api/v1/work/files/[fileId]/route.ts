import { apiFailure } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { downloadWorkFile } from "@/server/data/work-files.ts";
export async function GET(
  request: Request,
  c: { params: Promise<{ fileId: string }> },
) {
  try {
    return await downloadWorkFile(
      await requireApiUser(request),
      (await c.params).fileId,
    );
  } catch (e) {
    return apiFailure(e);
  }
}
