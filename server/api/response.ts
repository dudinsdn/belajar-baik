import { AuthError } from '../auth/errors.ts';
import { ApiError } from './error.ts';

function meta() { return { requestId: crypto.randomUUID() }; }

export function apiSuccess(data: unknown, init?: ResponseInit) {
  return Response.json({ data, meta: meta() }, init);
}

export function apiFailure(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: { code: error.code, message: error.message }, meta: meta() }, { status: error.status });
  }
  if (error instanceof ApiError) {
    return Response.json({ error: { code: error.code, message: error.message, ...(error.fields ? { fields:error.fields } : {}) }, meta: meta() }, { status:error.status });
  }
  console.error('Unhandled API error', error);
  return Response.json({ error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan pada server.' }, meta: meta() }, { status: 500 });
}
