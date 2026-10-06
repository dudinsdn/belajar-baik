import { useEffect, useRef, useState } from "react";
import type {
  readMentoringDashboard,
  readMentoringDetail,
} from "../../../server/data/mentoring";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { readApi, writeApi } from "../request";
import { shortDateTime } from "../data";
type Dashboard = Awaited<ReturnType<typeof readMentoringDashboard>>;
type Detail = Awaited<ReturnType<typeof readMentoringDetail>>;
const kinds: Record<string, string> = {
  note: "Catatan pendampingan",
  remedial: "Rencana remedial",
  enrichment: "Pengayaan",
  reminder: "Pesan atau pengingat",
  resolve: "Hasil tindak lanjut",
  attendance: "Kehadiran",
};
const modes: Record<string, string> = {
  independent: "Mandiri",
  tutorial: "Tutorial",
  face_to_face: "Tatap muka",
};
const states: Record<string, string> = {
  not_started: "Belum mulai",
  draft: "Draf",
  submitted: "Menunggu penilaian",
  graded: "Sudah dinilai",
  active: "Sedang dikerjakan",
  completed: "Selesai",
};
const time = (value: unknown) =>
  value && Number.isFinite(Date.parse(String(value)))
    ? shortDateTime.format(new Date(String(value)))
    : "Belum tercatat";

