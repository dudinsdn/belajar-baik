import { ApiError } from "../api/error.ts";
export const invalid = (message: string): never => {
  throw new ApiError("VALIDATION_ERROR", 422, message);
};
export function text(value: unknown, label: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    return invalid(`${label} wajib diisi, maksimal ${max} karakter.`);
  return value.trim();
}
export function integer(value: unknown, min: number, max: number): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    return invalid(`Angka harus bulat antara ${min} dan ${max}.`);
  return value;
}
export type Answer = string | string[];
export function evaluate(
  kind: string,
  answer: unknown,
  options: Array<{ id: string; is_correct: number }>,
  accepted: string | null,
): { answer: Answer; credit: number | null } {
  if (kind === "short" || kind === "essay") {
    const value = text(answer, "Jawaban");
    return {
      answer: value,
      credit:
        kind === "essay"
          ? null
          : Number(
              value.normalize("NFKC").toLocaleLowerCase("id").trim() ===
                (accepted ?? "")
                  .normalize("NFKC")
                  .toLocaleLowerCase("id")
                  .trim(),
            ),
    };
  }
  const ids = kind === "multiple" ? answer : [answer];
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    ids.length > options.length ||
    ids.some(
      (x) => typeof x !== "string" || !options.some((o) => o.id === x),
    ) ||
    new Set(ids).size !== ids.length
  )
    return invalid("Pilihan tidak termasuk dalam soal ini.");
  const correct = options.filter((x) => x.is_correct).map((x) => x.id);
  return {
    answer: kind === "multiple" ? ids : ids[0],
    credit: Number(
      ids.length === correct.length && correct.every((x) => ids.includes(x)),
    ),
  };
}
