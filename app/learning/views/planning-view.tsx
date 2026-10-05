import { useEffect, useState } from "react";
import { readApi, writeApi } from "../request";
import type { PlanningData } from "../types";
import { shortDateTime } from "../data";

export function PlanningView() {
  const [data, setData] = useState<PlanningData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [subject, setSubject] = useState("");
  const [student, setStudent] = useState("");
  const [action, setAction] = useState("create");
  const [mode, setMode] = useState("independent");
  const load = () => {
    setError("");
    setData(null);
    readApi<PlanningData>("/api/v1/learning-plans")
      .then(setData)
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    let cancelled = false;
    readApi<PlanningData>("/api/v1/learning-plans")
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
  if (error && !data)
    return (
      <section className="empty-state">
        <h1>Rencana belajar</h1>
        <p role="alert">{error}</p>
        <button className="primary" onClick={load}>
          Coba lagi
        </button>
      </section>
    );
  if (!data) return <p role="status">Memuat rencana belajar…</p>;
  return (
    <section className="section-block">
      <h1>Rencana belajar</h1>
      <p>
        Tetapkan langkah belajar dan pendampingan sesuai kompetensi warga
        belajar.
      </p>
      <form
        className="planning-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          setBusy(true);
          setError("");
          setNotice("");
          try {
            const body = Object.fromEntries(f.entries());
            if (body.dueAt)
              body.dueAt = new Date(String(body.dueAt)).toISOString();
            const updated = await writeApi<PlanningData>(
              "/api/v1/learning-plans",
              "POST",
              body,
            );
            setData(updated);
            setNotice("Perubahan tersimpan beserta riwayatnya.");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Gagal menyimpan.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Tindakan
          <select
            name="action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="create">Tetapkan rencana</option>
            <option value="deadline">Sesuaikan tenggat tugas</option>
            <option value="support">Catat kebutuhan pendampingan</option>
          </select>
        </label>
        <label>
          Kelas dan mata pelajaran
          <select
            required
            name="classSubjectId"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setStudent("");
            }}
          >
            <option value="">Pilih penugasan</option>
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.class_name} · {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Penerima
          <select
            name="studentId"
            required={action !== "create"}
            value={student}
            onChange={(e) => setStudent(e.target.value)}
          >
            <option value="">
              {action === "create"
                ? "Seluruh anggota aktif kelas"
                : "Pilih warga belajar"}
            </option>
            {data.students
              .filter((s) => s.class_subject_id === subject)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name}
                </option>
              ))}
          </select>
        </label>
        {action === "create" && (
          <>
            <label>
              Judul rencana
              <input required name="title" maxLength={200} />
            </label>
            <label>
              Target kompetensi
              <select required name="competencyId" key={subject}>
                <option value="">Pilih kompetensi</option>
                {data.competencies
                  .filter((k) => k.class_subject_id === subject)
                  .map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.version_code} · {k.package_code} · KD {k.code}:{" "}
                      {k.learner_outcome}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Mode belajar
              <select
                name="mode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="independent">Mandiri</option>
                <option value="tutorial">Tutorial</option>
                <option value="face_to_face">Tatap muka</option>
              </select>
            </label>
            <label>
              Materi{mode !== "independent" ? " (opsional)" : ""}
              <select
                name="materialId"
                required={mode === "independent"}
                key={subject}
              >
                <option value="">Pilih materi</option>
                {data.materials
                  .filter((m) => m.class_subject_id === subject)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Instruksi atau lokasi kegiatan
              <textarea required name="instructions" maxLength={2000} />
            </label>
          </>
        )}
        {action === "deadline" && (
          <label>
            Tugas
            <select required name="assignmentId" key={subject}>
              <option value="">Pilih tugas</option>
              {data.assignments
                .filter((a) => a.class_subject_id === subject)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
            </select>
          </label>
        )}
        {action !== "support" && (
          <label>
            {action === "create" && mode !== "independent"
              ? "Waktu kegiatan"
              : "Tenggat"}
            <input required type="datetime-local" name="dueAt" />
          </label>
        )}
        {action !== "create" && (
          <label>
            Alasan atau arahan pendampingan
            <textarea required name="reason" maxLength={2000} />
          </label>
        )}
        <button disabled={busy} className="primary">
          {busy ? "Menyimpan…" : "Simpan"}
        </button>
      </form>
      <p role="status">{notice}</p>
      {error && <p role="alert">{error}</p>}
      <h2>Warga belajar pada penugasan</h2>
      <p>
        Terakhir membaca materi dan keterlambatan rencana mandiri membantu
        menentukan tindak lanjut; keduanya bukan bukti ketuntasan.
      </p>
      <div className="task-grid">
        {data.students
          .filter((s) => !subject || s.class_subject_id === subject)
          .map((s) => (
            <article
              className="task-card"
              key={`${s.class_subject_id}/${s.id}`}
            >
              <div>
                <h3>{s.display_name}</h3>
                <p>
                  {s.last_activity
                    ? `${s.inactive ? "Tidak ada aktivitas materi selama 7 hari atau lebih. Terakhir" : "Terakhir belajar"}: ${shortDateTime.format(new Date(s.last_activity))}`
                    : "Belum ada aktivitas materi tercatat"}
                </p>
                <p>{s.overdue} rencana mandiri melewati tenggat</p>
                {s.reason && <p>Pendampingan: {s.reason}</p>}
              </div>
            </article>
          ))}
      </div>
      <h2>Rencana tersimpan</h2>
      <div className="task-grid">
        {data.plans.map((p) => (
          <article className="task-card" key={p.id}>
            <div>
              <h3>{p.title}</h3>
              <p>
                {p.student_name} · {p.subject}
              </p>
              <p>{p.learner_outcome}</p>
              <p>{shortDateTime.format(new Date(p.due_at))}</p>
              <p>{p.instructions}</p>
              {p.help_request && <p>Permintaan bantuan: {p.help_request}</p>}
            </div>
          </article>
        ))}
      </div>
      {!data.plans.length && <p>Belum ada rencana yang ditetapkan.</p>}
    </section>
  );
}
