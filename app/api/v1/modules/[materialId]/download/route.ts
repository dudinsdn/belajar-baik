import { apiFailure } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { readModule } from "@/server/data/modules.ts";
import { moduleText } from "@/app/learning/module-text";
export async function GET(
  request: Request,
  context: { params: Promise<{ materialId: string }> },
) {
  try {
    const data = await readModule(
      await requireApiUser(request),
      (await context.params).materialId,
    );
    return new Response(moduleText(data), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": "attachment; filename=modul-belajar.txt",
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    return apiFailure(e);
  }
}
