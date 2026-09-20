import { apiFailure, apiSuccess } from '@/server/api/response.ts';
import { requireApiUser } from '@/server/auth/api-user.ts';
import { requireRole } from '@/server/auth/index.ts';
import { updateMaterialProgress } from '@/server/data/progress.ts';
import { parseMaterialProgress } from '@/server/data/progress-validation.ts';

export async function PUT(request: Request, context: { params:Promise<{ materialId:string }> }) {
  try {
    const user = await requireApiUser(request); requireRole(user, 'student');
    return apiSuccess(await updateMaterialProgress(user, (await context.params).materialId, parseMaterialProgress(await request.json())));
  } catch (error) { return apiFailure(error); }
}
