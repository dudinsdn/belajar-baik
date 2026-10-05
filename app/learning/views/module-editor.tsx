import { useEffect, useState } from "react";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { readApi, writeApi } from "../request";
import type { ModuleCatalog, ModuleDetail } from "../types";
const kinds = [
  ["identity", "Identitas, tujuan, estimasi dan bobot SKK"],
  ["context", "Masalah kontekstual"],
  ["content", "Materi inti"],
  ["activity", "Kegiatan belajar"],
  ["practice", "Latihan formatif"],
  ["reflection", "Refleksi"],
  ["summary", "Rangkuman"],
  ["assessment", "Asesmen ketuntasan"],
  ["evidence", "Bukti belajar"],
  ["media", "Lampiran dan transkrip"],
];
type Section = {
  title: string;
  body: string;
  kind: string;
  mode: string;
  competencyId: string;
  mediaUrl: string;
  mediaType: string;
};
const blank = (): Section => ({
  title: "",
  body: "",
  kind: "content",
  mode: "independent",
  competencyId: "",
  mediaUrl: "",
  mediaType: "audio",
});
export function ModuleEditor() {
  const [catalog, setCatalog] = useState<ModuleCatalog | null>(null);
  const [detail, setDetail] = useState<ModuleDetail | null>(null);
  const [id, setId] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [order, setOrder] = useState(1);
  const [estimated, setEstimated] = useState(30);
  const [plannedSkk, setPlannedSkk] = useState("");
  const [prerequisiteId, setPrerequisite] = useState("");
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);
  const [sections, setSections] = useState<Section[]>([blank()]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    readApi<ModuleCatalog>("/api/v1/modules", c.signal)
      .then(setCatalog)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [reload]);
  async function select(value: string) {
    if (dirty && !window.confirm("Perubahan belum disimpan. Buka modul lain?"))
      return;
    setDirty(false);
    setError("");
    setNotice("");
    setId(value);
    setDetail(null);
    if (!value) {
      setTitle("");
      setSummary("");
      setSections([blank()]);
      setPrerequisite("");
      setEstimated(30);
      setPlannedSkk("");
      return;
    }
    setBusy(true);
    try {
      const d = await readApi<ModuleDetail>(`/api/v1/modules/${value}`);
      setDetail(d);
      setSubject(d.material.class_subject_id);
      setTitle(d.material.title);
      setSummary(d.material.summary);
      setOrder(d.material.order_index);
      setEstimated(d.settings?.estimated_minutes ?? 30);
      setPlannedSkk(d.settings?.planned_skk?.toString() ?? "");
      setPrerequisite(d.settings?.prerequisite_id ?? "");
      setSections(
        d.sections.length
          ? d.sections.map((s) => ({
              title: s.title,
              body: s.body,
              kind: s.kind,
              mode: s.mode,
              competencyId: s.competency_id,
              mediaUrl: s.media_url ?? "",
              mediaType: s.media_type ?? "audio",
            }))
          : [{ ...blank(), title: d.material.title, body: d.material.content }],
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(publish = false) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await writeApi<{ id: string }>("/api/v1/modules", "POST", {
        id: id || undefined,
        classSubjectId: subject,
        title,
        summary,
        orderIndex: order,
        estimatedMinutes: estimated,
        plannedSkk,
        prerequisiteId,
        sections,
      });
      setId(result.id);
      setDirty(false);
      setNotice("Draf tersimpan.");
      setDetail(await readApi<ModuleDetail>(`/api/v1/modules/${result.id}`));
      if (publish)
        await writeApi("/api/v1/curriculum", "POST", {
          action: "publish",
          kind: "material",
          resourceId: result.id,
          competencyIds: [...new Set(sections.map((s) => s.competencyId))],
        });
      const d = await readApi<ModuleDetail>(`/api/v1/modules/${result.id}`);
      setDetail(d);
      setCatalog(await readApi<ModuleCatalog>("/api/v1/modules"));
      setNotice(
        publish
          ? "Modul diterbitkan. Isi dan pemetaan terkunci."
          : "Draf tersimpan.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function editSections(update: (rows: Section[]) => Section[]) {
    setDirty(true);
    setSections(update);
  }
  function change(i: number, key: keyof Section, value: string) {
    setDirty(true);
    setSections((rows) =>
      rows.map((s, n) => (n === i ? { ...s, [key]: value } : s)),
    );
  }
  const locked = detail?.material.status !== "draft" && !!detail;
  return (
    <section className="module-editor">
      <h1>Susun modul belajar</h1>
      <p>
        Susun tujuan, masalah kontekstual, materi, kegiatan, latihan, refleksi,
        rangkuman, asesmen, bukti, serta estimasi dan SKK sesuai pemetaan PKBM.
        Lampiran media perlu transkrip dalam isi bagian.
      </p>
      {error && (
        <p role="alert">
          {error}
          {id && !detail && (
            <button onClick={() => void select(id)}>Muat ulang modul</button>
          )}
          <button onClick={() => setReload((r) => r + 1)}>
            Muat ulang daftar
          </button>
        </p>
      )}
      <p role="status">{busy ? "Memproses…" : notice}</p>
      {!catalog ? (
        <p role="status">Memuat penugasan…</p>
      ) : (
        <>
          <label>
            Modul
            <select
              disabled={busy}
              value={id}
              onChange={(e) => void select(e.target.value)}
            >
              <option value="">Buat draf baru</option>
              {catalog.materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} · {m.status}
                </option>
              ))}
            </select>
          </label>
          <form
            onChange={() => setDirty(true)}
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <fieldset disabled={busy || locked || (!!id && !detail)}>
              <legend>Isi modul</legend>
              <label>
                Mata pelajaran dan kelas
                <select
                  required
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setPrerequisite("");
                    setSections((rows) =>
                      rows.map((s) => ({ ...s, competencyId: "" })),
                    );
                  }}
                >
                  <option value="">Pilih penugasan</option>
                  {catalog.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.class_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Judul
                <input
                  required
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                Ringkasan
                <textarea
                  required
                  maxLength={2000}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </label>
              <label>
                Urutan modul
                <input
                  type="number"
                  min={1}
                  max={10000}
                  required
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                />
              </label>
              <label>
                Estimasi menit
                <input
                  type="number"
                  min={1}
                  max={10000}
                  required
                  value={estimated}
                  onChange={(e) => setEstimated(Number(e.target.value))}
                />
              </label>
              <label>
                Bobot SKK rencana modul (opsional)
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={plannedSkk}
                  onChange={(e) => setPlannedSkk(e.target.value)}
                />
              </label>
              <p>
                Bobot ini bukan SKK tercapai dan tidak dijumlahkan sebagai
                ledger.
              </p>
              <label>
                Prasyarat
                <select
                  value={prerequisiteId}
                  onChange={(e) => setPrerequisite(e.target.value)}
                >
                  <option value="">Tanpa prasyarat</option>
                  {catalog.materials
                    .filter(
                      (m) =>
                        m.id !== id &&
                        m.class_subject_id === subject &&
                        m.status === "published",
                    )
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                </select>
              </label>
              {sections.map((s, i) => (
                <fieldset key={i}>
                  <legend>Bagian {i + 1}</legend>
                  <label>
                    Jenis
                    <select
                      value={s.kind}
                      onChange={(e) => change(i, "kind", e.target.value)}
                    >
                      {kinds.map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Judul bagian
                    <input
                      required
                      maxLength={200}
                      value={s.title}
                      onChange={(e) => change(i, "title", e.target.value)}
                    />
                  </label>
                  <label>
                    KD dan tujuan
                    <select
                      required
                      value={s.competencyId}
                      onChange={(e) =>
                        change(i, "competencyId", e.target.value)
                      }
                    >
                      <option value="">Pilih KD</option>
                      {catalog.competencies
                        .filter((k) => k.class_subject_id === subject)
                        .map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.version_code} · {k.package_code} · {k.code} ·{" "}
                            {k.learner_outcome}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Mode belajar
                    <select
                      value={s.mode}
                      onChange={(e) => change(i, "mode", e.target.value)}
                    >
                      <option value="independent">Mandiri</option>
                      <option value="tutorial">Tutorial</option>
                      <option value="face_to_face">Tatap muka</option>
                    </select>
                  </label>
                  <label>
                    URL lampiran media HTTPS (opsional)
                    <input
                      type="url"
                      value={s.mediaUrl}
                      maxLength={2000}
                      onChange={(e) => change(i, "mediaUrl", e.target.value)}
                    />
                  </label>
                  <label>
                    Jenis media
                    <select
                      value={s.mediaType}
                      onChange={(e) => change(i, "mediaType", e.target.value)}
                    >
                      <option value="audio">Audio</option>
                      <option value="video">Video</option>
                    </select>
                  </label>
                  <label>
                    Isi teks dan transkrip
                    <textarea
                      required
                      maxLength={30000}
                      rows={8}
                      value={s.body}
                      onChange={(e) => change(i, "body", e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() =>
                      editSections((rows) => {
                        const next = [...rows];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        return next;
                      })
                    }
                  >
                    Naikkan bagian
                  </button>
                  <button
                    type="button"
                    disabled={sections.length === 1}
                    onClick={() =>
                      editSections((rows) => rows.filter((_, n) => n !== i))
                    }
                  >
                    Hapus bagian
                  </button>
                </fieldset>
              ))}
              <button
                type="button"
                disabled={sections.length >= 50}
                onClick={() => editSections((rows) => [...rows, blank()])}
              >
                Tambah bagian
              </button>
              <button type="submit">Simpan draf</button>
              <button
                type="submit"
                onClick={(e) => {
                  if (e.currentTarget.form?.reportValidity()) {
                    e.preventDefault();
                    void save(true);
                  }
                }}
              >
                Simpan dan terbitkan
              </button>
            </fieldset>
          </form>
          {locked && (
            <p>
              Modul terbit terkunci untuk menjaga histori. Pilih Buat draf baru
              untuk versi berikutnya.
            </p>
          )}
          {detail && (
            <section>
              <h2>Penyelesaian bagian</h2>
              <p>
                Progres berdasarkan bagian yang pernah dibuka. Penyelesaian
                bukan pengakuan kompetensi atau SKK.
              </p>
              {detail.stats.map((s) => (
                <p key={s.id}>
                  {s.title}: {s.completed_count} selesai ·{" "}
                  {s.started_count - s.completed_count} sudah membuka, belum
                  selesai · {s.help_count} pertanyaan
                </p>
              ))}
              <h2>Pertanyaan warga belajar</h2>
              <p>Menampilkan hingga 100 pertanyaan terbaru.</p>
              {detail.events.length ? (
                detail.events.map((e) => (
                  <p key={e.id}>
                    <strong>
                      {e.display_name} · {e.title}
                    </strong>
                    <br />
                    {e.note}
                  </p>
                ))
              ) : (
                <p>Belum ada pertanyaan pada bagian modul ini.</p>
              )}
            </section>
          )}
        </>
      )}
    </section>
  );
}
