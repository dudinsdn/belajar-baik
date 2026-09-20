import { apiFailure, apiSuccess } from '@/server/api/response.ts';
import { requireApiUser } from '@/server/auth/api-user.ts';
import { requireRole } from '@/server/auth/index.ts';
import { listTeacherSubmissions } from '@/server/data/teacher-grading.ts';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request); requireRole(user, 'teacher');
    return apiSuccess(await listTeacherSubmissions(user, new URL(request.url).searchParams.get('status') ?? undefined));
  } catch (error) { return apiFailure(error); }
}
