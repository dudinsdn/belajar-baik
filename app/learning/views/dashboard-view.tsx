import { useEffect, useState } from "react";
import { shortDateTime } from "../data";
import { readApi, writeApi } from "../request";
import type { DashboardData } from "../types";

type Props = {
  displayName: string;
  dashboard: DashboardData | null;
  goTo: (destination: string, resourceId?: string) => void;
};
export function DashboardView({ displayName, goTo }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const load = () => {
    setError("");
    setData(null);
    readApi<DashboardData>("/api/v1/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    let cancelled = false;
    readApi<DashboardData>("/api/v1/dashboard")
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!data)
    return (
      <section className="empty-state">
        <h1>Rencana belajarmu</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button className="primary" onClick={load}>
              Coba lagi
            </button>
          </>
        ) : (
          <p role="status">Memuat langkah belajar…</p>
        )}
      </section>
    );
  const current = data.continueMaterial;
  const next = data.nextPlan;
  const modes: Record<string, string> = {
    independent: "Mandiri",
    tutorial: "Tutorial",
    face_to_face: "Tatap muka",
  };
  return (
    <>
      <section className="welcome">
        <div>
          <p className="eyebrow">RENCANA BELAJARMU</p>
          <h1>Selamat belajar, {displayName.split(" ")[0]}!</h1>
          <p>
            Pilih langkah berikutnya dan lanjutkan dari progres yang tersimpan.
          </p>
        </div>
      </section>
      {next ? (
        <section className="continue-card">
          <div className="continue-copy">
            <p className="eyebrow">LANGKAH BERIKUTNYA · {modes[next.mode]}</p>
            <h2>{next.title}</h2>
            <p>Setelah belajar ini, saya mampu: {next.learner_outcome}</p>
            <p>
              {shortDateTime.format(new Date(next.due_at))} · {next.subject}
            </p>
            <p>{next.instructions}</p>
          </div>
          <button
            className="primary"
            onClick={() =>
              goTo(
                next.material_id ? "Materi" : "Rencana",
                next.material_id ?? undefined,
              )
            }
          >
            {next.material_id ? "Buka materi" : "Lihat kegiatan"}
          </button>
        </section>
      ) : (
        <section className="empty-state">
          <h2>Belum ada rencana berikutnya</h2>
          <p>Rencana yang ditetapkan tutor akan tampil di sini.</p>
          <button className="primary" onClick={() => goTo("Kurikulum")}>
            Lihat target kompetensi
          </button>
        </section>
      )}
      {current && (
        <section className="continue-card">
          <div className="continue-copy">
            <p className="eyebrow">
              {current.percent > 0 ? "LANJUTKAN" : "MULAI"} BELAJAR
            </p>
            <h2>{current.title}</h2>
            <p>
              {current.subject}
              {current.last_position ? ` · ${current.last_position}` : ""}
            </p>
            <p>Progres materi {current.percent}%</p>
          </div>
          <button
            className="primary"
            onClick={() => goTo("Materi", current.id)}
          >
            {current.percent > 0 ? "Lanjutkan materi" : "Pelajari materi"}
          </button>
        </section>
      )}
      <section className="section-block personal-plan-section">
        <h2>SKK dan target kompetensi</h2>
        <p>
          <strong>{data.skk.planned} SKK terencana</strong> dari kurikulum yang
          ditetapkan.
        </p>
        <p>
          SKK sedang ditempuh, menunggu validasi, dan tercapai belum tersedia.
          Progres materi tidak otomatis menjadi pencapaian SKK.
        </p>
        <button className="text-button" onClick={() => goTo("Kurikulum")}>
          Lihat kurikulum
        </button>
      </section>
      <section className="section-block personal-plan-section">
        <h2>Tugas yang perlu diselesaikan</h2>
        <div className="task-grid">
          {data.assignments.map((t) => (
            <article className="task-card" key={t.id}>
              <div>
                <h3>{t.title}</h3>
                <p>
                  {t.subject} · {shortDateTime.format(new Date(t.due_at))}
                </p>
                <p>
                  {t.submission_status === "draft"
                    ? "Draf tersimpan"
                    : "Belum mulai"}
                </p>
              </div>
              <button onClick={() => goTo("Tugas", t.id)}>
                Kerjakan tugas
              </button>
            </article>
          ))}
        </div>
        {!data.assignments.length && <p>Tidak ada tugas yang perlu dikirim.</p>}
      </section>
      {data.assessment && (
        <section className="section-block personal-plan-section">
          <h2>Asesmen tersedia</h2>
          <p>{data.assessment.title}</p>
          <button className="primary" onClick={() => goTo("Latihan")}>
            Buka latihan
          </button>
        </section>
      )}
      <section className="section-block personal-plan-section">
        <h2>Umpan balik tutor</h2>
        <p>
          Konfirmasi setelah membaca dan menentukan tindak lanjut. Konfirmasi
          ini tidak mengubah nilai atau ketuntasan.
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="task-grid">
          {data.feedback.map((f) => (
            <article className="task-card" key={f.id}>
              <div>
                <h3>{f.title}</h3>
                <p>{f.feedback}</p>
                <button className="text-button" onClick={() => goTo("Tugas")}>
                  Lihat pekerjaan dan pelajari kembali
                </button>
              </div>
              <button
                disabled={saving === f.id}
                onClick={async () => {
                  setSaving(f.id);
                  setError("");
                  try {
                    await writeApi("/api/v1/learning-plans", "POST", {
                      action: "acknowledge",
                      submissionId: f.id,
                    });
                    setData(await readApi<DashboardData>("/api/v1/dashboard"));
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Gagal menyimpan.",
                    );
                  } finally {
                    setSaving(null);
                  }
                }}
              >
                {saving === f.id ? "Menyimpan…" : "Sudah saya baca"}
              </button>
            </article>
          ))}
        </div>
        {!data.feedback.length && (
          <p>Tidak ada umpan balik yang belum dibaca.</p>
        )}
      </section>
    </>
  );
}
