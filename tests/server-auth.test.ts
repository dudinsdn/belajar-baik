import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthError, getCurrentUser, requireClassAccess, requireOwnUser, requireRole } from '../server/auth/index.ts';
import type { CurrentUser, StoredUser } from '../server/auth/types.ts';

const storedStudent: StoredUser = { id:'student-1', externalIdentityId:'ext-1', email:'old@example.test', displayName:'Old Name', role:'student', status:'active' };
const lookup = async (id: string) => id === 'ext-1' ? storedStudent : null;

test('platform identity is resolved through the server-side user lookup', async () => {
  const request = new Request('https://local.test', { headers: {
    'oai-authenticated-user-id':'ext-1', 'oai-authenticated-user-email':'student@example.test',
    'oai-authenticated-user-full-name':'Dudin%20Sahidin', 'oai-authenticated-user-full-name-encoding':'percent-encoded-utf-8',
  }});
  const user = await getCurrentUser(request, { RUNTIME_ENV:'production', RT_DEV_AUTH:'enabled', RT_DEV_USER_ROLE:'admin' }, lookup);
  assert.deepEqual(user, { id:'student-1', externalIdentityId:'ext-1', email:'student@example.test', displayName:'Dudin Sahidin', role:'student', source:'platform' });
});

test('development fixture is explicit and cannot activate in production', async () => {
  const request = new Request('https://local.test');
  assert.equal(await getCurrentUser(request, { RUNTIME_ENV:'production', RT_DEV_AUTH:'enabled', RT_DEV_USER_ROLE:'admin' }, lookup), null);
  const user = await getCurrentUser(request, { RUNTIME_ENV:'development', RT_DEV_AUTH:'enabled', RT_DEV_USER_ROLE:'teacher' }, lookup);
  assert.equal(user?.source, 'development');
  assert.equal(user?.role, 'teacher');
});

test('role and ownership checks fail closed', () => {
  const student: CurrentUser = { ...storedStudent, source:'platform' };
  assert.throws(() => requireRole(student, 'teacher'), AuthError);
  assert.throws(() => requireOwnUser(student, 'student-2'), AuthError);
  assert.doesNotThrow(() => requireOwnUser(student, 'student-1'));
});

test('class access separates read and manage permissions', () => {
  const student: CurrentUser = { ...storedStudent, source:'platform' };
  const teacher: CurrentUser = { ...student, id:'teacher-1', role:'teacher' };
  const access = { teacherId:'teacher-1', studentIds:['student-1'] };
  assert.doesNotThrow(() => requireClassAccess(student, access, 'read'));
  assert.throws(() => requireClassAccess(student, access, 'manage'), AuthError);
  assert.doesNotThrow(() => requireClassAccess(teacher, access, 'manage'));
});
