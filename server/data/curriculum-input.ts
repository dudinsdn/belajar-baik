import { ApiError } from "../api/error.ts";
import { requirePositiveSkk } from "./curriculum-validation.ts";

export function requiredText(value: unknown, label: string, max = 500) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new ApiError(
      "VALIDATION_ERROR",
      422,
      `${label} wajib diisi (maksimal ${max} karakter).`,
    );
  return value.trim();
}

export function objectInput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError("VALIDATION_ERROR", 422, "Data tidak valid.");
  return value as Record<string, unknown>;
}

export function validateCurriculum(value: unknown) {
  const body = objectInput(value);
  if (
    !Array.isArray(body.rows) ||
    body.rows.length < 1 ||
    body.rows.length > 100
  )
    throw new ApiError(
      "VALIDATION_ERROR",
      422,
      "Isi 1 sampai 100 pemetaan kompetensi.",
    );
  const seen = new Set<string>();
  const allocations = new Map<string, string>();
  const coreDescriptions = new Map<string, string>();
  const rows = body.rows.map((input) => {
    const r = objectInput(input);
    const row = {
      level: requiredText(r.level, "Tingkatan", 60),
      package: requiredText(r.package, "Paket kompetensi", 60),
      subjectId: requiredText(r.subjectId, "Mata pelajaran", 100),
      group: requiredText(r.group, "Kelompok", 30),
      ki: requiredText(r.ki, "Kode KI", 60),
      kiDescription: requiredText(r.kiDescription, "Deskripsi KI", 2000),
      kd: requiredText(r.kd, "Kode KD", 60),
      description: requiredText(r.description, "Deskripsi KD", 2000),
      outcome: requiredText(r.outcome, "Tujuan warga belajar", 2000),
      skk: requirePositiveSkk(r.skk),
      face: r.face as number,
      tutorial: r.tutorial as number,
      independent: r.independent as number,
    };
    if (
      !["general", "specialization", "empowerment", "skills", "local"].includes(
        row.group,
      )
    )
      throw new ApiError(
        "VALIDATION_ERROR",
        422,
        "Kelompok mata pelajaran tidak valid.",
      );
    if (
      ![row.face, row.tutorial, row.independent].every(
        (n) => Number.isInteger(n) && n >= 0 && n <= 100,
      ) ||
      row.face + row.tutorial + row.independent !== 100
    )
      throw new ApiError(
        "VALIDATION_ERROR",
        422,
        "Proporsi mode belajar harus berjumlah 100%.",
      );
    const allocationKey = JSON.stringify([
      row.level,
      row.package,
      row.subjectId,
    ]);
    const signature = JSON.stringify([
      row.skk,
      row.group,
      row.face,
      row.tutorial,
      row.independent,
    ]);
    if (
      allocations.has(allocationKey) &&
      allocations.get(allocationKey) !== signature
    )
      throw new ApiError(
        "VALIDATION_ERROR",
        422,
        "SKK dan mode pada paket/mata pelajaran yang sama harus konsisten.",
      );
    allocations.set(allocationKey, signature);
    const coreKey = JSON.stringify([
      row.level,
      row.package,
      row.subjectId,
      row.ki,
    ]);
    if (
      coreDescriptions.has(coreKey) &&
      coreDescriptions.get(coreKey) !== row.kiDescription
    )
      throw new ApiError(
        "VALIDATION_ERROR",
        422,
        "Deskripsi untuk kode KI yang sama harus konsisten.",
      );
    coreDescriptions.set(coreKey, row.kiDescription);
    const key = JSON.stringify([allocationKey, row.ki, row.kd]);
    if (seen.has(key))
      throw new ApiError(
        "VALIDATION_ERROR",
        422,
        "Kode KD duplikat pada paket dan mata pelajaran yang sama.",
      );
    seen.add(key);
    return row;
  });
  return {
    classId: requiredText(body.classId, "Kelas", 100),
    code: requiredText(body.code, "Kode versi", 100),
    name: requiredText(body.name, "Nama versi", 200),
    source: requiredText(body.source, "Dokumen pemetaan yang disetujui", 1000),
    effectiveFrom: requiredText(body.effectiveFrom, "Tanggal berlaku", 10),
    rows,
  };
}
