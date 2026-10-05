import type { Dispatch, SetStateAction } from "react";
type Rubric = Array<{ label: string; weight: number }>;
export function WorkRubricFields({
  rubric,
  setRubric,
}: {
  rubric: Rubric;
  setRubric: Dispatch<SetStateAction<Rubric>>;
}) {
  return (
    <fieldset>
      <legend>Rubrik (jumlah bobot 100%)</legend>
      {rubric.map((r, i) => (
        <div key={i}>
          <label>
            Kriteria {i + 1}
            <input
              value={r.label}
              onChange={(e) =>
                setRubric(
                  rubric.map((x, n) =>
                    n === i ? { ...x, label: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <label>
            Bobot {i + 1} (%)
            <input
              type="number"
              min="1"
              max="100"
              value={r.weight}
              onChange={(e) =>
                setRubric(
                  rubric.map((x, n) =>
                    n === i ? { ...x, weight: Number(e.target.value) } : x,
                  ),
                )
              }
            />
          </label>
        </div>
      ))}
    </fieldset>
  );
}
