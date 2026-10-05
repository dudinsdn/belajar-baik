import { ApiError } from "../api/error.ts";

export function requirePositiveSkk(value: unknown) {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new ApiError(
      "VALIDATION_ERROR",
      422,
      "Bobot SKK harus berupa bilangan bulat positif.",
      { plannedSkk: "Gunakan bilangan bulat lebih dari 0." },
    );
  }
  return value as number;
}

export function reconcilePlannedSkk(
  allocations: Array<{
    competencyPackageId: string;
    subjectId: string;
    plannedSkk: number;
  }>,
) {
  const byPackage = new Map<string, number>();
  const bySubject = new Map<string, number>();
  let total = 0;
  for (const allocation of allocations) {
    const plannedSkk = requirePositiveSkk(allocation.plannedSkk);
    total += plannedSkk;
    byPackage.set(
      allocation.competencyPackageId,
      (byPackage.get(allocation.competencyPackageId) ?? 0) + plannedSkk,
    );
    bySubject.set(
      allocation.subjectId,
      (bySubject.get(allocation.subjectId) ?? 0) + plannedSkk,
    );
  }
  return {
    total,
    byPackage: Object.fromEntries(byPackage),
    bySubject: Object.fromEntries(bySubject),
  };
}
