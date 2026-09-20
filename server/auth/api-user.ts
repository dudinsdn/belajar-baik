import { env } from 'cloudflare:workers';
import { requireCurrentUser } from './current-user.ts';
import type { AuthEnvironment, StoredUser } from './types.ts';

async function findUserByExternalIdentity(externalIdentityId: string): Promise<StoredUser | null> {
  const row = await env.DB.prepare(
    `SELECT id, external_identity_id, email, display_name, role, status
     FROM users WHERE external_identity_id = ? LIMIT 1`,
  ).bind(externalIdentityId).first<{
    id: string; external_identity_id: string; email: string; display_name: string;
    role: StoredUser['role']; status: StoredUser['status'];
  }>();
  if (!row) return null;
  return { id: row.id, externalIdentityId: row.external_identity_id, email: row.email, displayName: row.display_name, role: row.role, status: row.status };
}

async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const row = await env.DB.prepare(
    `SELECT id, external_identity_id, email, display_name, role, status
     FROM users WHERE email = ? COLLATE NOCASE LIMIT 1`,
  ).bind(email).first<{
    id: string; external_identity_id: string; email: string; display_name: string;
    role: StoredUser['role']; status: StoredUser['status'];
  }>();
  if (!row) return null;
  return { id:row.id, externalIdentityId:row.external_identity_id, email:row.email, displayName:row.display_name, role:row.role, status:row.status };
}

export function requireApiUser(request: Request) {
  return requireCurrentUser(request, env as AuthEnvironment, findUserByExternalIdentity, findUserByEmail);
}
