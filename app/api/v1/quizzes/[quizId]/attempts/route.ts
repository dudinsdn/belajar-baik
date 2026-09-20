import { apiFailure, apiSuccess } from '@/server/api/response.ts';
import { requireApiUser } from '@/server/auth/api-user.ts';
import { requireRole } from '@/server/auth/index.ts';
import { startQuizAttempt } from '@/server/data/quizzes.ts';

export async function POST(request: Request, context: { params:Promise<{ quizId:string }> }) {
  try { const user = await requireApiUser(request); requireRole(user, 'student'); return apiSuccess(await startQuizAttempt(user, (await context.params).quizId)); }
  catch (error) { return apiFailure(error); }
}
