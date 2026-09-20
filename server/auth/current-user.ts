import { AuthError } from './errors.ts';
import type { AuthEnvironment, CurrentUser, UserLookup, UserLookupByEmail, UserRole } from './types.ts';

const roles = new Set<UserRole>(['student', 'teacher', 'admin']);

function decodeDisplayName(headers: Headers, email: string) {
  const value = headers.get('oai-authenticated-user-full-name');
  const encoding = headers.get('oai-authenticated-user-full-name-encoding');
  if (!value || encoding !== 'percent-encoded-utf-8') return email;
  try { return decodeURIComponent(value); } catch { return email; }
}

function developmentUser(env: AuthEnvironment): CurrentUser | null {
  if (env.RUNTIME_ENV !== 'development' || env.RT_DEV_AUTH !== 'enabled') return null;
  const role = env.RT_DEV_USER_ROLE;
  if (!role || !roles.has(role as UserRole)) {
    throw new AuthError('UNAUTHENTICATED', 401, 'Development identity has an invalid role.');
  }
  return {
    id: env.RT_DEV_USER_ID ?? 'usr_student_dudin',
    externalIdentityId: env.RT_DEV_EXTERNAL_ID ?? 'dev:student:dudin',
    email: env.RT_DEV_USER_EMAIL ?? 'dudin@ruangtumbuh.local',
    displayName: env.RT_DEV_USER_NAME ?? 'Dudin Sahidin',
    role: role as UserRole,
    source: 'development',
  };
}

export async function getCurrentUser(request: Request, env: AuthEnvironment, lookup: UserLookup, lookupByEmail?: UserLookupByEmail): Promise<CurrentUser | null> {
  const externalIdentityId = request.headers.get('oai-authenticated-user-id');
  const emailHeader = request.headers.get('oai-authenticated-user-email');
  const email = emailHeader?.trim().toLowerCase();
  if (email) {
    const byExternalIdentity = externalIdentityId ? await lookup(externalIdentityId) : null;
    if (byExternalIdentity && byExternalIdentity.email.toLowerCase() !== email) return null;
    const stored = byExternalIdentity ?? await lookupByEmail?.(email) ?? null;
    if (!stored || stored.status !== 'active') return null;
    return {
      id: stored.id,
      externalIdentityId: externalIdentityId ?? stored.externalIdentityId,
      email,
      displayName: decodeDisplayName(request.headers, email),
      role: stored.role,
      source: 'platform',
    };
  }
  return developmentUser(env);
}

export async function requireCurrentUser(request: Request, env: AuthEnvironment, lookup: UserLookup, lookupByEmail?: UserLookupByEmail) {
  const user = await getCurrentUser(request, env, lookup, lookupByEmail);
  if (!user) throw new AuthError('UNAUTHENTICATED', 401, 'Sign in is required.');
  return user;
}