export function MentoringView({
  goTo,
}: {
  goTo: (destination: string, resourceId?: string) => void;
}) {
  const [data, setData] = useState<Dashboard | null>(null),
    [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false);
  const [subject, setSubject] = useState(""),
    [filter, setFilter] = useState("priority"),
    [kind, setKind] = useState("note");
  const [draft, setDraft] = useState("");
  useUnsavedChanges(!!draft.trim() || busy);
  const sequence = useRef(0),
    heading = useRef<HTMLHeadingElement>(null);
  const load = async () => {
    setError("");
    setLoading(true);
    try {
      setData(await readApi<Dashboard>("/api/v1/teacher/mentoring"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    readApi<Dashboard>("/api/v1/teacher/mentoring", controller.signal)
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => {
      controller.abort();
      sequence.current++;
    };
  }, []);
  const open = async (cs: string, student: string) => {
    const ticket = ++sequence.current;
    setError("");
    setNotice("");
    setLoading(true);
    setDetail(null);
    try {
      const d = await readApi<Detail>(
        `/api/v1/teacher/mentoring?subject=${encodeURIComponent(cs)}&student=${encodeURIComponent(student)}`,
      );
      if (ticket === sequence.current) {
        setDetail(d);
        setKind("note");
        requestAnimationFrame(() => heading.current?.focus());
      }
    } catch (e) {
      if (ticket === sequence.current)
        setError(e instanceof Error ? e.message : "Gagal memuat.");
    } finally {
      if (ticket === sequence.current) setLoading(false);
    }
  };
  if (!data)
    return (
      <section className="empty-state">
        <h1>Pendampingan warga belajar</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button className="primary" onClick={load}>
              Coba lagi
            </button>
          </>
        ) : (
          <p role="status">Memuat prioritas pendampingan…</p>
        )}
      </section>
    );
  const subjects = [
    ...new Map(
      data.students.map((s) => [
        s.class_subject_id,
        `${s.class_name} · ${s.subject}`,
      ]),
    ).entries(),
  ];
  const rows = data.students.filter(
    (s) =>
      (!subject || s.class_subject_id === subject) &&
      (filter === "all" ||
        (filter === "priority" ? s.priority > 0 : s.labels.includes(filter))),
  );
  return (
    <section className="section-block mentoring-view">
      <h1 ref={heading} tabIndex={-1}>
        {detail
          ? `Pendampingan: ${detail.scope.display_name}`
          : "Pendampingan warga belajar"}
      </h1>
      <p>
        Prioritaskan bantuan berdasarkan proses belajar yang tercatat. Tidak
        aktif berarti tidak ada aktivitas belajar tercatat selama 7 hari;
        indikator ini bukan keputusan ketuntasan.
      </p>
      <p role="status">
        {notice}
        {loading ? " Memuat data…" : ""}
      </p>
      {error && <p role="alert">{error}</p>}
      {detail ? (
        <>
          <button
            disabled={busy}
            onClick={async () => {
              if (
                draft.trim() &&
                !window.confirm("Perubahan belum disimpan. Tinggalkan detail?")
              )
                return;
              setDraft("");
              sequence.current++;
              setDetail(null);
              setNotice("");
              await load();
            }}
          >
            Kembali ke prioritas
          </button>
          <p>
            {detail.scope.class_name} · {detail.scope.subject}
          </p>
          <section className="personal-plan-section">
            <h2>Tindak lanjut tutor</h2>
            <p>
              Remedial, pengayaan, dan pengingat tampil pada beranda warga
              belajar. Catatan dan hasil tindak lanjut tersimpan untuk tutor.
            </p>
            <form
              className="planning-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const body = Object.fromEntries(new FormData(form));
                setBusy(true);
                setError("");
                setNotice("");
                try {
                  if (body.dueAt)
                    body.dueAt = new Date(String(body.dueAt)).toISOString();
                  setDetail(
                    await writeApi<Detail>(
                      "/api/v1/teacher/mentoring",
                      "POST",
                      {
                        ...body,
                        classSubjectId: detail.scope.id,
                        studentId: detail.scope.student_id,
                      },
                    ),
                  );
                  form.reset();
                  setDraft("");
                  setNotice(
                    "Tindak lanjut tersimpan beserta waktu dan pelakunya.",
                  );
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
                  name="kind"
                  value={kind}
                  disabled={busy}
                  onChange={(e) => {
                    if (
                      !draft.trim() ||
                      window.confirm(
                        "Ganti tindakan dan kosongkan catatan yang belum disimpan?",
                      )
                    ) {
                      setKind(e.target.value);
                      setDraft("");
                    }
                  }}
                >
                  {Object.entries(kinds).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {["remedial", "enrichment", "reminder"].includes(kind) && (
                <label>
                  Tenggat tindak lanjut
                  <input
                    type="datetime-local"
                    name="dueAt"
                    required
                    disabled={busy}
                  />
                </label>
              )}
              {kind === "resolve" && (
                <label>
                  Tindak lanjut yang ditutup
                  <select name="parentId" required disabled={busy}>
                    <option value="">Pilih tindak lanjut</option>
                    {detail.interventions
                      .filter(
                        (e) =>
                          ["remedial", "enrichment", "reminder"].includes(
                            e.kind,
                          ) && !e.resolved,
                      )
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {kinds[e.kind]} · {e.detail.slice(0, 80)}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {kind === "attendance" && (
                <>
                  <label>
                    Kegiatan
                    <select required name="planId" disabled={busy}>
                      <option value="">Pilih kegiatan</option>
                      {detail.plans
                        .filter((p) => p.mode !== "independent")
                        .map((p) => (
                          <option key={String(p.id)} value={String(p.id)}>
                            {String(p.title)} · {time(p.due_at)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Kehadiran
                    <select name="status" disabled={busy}>
                      <option value="present">Hadir</option>
                      <option value="absent">Tidak hadir</option>
                      <option value="excused">Izin</option>
                    </select>
                  </label>
                </>
              )}
              <label>
                {kind === "attendance"
                  ? "Bukti atau alasan kehadiran"
                  : kind === "resolve"
                    ? "Hasil dan alasan penutupan"
                    : "Arahan atau alasan"}
                <textarea
                  name="detail"
                  required
                  maxLength={2000}
                  disabled={busy}
                  key={kind}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              </label>
              <button className="primary" disabled={busy}>
                {busy ? "Menyimpan…" : "Simpan tindak lanjut"}
              </button>
            </form>
            <button
              onClick={() =>
                goTo("Rencana", `${detail.scope.id}/${detail.scope.student_id}`)
              }
            >
              Sesuaikan tenggat atau tetapkan ulang rencana
            </button>
          </section>
          <h2>Progres modul dan aktivitas mandiri</h2>
          <div className="task-grid">
            {detail.materials.map((m) => (
              <article className="task-card" key={m.id}>
                <div>
                  <h3>{m.title}</h3>
                  <p>
                    {m.percent}% bagian selesai · Terakhir: {time(m.updated_at)}
                  </p>
                </div>
              </article>
            ))}
          </div>
          {!detail.materials.length && (
            <p>Belum ada modul terbit yang tersedia.</p>
          )}
          <h2>Rencana dan kehadiran</h2>
          {detail.plans.map((p) => {
            const a = detail.attendance.find((a) => a.plan_id === p.id);
            return (
              <article className="personal-plan-section" key={String(p.id)}>
                <h3>{String(p.title)}</h3>
                <p>
                  {modes[String(p.mode)]} · {time(p.due_at)}
                </p>
                <p>{String(p.instructions)}</p>
                {p.help_request ? (
                  <p>Permintaan bantuan: {String(p.help_request)}</p>
                ) : null}
                {p.mode !== "independent" && (
                  <p>
                    Kehadiran:{" "}
                    {a
                      ? `${({ present: "Hadir", absent: "Tidak hadir", excused: "Izin" } as Record<string, string>)[a.status]} · ${a.reason}`
                      : "Belum dicatat"}
                  </p>
                )}
              </article>
            );
          })}
          {!detail.plans.length && <p>Belum ada rencana belajar.</p>}
          <h2>Tugas, revisi, dan umpan balik</h2>
          <div className="task-grid">
            {detail.assignments.map((a) => (
              <article className="task-card" key={a.id}>
                <div>
                  <h3>{a.title}</h3>
                  <p>
                    {states[a.status]}
                    {a.revision_requested ? " · Perlu revisi" : ""} · Tenggat{" "}
                    {time(a.due_at)}
                  </p>
                  <p>Nilai: {a.score ?? "Belum dinilai"}</p>
                  {a.feedback && (
                    <>
                      <p>{a.feedback}</p>
                      <p>
                        {a.acknowledged
                          ? "Umpan balik sudah dikonfirmasi"
                          : "Umpan balik belum dikonfirmasi"}
                      </p>
                    </>
                  )}
                  {a.submission_id && (
                    <button onClick={() => goTo("Penilaian", a.submission_id!)}>
                      Buka bukti dan penilaian
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!detail.assignments.length && <p>Belum ada tugas tersedia.</p>}
          <h2>Percobaan asesmen</h2>
          {detail.attempts.map((a) => (
            <article key={a.id} className="personal-plan-section">
              <h3>
                {a.title} ·{" "}
                {a.purpose === "diagnostic" ? "Diagnostik" : "Formatif"}
              </h3>
              <p>
                {states[a.status]} · {time(a.started_at)} · Nilai{" "}
                {a.score ?? "Belum final"} · Ambang {a.passing_score}
              </p>
              {a.status === "completed" && a.score !== null && (
                <p>
                  {a.score < a.passing_score
                    ? "Di bawah ambang asesmen; tinjau kebutuhan remedial."
                    : "Memenuhi ambang asesmen; tinjau kebutuhan pengayaan."}
                </p>
              )}
              <button onClick={() => goTo("Latihan")}>
                Tinjau asesmen dan indikator KD
              </button>
            </article>
          ))}
          {!detail.attempts.length && <p>Belum ada percobaan asesmen.</p>}
          <h2>Kompetensi dan SKK</h2>
          <p>
            {detail.skk.planned} SKK terencana untuk mata pelajaran ini. Status
            ditempuh, tervalidasi, kurang, penguasaan KD, dan nilai sumatif
            belum tersedia. Nilai formatif, progres, dan kehadiran tidak menjadi
            keputusan ketuntasan.
          </p>
          <h2>Histori pendampingan</h2>
          {detail.interventions.map((e) => (
            <article key={e.id} className="personal-plan-section">
              <h3>
                {kinds[e.kind]}
                {e.resolved ? " · Ditutup" : ""}
              </h3>
              <p>{e.detail}</p>
              <p>
                {time(e.created_at)} · {e.actor_name}
                {e.due_at ? ` · Tenggat ${time(e.due_at)}` : ""}
              </p>
            </article>
          ))}
          {!detail.interventions.length && <p>Belum ada catatan intervensi.</p>}
          {detail.attendance.length > 0 && (
            <>
              <h3>Histori kehadiran</h3>
              {detail.attendance.map((a) => (
                <p key={a.id}>
                  {time(a.created_at)} · {a.actor_name} · {a.status} ·{" "}
                  {a.reason}
                </p>
              ))}
            </>
          )}
          {detail.planChanges.length > 0 && (
            <>
              <h3>Histori penetapan ulang rencana</h3>
              {detail.planChanges.map((e) => (
                <article key={e.id} className="personal-plan-section">
                  <p>
                    {time(e.created_at)} · {e.actor_name}
                  </p>
                  <p>
                    Judul: {e.previous_title} → {e.title}
                  </p>
                  <p>
                    Tenggat: {time(e.previous_due_at)} → {time(e.due_at)}
                  </p>
                  <p>{e.instructions}</p>
                </article>
              ))}
            </>
          )}
          {detail.support.length > 0 && (
            <>
              <h3>Catatan kebutuhan pendampingan sebelumnya</h3>
              {detail.support.map((s, i) => (
                <p key={i}>
                  {String(s.reason)} · {String(s.actor_name)} ·{" "}
                  {time(s.created_at)}
                </p>
              ))}
            </>
          )}
          {detail.deadlines.length > 0 && (
            <>
              <h3>Histori penyesuaian tenggat</h3>
              {detail.deadlines.map((d, i) => (
                <p key={i}>
                  {String(d.title)} · {time(d.due_at)} · {String(d.reason)} ·{" "}
                  {String(d.actor_name)}
                </p>
              ))}
            </>
          )}
        </>
      ) : (
        <>
          <div className="planning-form">
            <label>
              Kelas dan mata pelajaran
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">Semua penugasan</option>
                {subjects.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status proses
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="priority">Perlu perhatian</option>
                <option value="all">Semua warga belajar</option>
                {[
                  "Belum mulai",
                  "Sedang belajar",
                  "Tidak aktif ≥7 hari",
                  "Terlambat",
                  "Menunggu penilaian",
                  "Perlu revisi",
                  "Perlu remedial",
                  "Tindak lanjut terbuka",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button disabled={loading} onClick={load}>
              Muat ulang data
            </button>
          </div>
          <p>
            {rows.length} warga belajar pada penugasan yang sesuai filter ·
            diperbarui {time(data.generatedAt)}
          </p>
          <div className="task-grid">
            {rows.map((s) => (
              <article
                className="task-card"
                key={`${s.class_subject_id}/${s.student_id}`}
              >
                <div>
                  <h2>{s.display_name}</h2>
                  <p>
                    {s.class_name} · {s.subject}
                  </p>
                  <p>{s.labels.join(" · ")}</p>
                  <p>Terakhir belajar: {time(s.lastActivity)}</p>
                  <p>
                    {s.overdue} terlambat · {s.waiting} menunggu penilaian ·{" "}
                    {s.remedial} asesmen di bawah ambang · {s.openInterventions}{" "}
                    tindak lanjut terbuka
                  </p>
                  <button
                    className="primary"
                    disabled={loading}
                    onClick={() => open(s.class_subject_id, s.student_id)}
                  >
                    Buka pendampingan
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!rows.length && (
            <p>
              Tidak ada warga belajar yang sesuai filter. Pilih semua warga
              belajar atau penugasan lain.
            </p>
          )}
          <p>
            Ketuntasan KD dan SKK menunggu validasi belum dapat ditampilkan
            sampai buku besar kompetensi tersedia.
          </p>
        </>
      )}
    </section>
  );
}
