import { apiFailure, apiSuccess } from '@/server/api/response.ts';
import { requireApiUser } from '@/server/auth/api-user.ts';
import { requireRole } from '@/server/auth/index.ts';
import { saveQuizAnswer } from '@/server/data/quizzes.ts';

export async function PUT(request: Request, context: { params:Promise<{ attemptId:string; questionId:string }> }) {
  try {
    const user = await requireApiUser(request); requireRole(user, 'student'); const params = await context.params;
    const body = await request.json() as { selectedOptionId?:unknown };
    return apiSuccess(await saveQuizAnswer(user, params.attemptId, params.questionId, body.selectedOptionId));
  } catch (error) { return apiFailure(error); }
}
