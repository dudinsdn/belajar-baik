import type { Dispatch, SetStateAction } from "react";
type Criterion = { score: number; comment: string };
export function WorkGradeFields({
  rubric,
  criteria,
  setCriteria,
  setDirty,
}: {
  rubric: string;
  criteria: Criterion[];
  setCriteria: Dispatch<SetStateAction<Criterion[]>>;
  setDirty: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <>
      {" "}
      {JSON.parse(String(rubric)).map(
        (r: { label: string; weight: number }, i: number) => (
          <div key={i}>
            <label>
              {r.label} ({r.weight}%)
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={criteria[i]?.score ?? 0}
                onChange={(e) => {
                  setDirty(true);
                  setCriteria(
                    criteria.map((c, n) =>
                      n === i ? { ...c, score: Number(e.target.value) } : c,
                    ),
                  );
                }}
              />
            </label>
            <label>
              Komentar bukti untuk {r.label}
              <textarea
                value={criteria[i]?.comment ?? ""}
                onChange={(e) => {
                  setDirty(true);
                  setCriteria(
                    criteria.map((c, n) =>
                      n === i ? { ...c, comment: e.target.value } : c,
                    ),
                  );
                }}
              />
            </label>
          </div>
        ),
      )}
    </>
  );
}
