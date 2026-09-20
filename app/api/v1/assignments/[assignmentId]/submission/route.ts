import { apiFailure, apiSuccess } from '@/server/api/response.ts';
import { requireApiUser } from '@/server/auth/api-user.ts';
import { requireRole } from '@/server/auth/index.ts';
import { parseAnswerText } from '@/server/data/assignment-validation.ts';
import { saveAssignmentDraft } from '@/server/data/assignments.ts';

export async function PUT(request: Request, context: { params:Promise<{ assignmentId:string }> }) {
  try {
    const user = await requireApiUser(request); requireRole(user, 'student');
    const answerText = parseAnswerText(await request.json());
    return apiSuccess(await saveAssignmentDraft(user, (await context.params).assignmentId, answerText));
  } catch (error) { return apiFailure(error); }
}
