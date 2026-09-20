import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../server/api/error.ts';
import { parseGrade } from '../server/data/assignment-validation.ts';

test('grade parser accepts a bounded integer and trims feedback', () => {
  assert.deepEqual(parseGrade({ score:88, feedback:'  Argumen sudah kuat.  ' }), { score:88, feedback:'Argumen sudah kuat.' });
});

test('grade parser rejects invalid scores and feedback', () => {
  assert.throws(() => parseGrade({ score:-1, feedback:'Baik' }), ApiError);
  assert.throws(() => parseGrade({ score:101, feedback:'Baik' }), ApiError);
  assert.throws(() => parseGrade({ score:88.5, feedback:'Baik' }), ApiError);
  assert.throws(() => parseGrade({ score:88, feedback:'   ' }), ApiError);
  assert.throws(() => parseGrade({ score:88, feedback:'x'.repeat(2001) }), ApiError);
});
