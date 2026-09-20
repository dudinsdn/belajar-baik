import { ApiError } from '../api/error.ts';

export function parseAnswerText(input: unknown, required = false) {
  if (!input || typeof input !== 'object' || !('answerText' in input) || typeof input.answerText !== 'string') {
    throw new ApiError('VALIDATION_ERROR', 422, 'Data yang dikirim belum lengkap.', { answerText:'Jawaban harus berupa teks.' });
  }
  const answerText = input.answerText.trim();
  if (required && !answerText) throw new ApiError('VALIDATION_ERROR', 422, 'Jawaban wajib diisi.', { answerText:'Jawaban wajib diisi.' });
  if (answerText.length > 5000) throw new ApiError('VALIDATION_ERROR', 422, 'Jawaban terlalu panjang.', { answerText:'Maksimal 5.000 karakter.' });
  return answerText;
}
