import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../server/api/error.ts";
import {
  parseLibraryProgress,
  parseMaterialProgress,
} from "../server/data/progress-validation.ts";

test("material progress accepts bounded integer percent and trims position", () => {
  assert.deepEqual(
    parseMaterialProgress({ percent: 75, lastPosition: " halaman-18 " }),
    { percent: 75, lastPosition: "halaman-18" },
  );
});

test("library progress requires boolean bookmark", () => {
  assert.deepEqual(
    parseLibraryProgress({ percent: 43, lastPosition: null, bookmarked: true }),
    { percent: 43, lastPosition: null, bookmarked: true },
  );
  assert.throws(
    () => parseLibraryProgress({ percent: 43, bookmarked: 1 }),
    ApiError,
  );
});

test("progress rejects out-of-range or fractional values", () => {
  assert.throws(() => parseMaterialProgress({ percent: -1 }), ApiError);
  assert.throws(() => parseMaterialProgress({ percent: 100.5 }), ApiError);
  assert.throws(() => parseMaterialProgress({ percent: 101 }), ApiError);
});
