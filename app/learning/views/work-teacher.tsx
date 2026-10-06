import { useEffect, useState } from "react";
import { readApi, writeApi } from "../request";
import type { ModuleCatalog, TeacherSubmission } from "../types";
import type { WorkRow } from "../work-types";
import { WorkEditor } from "./work-editor";
import { WorkReview } from "./work-review";
type Catalog = ModuleCatalog & { assignments: WorkRow[] };
export function WorkTeacher({ initialId }: { initialId?: string | null }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [items, setItems] = useState<TeacherSubmission[]>([]),
    [selected, setSelected] = useState(initialId ?? ""),
    [notice, setNotice] = useState("Memuat tugas…"),
    [busy, setBusy] = useState(false);
  const reload = async () => {
    const [c, s] = await Promise.all([
      readApi<Catalog>("/api/v1/work"),
      readApi<TeacherSubmission[]>("/api/v1/teacher/submissions"),
    ]);
    setCatalog(c);
    setItems(s);
  };
  useEffect(() => {
    void Promise.all([
      readApi<Catalog>("/api/v1/work"),
      readApi<TeacherSubmission[]>("/api/v1/teacher/submissions"),
    ])
      .then(([c, s]) => {
        setCatalog(c);
        setItems(s);
        setNotice("Tugas dimuat dari server.");
      })
      .catch((e) => setNotice(e.message));
  }, []);
  const publish = async (id: string) => {
    setBusy(true);
    try {
      await writeApi(`/api/v1/work/${id}`, "POST");
      await reload();
      setNotice("Tugas diterbitkan. Rubrik dan KD terkunci.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const item = items.find((s) => s.id === selected),
    a = catalog?.assignments.find((a) => a.id === item?.assignment_id);
  return (
    <section className="work-teacher">
      <h1>Tugas autentik dan portofolio</h1>
      <p role="status">{notice}</p>
      {catalog ? (
        <>
          <WorkEditor catalog={catalog} reload={reload} />
          <details>
            <summary>Draf dan tugas terbit</summary>
            {catalog.assignments
              .filter((a) => a.rubric_json)
              .map((a) => (
                <article key={String(a.id)}>
                  <h2>{String(a.title)}</h2>
                  <p>{String(a.instructions)}</p>
                  <p>
                    {a.status === "draft" ? "Draf" : "Terbit"} ·{" "}
                    {String(a.planned_skk)} SKK terkait, belum diberikan
                  </p>
                  <ul>
                    {JSON.parse(String(a.rubric_json)).map(
                      (r: { label: string; weight: number }, i: number) => (
                        <li key={i}>
                          {r.label} {r.weight}%
                        </li>
                      ),
                    )}
                  </ul>
                  {a.status === "draft" && (
                    <button
                      disabled={busy}
                      onClick={() => void publish(String(a.id))}
                    >
                      Terbitkan {String(a.title)}
                    </button>
                  )}
                </article>
              ))}
          </details>
          <label>
            Pilih karya untuk ditinjau
            <select
              value={selected}
              onChange={(e) => {
                if (
                  window.dispatchEvent(
                    new Event("rt:navigate", { cancelable: true }),
                  )
                )
                  setSelected(e.target.value);
              }}
            >
              <option value="">Pilih warga belajar / tugas</option>
              {items
                .filter((s) =>
                  catalog.assignments.some(
                    (a) => a.id === s.assignment_id && a.rubric_json,
                  ),
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.student_name} · {s.assignment_title} ·{" "}
                    {s.status === "graded"
                      ? "Sudah dinilai"
                      : "Menunggu penilaian"}
                  </option>
                ))}
            </select>
          </label>
          {a && item && (
            <WorkReview
              key={selected}
              id={selected}
              assignment={a}
              onSaved={async (result) => {
                await reload();
                setNotice(
                  result.submission?.status === "draft"
                    ? "Revisi diminta. Warga belajar dapat memperbaiki karya; histori tetap tersimpan."
                    : "Penilaian rubrik tersimpan.",
                );
                if (result.submission?.status === "draft") setSelected("");
              }}
            />
          )}
        </>
      ) : (
        <button
          onClick={() => void reload().catch((e) => setNotice(e.message))}
        >
          Coba muat ulang
        </button>
      )}
    </section>
  );
}
