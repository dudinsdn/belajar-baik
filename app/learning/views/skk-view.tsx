"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { readSkk } from "../../../server/data/skk";
import { readApi, writeApi } from "../request";
import { shortDateTime } from "../data";
const modes: Record<string, string> = {
  face_to_face: "Tatap muka",
  tutorial_sync: "Tutorial sinkron",
  tutorial_async: "Tutorial asinkron",
  independent: "Mandiri",
};
function time(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? shortDateTime.format(new Date(value))
    : "belum dicatat";
}

type Data = Awaited<ReturnType<typeof readSkk>>;
type Allocation = Data["allocations"][number];
const labels: Record<string, string> = {
  planned: "Direncanakan",
  underway: "Sedang ditempuh",
  incomplete: "Bukti belum lengkap",
  pending: "Menunggu validasi",
  awarded: "Tercapai",
  recognized: "Diakui melalui alih kredit",
  revoked: "Dicabut",
  rejected: "Perlu perbaikan",
  mastered: "Tuntas",
  needs_revision: "Perlu perbaikan",
};
export function SkkView({ teacher }: { teacher: boolean }) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setError("");
    try {
      setData(await readApi<Data>("/api/v1/skk"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Data gagal dimuat.");
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    readApi<Data>("/api/v1/skk", controller.signal)
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);
  async function save(body: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setData(await writeApi<Data>("/api/v1/skk", "POST", body));
      setNotice("Keputusan tersimpan beserta alasan dan histori.");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Keputusan gagal disimpan.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="curriculum-view skk-view">
      <h1>Buku besar SKK</h1>
      <p>
        Ketuntasan kompetensi dan SKK memerlukan bukti serta validasi tutor.
      </p>
      <div role="status">{notice}</div>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button onClick={load} disabled={busy}>
            Muat ulang data
          </button>
        </div>
      )}
      {!data && !error && <p role="status">Memuat buku besar…</p>}
      {data && (
        <>
          <p>
            <strong>{data.totals.earned} SKK tercapai</strong> dari{" "}
            {data.totals.planned} terencana · {data.totals.remaining} belum
            tercapai
          </p>
          <details>
            <summary>
              Rekap warga belajar, mata pelajaran, dan paket kompetensi
            </summary>
            {[
              ["Warga belajar", data.byStudent],
              ["Mata pelajaran", data.bySubject],
              ["Paket kompetensi", data.byPackage],
            ].map(([title, rows]) => (
              <section key={String(title)}>
                <h2>{String(title)}</h2>
                <ul>
                  {(rows as Data["byStudent"]).map((r) => (
                    <li key={r.id}>
                      {r.label}: {r.earned}/{r.planned} SKK · {r.remaining}{" "}
                      belum tercapai
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </details>
          {!data.allocations.length && (
            <p>Belum ada alokasi kurikulum yang dapat diakses.</p>
          )}
          {data.allocations.map((a) => (
            <AllocationCard
              key={`${a.id}/${a.allocation_id}`}
              allocation={a}
              teacher={teacher}
              busy={busy}
              save={save}
            />
          ))}
        </>
      )}
    </section>
  );
}
function AllocationCard({
  allocation: a,
  teacher,
  busy,
  save,
}: {
  allocation: Allocation;
  teacher: boolean;
  busy: boolean;
  save: (body: unknown) => Promise<boolean>;
}) {
  const [selectedKd, setSelectedKd] = useState(
    String(a.competencies[0]?.id ?? ""),
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form),
      action = f.get("action");
    const competency = a.competencies.find(
      (c) => c.id === f.get("competencyId"),
    );
    const evidence = a.evidence.find(
      (v) => `${v.kind}:${v.id}` === f.get("evidence"),
    );
    const ok = await save({
      assignmentId: a.id,
      allocationId: a.allocation_id,
      action,
      status: f.get("status"),
      reason: f.get("reason"),
      revision:
        action === "mastery" ? Number(competency?.revision ?? 0) : a.revision,
      competencyId: competency?.id,
      evidenceKind: evidence?.kind,
      evidenceId: evidence?.id,
      observation: f.get("observation"),
      durationMinutes: Number(f.get("durationMinutes")),
      learningMode: f.get("learningMode"),
    });
    if (ok) form.reset();
  }
  return (
    <article className="skk-card">
      <h2>
        {a.student_name} · {a.subject} · {a.package_code}
      </h2>
      <p>
        {labels[a.ledgerStatus]} · {a.earned}/{a.planned_skk} SKK
      </p>
      <ul>
        {a.competencies.map((c) => (
          <li key={String(c.id)}>
            <strong>{c.code}</strong> — {c.learner_outcome}:{" "}
            {labels[String(c.status)] ?? "Belum divalidasi"}
            {c.reason && (
              <p>
                {c.reason} · {time(c.created_at)}
              </p>
            )}
          </li>
        ))}
      </ul>
      <details>
        <summary>Kegiatan belajar terkait</summary>
        {!a.activities.length ? (
          <p>Belum ada kegiatan dalam rencana belajar.</p>
        ) : (
          <ul>
            {a.activities.map((activity) => (
              <li key={String(activity.id)}>
                {activity.title} ·{" "}
                {{
                  face_to_face: "Tatap muka",
                  tutorial: "Tutorial",
                  independent: "Mandiri",
                }[String(activity.mode)] ?? activity.mode}{" "}
                · progres materi {Number(activity.percent ?? 0)}%
                {activity.attendance
                  ? ` · kehadiran ${activity.attendance}`
                  : ""}
              </li>
            ))}
          </ul>
        )}
        <p>Kehadiran dan progres tidak otomatis menghasilkan SKK.</p>
      </details>
      {teacher && a.status === "active" && (
        <>
          <form onSubmit={submit}>
            <h3>Validasi kompetensi</h3>
            <input type="hidden" name="action" value="mastery" />
            <label>
              KD
              <select
                name="competencyId"
                value={selectedKd}
                onChange={(e) => setSelectedKd(e.target.value)}
                required
              >
                {a.competencies.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.code} — {c.learner_outcome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Bukti yang telah dinilai
              <select key={selectedKd} name="evidence" required>
                <option value="">Pilih bukti yang terkait KD</option>
                {a.evidence
                  .filter((v) => v.competency_id === selectedKd)
                  .map((v) => (
                    <option
                      key={`${v.kind}:${v.id}:${v.competency_id}`}
                      value={`${v.kind}:${v.id}`}
                    >
                      {v.title} · nilai {v.score} ·{" "}
                      {v.kind === "quiz"
                        ? "Asesmen"
                        : v.kind === "activity"
                          ? "Kegiatan"
                          : "Karya"}
                      {v.prior_learning === 1 ? " · pengalaman terdahulu" : ""}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Keputusan
              <select name="status">
                <option value="mastered">Tuntas</option>
                <option value="needs_revision">Perlu perbaikan</option>
              </select>
            </label>
            <label>
              Alasan
              <textarea name="reason" required maxLength={2000} />
            </label>
            <details>
              <summary>
                Bukti pengamatan kegiatan (untuk tatap muka, tutorial, atau
                mandiri)
              </summary>
              <p>
                Durasi dan kehadiran harus dilengkapi hasil pengamatan
                kompetensi oleh tutor.
              </p>
              <label>
                Hasil pengamatan kompetensi
                <textarea name="observation" maxLength={2000} />
              </label>
              <label>
                Durasi kegiatan (menit)
                <input
                  name="durationMinutes"
                  type="number"
                  min="1"
                  max="1440"
                />
              </label>
              <label>
                Mode kegiatan
                <select name="learningMode">
                  <option value="face_to_face">Tatap muka</option>
                  <option value="tutorial_sync">Tutorial sinkron</option>
                  <option value="tutorial_async">Tutorial asinkron</option>
                  <option value="independent">Mandiri</option>
                </select>
              </label>
            </details>
            <button disabled={busy || a.earned > 0}>Simpan validasi KD</button>
          </form>
          <form onSubmit={submit}>
            <h3>Keputusan SKK</h3>
            <p>
              Alokasi penuh diberikan setelah semua KD tuntas. Koreksi KD
              memerlukan pencabutan SKK terlebih dahulu.
            </p>
            <input type="hidden" name="action" value="credit" />
            <label>
              Keputusan
              <select name="status">
                <option value="awarded">Berikan SKK</option>
                <option value="recognized">Akui melalui alih kredit</option>
                <option value="rejected">Perlu perbaikan</option>
                <option value="revoked">Cabut SKK</option>
              </select>
            </label>
            <label>
              Alasan
              <textarea name="reason" required maxLength={2000} />
            </label>
            <button disabled={busy}>Simpan keputusan SKK</button>
          </form>
        </>
      )}
      <details>
        <summary>Histori keputusan dan bukti</summary>
        {[...a.history, ...a.masteryHistory].length === 0 ? (
          <p>Belum ada keputusan.</p>
        ) : (
          <ul>
            {[...a.history, ...a.masteryHistory].map((h) => (
              <li key={String(h.id)}>
                {labels[String(h.status)]} · {h.reason} · {time(h.created_at)} ·
                pelaku {h.actor_name ?? h.actor_id}
                <details>
                  <summary>Snapshot bukti saat keputusan</summary>
                  <DecisionEvidence snapshot={String(h.snapshot_json)} />
                </details>
              </li>
            ))}
          </ul>
        )}
      </details>
    </article>
  );
}

function DecisionEvidence({ snapshot }: { snapshot: string }) {
  const d = JSON.parse(snapshot);
  if (d.evidence)
    return (
      <div>
        <p>
          {d.evidence.evidence_title ?? d.evidence.title ?? "Bukti kompetensi"}
          {d.evidence.score != null ? ` · nilai ${d.evidence.score}` : ""}
        </p>
        {d.evidence.answer_text && <p>{d.evidence.answer_text}</p>}
        {d.observation && (
          <p>
            Hasil pengamatan: {d.observation} · {d.durationMinutes} menit ·{" "}
            {modes[d.learningMode] ?? d.learningMode}
          </p>
        )}
        <p>
          Bukti dinilai pada{" "}
          {time(
            d.evidence.graded_at ??
              d.evidence.completed_at ??
              d.evidence.updated_at,
          )}
          .
        </p>
      </div>
    );
  return (
    <div>
      <p>Alokasi saat keputusan: {d.allocation?.planned_skk} SKK.</p>
      <ul>
        {(d.mastery ?? []).map(
          (c: {
            id: string;
            code: string;
            reason: string;
            revision: number;
          }) => (
            <li key={c.id}>
              KD {c.code} · {c.reason} · keputusan ke-{c.revision}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
