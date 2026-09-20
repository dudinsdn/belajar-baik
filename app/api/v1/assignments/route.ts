import { apiFailure, apiSuccess } from '@/server/api/response.ts';
import { requireApiUser } from '@/server/auth/api-user.ts';
import { requireRole } from '@/server/auth/index.ts';
import { listStudentAssignments } from '@/server/data/assignments.ts';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request); requireRole(user, 'student');
    return apiSuccess(await listStudentAssignments(user, new URL(request.url).searchParams.get('status') ?? undefined));
  } catch (error) { return apiFailure(error); }
}
