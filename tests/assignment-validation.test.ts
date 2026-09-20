import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../server/api/error.ts';
import { parseAnswerText } from '../server/data/assignment-validation.ts';

test('assignment answer parser trims valid text', () => {
  assert.equal(parseAnswerText({ answerText:'  Jawaban siswa  ' }), 'Jawaban siswa');
});


test('assignment answer parser rejects missing and oversized text', () => {
  assert.throws(() => parseAnswerText({}), ApiError);
  assert.throws(() => parseAnswerText({ answerText:'x'.repeat(5001) }), ApiError);
  assert.throws(() => parseAnswerText({ answerText:'   ' }, true), ApiError);
});
