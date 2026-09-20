import { apiFailure, apiSuccess } from '@/server/api/response.ts';
import { requireApiUser } from '@/server/auth/api-user.ts';
import { requireRole } from '@/server/auth/index.ts';
import { submitQuizAttempt } from '@/server/data/quizzes.ts';

export async function POST(request: Request, context: { params:Promise<{ attemptId:string }> }) {
  try { const user = await requireApiUser(request); requireRole(user, 'student'); return apiSuccess(await submitQuizAttempt(user, (await context.params).attemptId)); }
  catch (error) { return apiFailure(error); }
}
