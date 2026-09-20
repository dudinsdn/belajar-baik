import { ApiError } from '../api/error.ts';

function parsePercent(value: unknown) {
  if (!Number.isInteger(value) || typeof value !== 'number' || value < 0 || value > 100) {
    throw new ApiError('VALIDATION_ERROR', 422, 'Progres harus berupa angka bulat antara 0 dan 100.', { percent:'Gunakan angka 0 sampai 100.' });
  }
  return value;
}

function parsePosition(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.trim().length > 200) {
    throw new ApiError('VALIDATION_ERROR', 422, 'Posisi bacaan tidak valid.', { lastPosition:'Maksimal 200 karakter.' });
  }
  return value.trim() || null;
}

export function parseMaterialProgress(input: unknown) {
  if (!input || typeof input !== 'object' || !('percent' in input)) throw new ApiError('VALIDATION_ERROR', 422, 'Data progres belum lengkap.');
  return { percent:parsePercent(input.percent), lastPosition:parsePosition('lastPosition' in input ? input.lastPosition : null) };
}

export function parseLibraryProgress(input: unknown) {
  if (!input || typeof input !== 'object' || !('percent' in input) || !('bookmarked' in input)) throw new ApiError('VALIDATION_ERROR', 422, 'Data progres belum lengkap.');
  if (typeof input.bookmarked !== 'boolean') throw new ApiError('VALIDATION_ERROR', 422, 'Status simpan harus berupa boolean.', { bookmarked:'Gunakan true atau false.' });
  return { percent:parsePercent(input.percent), lastPosition:parsePosition('lastPosition' in input ? input.lastPosition : null), bookmarked:input.bookmarked };
}
