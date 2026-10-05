import { ApiError } from "../api/error.ts";
export function invalid(message: string): never {
  throw new ApiError("VALIDATION_ERROR", 422, message);
}
export function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return invalid("Formulir tidak valid.");
  return input as Record<string, unknown>;
}
export function text(value: unknown, max = 5000) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    return invalid(`Isi teks wajib, maksimal ${max} karakter.`);
  return value.trim();
}
export type Criterion = { label: string; weight: number };
export function rubric(value: unknown): Criterion[] {
  if (!Array.isArray(value) || !value.length || value.length > 10)
    return invalid("Gunakan 1–10 kriteria rubrik.");
  const rows = value.map((v) => {
    const r = object(v);
    if (
      !Number.isInteger(r.weight) ||
      Number(r.weight) < 1 ||
      Number(r.weight) > 100
    )
      return invalid("Bobot harus 1–100.");
    return { label: text(r.label, 200), weight: Number(r.weight) };
  });
  if (rows.reduce((sum, r) => sum + r.weight, 0) !== 100)
    return invalid("Jumlah bobot rubrik harus 100.");
  return rows;
}
export function evidence(value: unknown) {
  if (!Array.isArray(value) || value.length > 10)
    return invalid("Maksimal 10 tautan bukti.");
  return value.map((v) => {
    const r = object(v),
      url = text(r.url, 2000);
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return invalid("Tautan bukti tidak valid.");
    }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password)
      return invalid("Gunakan tautan HTTPS tanpa kredensial.");
    return { label: text(r.label, 200), url };
  });
}
export function version(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    return invalid("Versi draf wajib disertakan.");
  return Number(value);
}
export function gradeRubric(value: unknown, criteria: Criterion[]) {
  if (!Array.isArray(value) || value.length !== criteria.length)
    return invalid("Nilai semua kriteria rubrik.");
  const rows = value.map((v) => {
    const r = object(v);
    if (
      !Number.isInteger(r.score) ||
      Number(r.score) < 0 ||
      Number(r.score) > 100
    )
      return invalid("Nilai kriteria harus 0–100.");
    return { score: Number(r.score), comment: text(r.comment, 1000) };
  });
  return {
    rows,
    score: Math.round(
      rows.reduce((s, r, i) => s + (r.score * criteria[i].weight) / 100, 0),
    ),
  };
}
