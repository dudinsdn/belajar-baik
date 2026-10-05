import { apiFailure, apiSuccess } from "@/server/api/response.ts";
import { requireApiUser } from "@/server/auth/api-user.ts";
import { uploadWorkFile } from "@/server/data/work-files.ts";
import { boundedBody } from "@/server/api/work-body.ts";
import { requireRole } from "@/server/auth/index.ts";
import { ApiError } from "@/server/api/error.ts";
export async function POST(
  request: Request,
  c: { params: Promise<{ submissionId: string }> },
) {
  try {
    const user = await requireApiUser(request);
    requireRole(user, "student");
    const bytes = await boundedBody(request, 1100000);
    let form: FormData;
    try {
      form = await new Response(bytes, {
        headers: { "content-type": request.headers.get("content-type") ?? "" },
      }).formData();
    } catch {
      throw new ApiError(
        "VALIDATION_ERROR",
        422,
        "Formulir multipart tidak valid.",
      );
    }
    if (!form.has("version"))
      throw new ApiError("VALIDATION_ERROR", 422, "Versi draf wajib.");
    const file = form.get("file");
    if (!(file instanceof File))
      throw new ApiError("VALIDATION_ERROR", 422, "Berkas wajib diisi.");
    return apiSuccess(
      await uploadWorkFile(
        user,
        (await c.params).submissionId,
        file,
        Number(form.get("version")),
      ),
    );
  } catch (e) {
    return apiFailure(e);
  }
}
