import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../server/api/error.ts";
import {
  reconcilePlannedSkk,
  requirePositiveSkk,
} from "../server/data/curriculum-validation.ts";

test("SKK allocation requires a positive integer", () => {
  assert.equal(requirePositiveSkk(4), 4);
  for (const invalid of [0, -1, 1.5, "4", null]) {
    assert.throws(() => requirePositiveSkk(invalid), ApiError);
  }
});

test("planned SKK reconciles by package and subject", () => {
  assert.deepEqual(
    reconcilePlannedSkk([
      { competencyPackageId: "5.1", subjectId: "sej", plannedSkk: 2 },
      { competencyPackageId: "5.1", subjectId: "mat", plannedSkk: 3 },
      { competencyPackageId: "5.2", subjectId: "sej", plannedSkk: 4 },
    ]),
    {
      total: 9,
      byPackage: { "5.1": 5, "5.2": 4 },
      bySubject: { sej: 6, mat: 3 },
    },
  );
});
