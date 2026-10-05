import { useEffect, useState } from "react";
import { readApi, writeApi } from "../request";
import { shortDateTime } from "../data";
import type { LearningPlan } from "../types";
export function StudentPlansView({
  goTo,
}: {
  goTo: (view: string, id?: string) => void;
}) {
  const [plans, setPlans] = useState<LearningPlan[] | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = () => {
    setError("");
    setPlans(null);
    readApi<{ plans: LearningPlan[] }>("/api/v1/learning-plans")
      .then((d) => setPlans(d.plans))
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    const c = new AbortController();
    readApi<{ plans: LearningPlan[] }>("/api/v1/learning-plans", c.signal)
      .then((d) => setPlans(d.plans))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => c.abort();
  }, []);
  return (
    <section className="section-block">
      <h1>Rencana dan kegiatan</h1>
      <p role="status">{notice}</p>
      {error ? (
        <>
          <p role="alert">{error}</p>
          <button className="primary" onClick={load}>
            Coba lagi
          </button>
        </>
      ) : !plans ? (
        <p role="status">Memuat rencana…</p>
      ) : !plans.length ? (
        <p>Belum ada rencana yang ditetapkan tutor.</p>
      ) : (
        <div className="task-grid">
          {plans.map((p) => (
            <article key={p.id} className="task-card">
              <div>
                <h2>{p.title}</h2>
                <p>
                  {p.mode === "tutorial"
                    ? "Tutorial"
                    : p.mode === "face_to_face"
                      ? "Tatap muka"
                      : "Mandiri"}{" "}
                  · {shortDateTime.format(new Date(p.due_at))}
                </p>
                <p>
                  {p.subject} · {p.learner_outcome}
                </p>
                <p>{p.instructions}</p>
                {p.help_request && (
                  <p>Permintaan bantuan tersimpan: {p.help_request}</p>
                )}
                <form
                  className="planning-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const f = new FormData(form);
                    setBusy(p.id);
                    setNotice("");
                    try {
                      await writeApi("/api/v1/learning-plans", "POST", {
                        action: "help",
                        planId: p.id,
                        reason: f.get("reason"),
                      });
                      setNotice("Permintaan bantuan tersimpan untuk tutor.");
                      load();
                    } catch (e) {
                      setNotice(
                        e instanceof Error
                          ? e.message
                          : "Gagal menyimpan permintaan.",
                      );
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  <label>
                    Bagian yang memerlukan bantuan
                    <textarea name="reason" required maxLength={2000} />
                  </label>
                  <button className="text-button" disabled={busy === p.id}>
                    {busy === p.id ? "Menyimpan…" : "Minta bantuan tutor"}
                  </button>
                </form>
                {p.material_id && (
                  <button
                    className="primary"
                    onClick={() => goTo("Materi", p.material_id!)}
                  >
                    Buka materi
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
