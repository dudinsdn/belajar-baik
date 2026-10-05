"use client";

import { useEffect, useState, type FormEvent } from "react";
import { readApi, writeApi } from "../request";

type RecordRow = Record<string, string | number | null>;
type CurriculumData = {
  role: string;
  classes: RecordRow[];
  versions: RecordRow[];
  mappings: RecordRow[];
  assignments: RecordRow[];
  totals: Array<{
    assignmentId: string;
    studentId: string;
    studentName: string;
    packageId: string;
    skk: number;
  }>;
  studentTotals: Array<{ studentId: string; studentName: string; skk: number }>;
  students: RecordRow[];
  subjects: RecordRow[];
  content: RecordRow[];
};
const blankRow = () => ({
  level: "",
  package: "",
  subjectId: "",
  group: "general",
  ki: "",
  kiDescription: "",
  kd: "",
  description: "",
  outcome: "",
  skk: 1,
  face: 0,
  tutorial: 0,
  independent: 100,
});
type MappingRow = ReturnType<typeof blankRow>;
const groups = [
  ["general", "Umum"],
  ["specialization", "Peminatan"],
  ["empowerment", "Pemberdayaan"],
  ["skills", "Keterampilan"],
  ["local", "Muatan lokal"],
];

export function CurriculumView() {
  const [data, setData] = useState<CurriculumData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<MappingRow[]>([blankRow()]);
  const [selected, setSelected] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [copyVersion, setCopyVersion] = useState("");
  const sourceVersion = data?.versions.find((v) => v.id === copyVersion);
  async function load() {
    try {
      setData(await readApi<CurriculumData>("/api/v1/curriculum"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kurikulum gagal dimuat.");
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    readApi<CurriculumData>("/api/v1/curriculum", controller.signal)
      .then(setData)
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Kurikulum gagal dimuat.");
      });
    return () => controller.abort();
  }, []);
  async function save(body: unknown, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setData(
        await writeApi<CurriculumData>("/api/v1/curriculum", "POST", body),
      );
      setNotice(message);
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Data gagal disimpan. Isian tetap tersedia.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  function values(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return Object.fromEntries(new FormData(event.currentTarget));
  }
  function edit(index: number, key: keyof MappingRow, value: string) {
    setRows((old) =>
      old.map((r, i) =>
        i === index
          ? { ...r, [key]: typeof r[key] === "number" ? Number(value) : value }
          : r,
      ),
    );
  }
  const packages = [
    ...new Map(
      (data?.mappings ?? []).map((m) => [String(m.package_id), m]),
    ).values(),
  ];
  const resource = data?.content.find((r) => `${r.kind}/${r.id}` === selected);
  const kdOptions = (data?.mappings ?? []).filter(
    (m) =>
      m.subject_id === resource?.subject_id &&
      data?.versions.some(
        (v) =>
          v.id === m.version_id &&
          v.class_id === resource?.class_id &&
          v.status === "active",
      ),
  );
  return (
    <section className="curriculum-view">
      <p className="eyebrow">TARGET KOMPETENSI</p>
      <h1>Kurikulum dan SKK</h1>
      <p>
        Kenali target belajar dan beban SKK yang direncanakan. SKK terencana
        belum merupakan SKK yang telah dicapai.
      </p>
      {error && (
        <div role="alert" className="curriculum-message">
          {error}
          <button onClick={() => void load()} disabled={busy}>
            Muat ulang data
          </button>
        </div>
      )}
      <p role="status" aria-live="polite">
        {busy ? "Menyimpan…" : notice}
      </p>
      {!data && !error && <p role="status">Memuat kurikulum…</p>}
      {data && (
        <>
          {!data.versions.length && (
            <div className="curriculum-card">
              <h2>Belum ada kurikulum</h2>
              <p>
                {data.role === "teacher"
                  ? "Susun versi kurikulum pertama dari pemetaan yang telah disetujui satuan pendidikan."
                  : "Tutor belum menetapkan paket kompetensi untukmu."}
              </p>
            </div>
          )}
          {data.versions.map((v) => {
            const mappings = data.mappings.filter((m) => m.version_id === v.id);
            const allocations = [
              ...new Map(
                mappings.map((m) => [`${m.package_id}/${m.subject_id}`, m]),
              ).values(),
            ];
            return (
              <article className="curriculum-card" key={String(v.id)}>
                <h2>
                  {v.name} <small>({v.code})</small>
                </h2>
                <p>
                  {v.program} · {v.academic_year} ·{" "}
                  {v.status === "draft" ? "Draf" : "Aktif — pemetaan terkunci"}
                </p>
                <p>
                  Berlaku mulai {v.effective_from}. Acuan: {v.source_reference}
                </p>
                <h3>
                  {allocations.reduce(
                    (sum, m) => sum + Number(m.planned_skk),
                    0,
                  )}{" "}
                  SKK terencana
                </h3>
                <div className="curriculum-table">
                  <table>
                    <caption>Alokasi per paket dan mata pelajaran</caption>
                    <thead>
                      <tr>
                        <th>Tingkatan / paket</th>
                        <th>Mata pelajaran</th>
                        <th>SKK</th>
                        <th>Mode belajar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map((m) => (
                        <tr key={`${m.package_id}/${m.subject_id}`}>
                          <td>
                            {m.level_code} / {m.package_code}
                          </td>
                          <td>
                            {m.subject} (
                            {groups.find((g) => g[0] === m.subject_group)?.[1]})
                          </td>
                          <td>{m.planned_skk}</td>
                          <td>
                            Tatap muka {m.face_to_face_percent}%, tutorial{" "}
                            {m.tutorial_percent}%, mandiri{" "}
                            {m.independent_percent}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h3>Kompetensi yang dituju</h3>
                {mappings.map((m) => (
                  <div className="competency-row" key={String(m.id)}>
                    <b>
                      {m.subject} · Paket {m.package_code} · KD {m.code}
                    </b>
                    <p>
                      KI {String(m.ki_code).split(":").slice(1).join(":")}:{" "}
                      {m.ki_description}
                    </p>
                    <p>{m.description}</p>
                    <p>Setelah belajar ini, saya mampu {m.learner_outcome}</p>
                  </div>
                ))}
                {data.role === "teacher" && v.status === "draft" && (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() =>
                      void save(
                        { action: "activate", versionId: v.id },
                        "Versi diaktifkan. Pemetaan terkunci; gunakan versi baru untuk perubahan berikutnya.",
                      )
                    }
                  >
                    Aktifkan versi ini
                  </button>
                )}
                {data.role === "teacher" && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      setRows(
                        mappings.map((m) => ({
                          level: String(m.level_code),
                          package: String(m.package_code),
                          subjectId: String(m.subject_id),
                          group: String(m.subject_group),
                          ki: String(m.ki_code).split(":").slice(1).join(":"),
                          kiDescription: String(m.ki_description),
                          kd: String(m.code),
                          description: String(m.description),
                          outcome: String(m.learner_outcome),
                          skk: Number(m.planned_skk),
                          face: Number(m.face_to_face_percent),
                          tutorial: Number(m.tutorial_percent),
                          independent: Number(m.independent_percent),
                        })),
                      );
                      setCopyVersion(String(v.id));
                      requestAnimationFrame(() =>
                        document
                          .getElementById("curriculum-draft")
                          ?.scrollIntoView({ block: "start" }),
                      );
                    }}
                  >
                    Salin pemetaan ke versi baru
                  </button>
                )}
              </article>
            );
          })}
          {data.totals.length > 0 && (
            <article className="curriculum-card">
              <h2>SKK per warga belajar</h2>
              {data.studentTotals.map((t) => (
                <h3 key={t.studentId}>
                  {t.studentName}: {t.skk} SKK terencana seluruh paket
                </h3>
              ))}
              {data.totals.map((t) => (
                <p key={t.assignmentId}>
                  {t.studentName} · Paket{" "}
                  {
                    packages.find((p) => p.package_id === t.packageId)
                      ?.package_code
                  }
                  : <b>{t.skk} SKK terencana</b>
                </p>
              ))}
            </article>
          )}
          {data.role === "teacher" && (
            <>
              <form
                className="curriculum-card"
                onSubmit={(e) =>
                  void save(
                    { action: "class", ...values(e) },
                    "Kelas dan tahun ajaran Paket C dibuat.",
                  )
                }
              >
                <h2>Buat kelas dan tahun ajaran Paket C</h2>
                <div className="curriculum-grid">
                  <label>
                    Nama kelas
                    <input name="name" required maxLength={200} />
                  </label>
                  <label>
                    Tahun ajaran
                    <input
                      name="academicYear"
                      placeholder="2026/2027"
                      required
                      pattern="[0-9]{4}/[0-9]{4}"
                    />
                  </label>
                  <label>
                    Jenjang kelas
                    <select name="gradeLevel">
                      <option>10</option>
                      <option>11</option>
                      <option>12</option>
                    </select>
                  </label>
                </div>
                <button className="primary" disabled={busy}>
                  Buat kelas Paket C
                </button>
              </form>
              <form
                className="curriculum-card"
                onSubmit={(e) =>
                  void save(
                    { action: "subject", ...values(e) },
                    "Mata pelajaran ditambahkan ke kelas.",
                  )
                }
              >
                <h2>Kelola mata pelajaran kelas</h2>
                <div className="curriculum-grid">
                  <label>
                    Kelas
                    <select name="classId" required>
                      <option value="">Pilih kelas</option>
                      {data.classes.map((c) => (
                        <option key={String(c.id)} value={String(c.id)}>
                          {c.name} · {c.academic_year}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Kode mata pelajaran
                    <input name="code" required maxLength={60} />
                  </label>
                  <label>
                    Nama mata pelajaran
                    <input name="name" required maxLength={200} />
                  </label>
                </div>
                <p>
                  Gunakan kode dan nama yang sama untuk menugaskan mata
                  pelajaran yang sudah tersedia. Kelompok umum, peminatan,
                  pemberdayaan, atau keterampilan diatur pada pemetaan versi.
                </p>
                <button className="primary" disabled={busy}>
                  Tambahkan mata pelajaran
                </button>
              </form>
              <form
                className="curriculum-card"
                onSubmit={async (e) => {
                  const fields = values(e);
                  await save(
                    { action: "create", ...fields, rows },
                    "Draf versi tersimpan. Periksa pemetaan sebelum mengaktifkannya.",
                  );
                }}
              >
                <h2 id="curriculum-draft">Susun versi kurikulum baru</h2>
                <p>
                  Gunakan dokumen dan alokasi yang disetujui PKBM. Total SKK
                  tidak diisi otomatis. Tahun ajaran dan program mengikuti kelas
                  yang dipilih.
                </p>
                <div className="curriculum-grid">
                  <label>
                    Kelas dan tahun ajaran
                    <select name="classId" required>
                      <option value="">Pilih kelas</option>
                      {data.classes.map((c) => (
                        <option key={String(c.id)} value={String(c.id)}>
                          {c.name} · {c.academic_year} · {c.program}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Kode versi
                    <input name="code" required maxLength={100} />
                  </label>
                  <label>
                    Nama versi
                    <input
                      key={copyVersion}
                      name="name"
                      defaultValue={
                        sourceVersion ? `${sourceVersion.name} — revisi` : ""
                      }
                      required
                      maxLength={200}
                    />
                  </label>
                  <label>
                    Tanggal mulai berlaku
                    <input name="effectiveFrom" type="date" required />
                  </label>
                </div>
                <label>
                  Dokumen pemetaan yang disetujui
                  <input
                    key={copyVersion}
                    name="source"
                    defaultValue={
                      sourceVersion
                        ? String(sourceVersion.source_reference)
                        : ""
                    }
                    required
                    maxLength={1000}
                  />
                </label>
                {rows.map((r, i) => (
                  <fieldset key={i}>
                    <legend>Pemetaan kompetensi {i + 1}</legend>
                    <div className="curriculum-grid">
                      {(
                        [
                          ["level", "Tingkatan"],
                          ["package", "Paket kompetensi"],
                          ["ki", "Kode KI"],
                          ["kd", "Kode KD"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key}>
                          {label}
                          <input
                            value={r[key]}
                            required
                            onChange={(e) => edit(i, key, e.target.value)}
                          />
                        </label>
                      ))}
                      <label>
                        Mata pelajaran
                        <select
                          value={r.subjectId}
                          required
                          onChange={(e) => edit(i, "subjectId", e.target.value)}
                        >
                          <option value="">Pilih mata pelajaran</option>
                          {data.subjects.map((s) => (
                            <option key={String(s.id)} value={String(s.id)}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Kelompok
                        <select
                          value={r.group}
                          onChange={(e) => edit(i, "group", e.target.value)}
                        >
                          {groups.map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        SKK mata pelajaran dalam paket
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={r.skk}
                          onChange={(e) => edit(i, "skk", e.target.value)}
                        />
                      </label>
                      {(
                        [
                          ["face", "Tatap muka (%)"],
                          ["tutorial", "Tutorial (%)"],
                          ["independent", "Mandiri (%)"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key}>
                          {label}
                          <input
                            type="number"
                            min="0"
                            max="100"
                            required
                            value={r[key]}
                            onChange={(e) => edit(i, key, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                    {(
                      [
                        ["kiDescription", "Deskripsi KI"],
                        ["description", "Deskripsi KD"],
                        ["outcome", "Setelah belajar ini, saya mampu…"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <textarea
                          required
                          value={r[key]}
                          onChange={(e) => edit(i, key, e.target.value)}
                        />
                      </label>
                    ))}
                    {rows.length > 1 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setRows((old) => old.filter((_, n) => n !== i))
                        }
                      >
                        Hapus pemetaan {i + 1}
                      </button>
                    )}
                  </fieldset>
                ))}
                <p>
                  Jika ada beberapa KD dalam satu paket/mata pelajaran, ulangi
                  bobot SKK dan proporsi mode yang sama. Total dihitung sekali
                  per mata pelajaran.
                </p>
                <div className="curriculum-actions">
                  <button
                    type="button"
                    disabled={busy || rows.length >= 100}
                    onClick={() => setRows((old) => [...old, blankRow()])}
                  >
                    Tambah pemetaan
                  </button>
                  <button
                    className="primary"
                    disabled={busy || !data.classes.length}
                  >
                    Simpan draf versi
                  </button>
                </div>
              </form>
              <form
                className="curriculum-card"
                onSubmit={(e) =>
                  void save(
                    { action: "assign", ...values(e) },
                    "Paket kompetensi berhasil ditetapkan.",
                  )
                }
              >
                <h2>Tetapkan paket kepada warga belajar</h2>
                <div className="curriculum-grid">
                  <label>
                    Paket aktif
                    <select name="packageId" required>
                      <option value="">Pilih paket</option>
                      {packages
                        .filter((p) =>
                          data.versions.some(
                            (v) =>
                              v.id === p.version_id && v.status === "active",
                          ),
                        )
                        .map((p) => (
                          <option
                            key={String(p.package_id)}
                            value={String(p.package_id)}
                          >
                            {
                              data.versions.find((v) => v.id === p.version_id)
                                ?.name
                            }{" "}
                            · {p.level_code} / {p.package_code}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Warga belajar
                    <select name="studentId" required>
                      <option value="">Pilih warga belajar</option>
                      {data.students.map((s) => (
                        <option
                          key={`${s.class_id}/${s.id}`}
                          value={String(s.id)}
                        >
                          {s.display_name} ·{" "}
                          {data.classes.find((c) => c.id === s.class_id)?.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button className="primary" disabled={busy}>
                  Tetapkan paket
                </button>
              </form>
              <form
                className="curriculum-card"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save(
                    {
                      action: "publish",
                      kind: resource?.kind,
                      resourceId: resource?.id,
                      competencyIds: chosen,
                    },
                    "Pembelajaran diterbitkan dengan kompetensi yang terhubung.",
                  );
                }}
              >
                <h2>Hubungkan kompetensi dan terbitkan</h2>
                <label>
                  Modul atau asesmen
                  <select
                    required
                    value={selected}
                    onChange={(e) => {
                      setSelected(e.target.value);
                      setChosen([]);
                    }}
                  >
                    <option value="">Pilih pembelajaran</option>
                    {data.content
                      .filter(
                        (r) => r.status !== "published" || !r.competency_ids,
                      )
                      .map((r) => (
                        <option
                          key={`${r.kind}/${r.id}`}
                          value={`${r.kind}/${r.id}`}
                        >
                          {r.title} ({r.kind})
                        </option>
                      ))}
                  </select>
                </label>
                <fieldset>
                  <legend>
                    Kompetensi pada kelas dan mata pelajaran yang sama
                  </legend>
                  {kdOptions.length ? (
                    kdOptions.map((m) => (
                      <label className="curriculum-check" key={String(m.id)}>
                        <input
                          type="checkbox"
                          checked={chosen.includes(String(m.id))}
                          onChange={(e) =>
                            setChosen((old) =>
                              e.target.checked
                                ? [...old, String(m.id)]
                                : old.filter((id) => id !== m.id),
                            )
                          }
                        />
                        {m.code}: {m.description} (Paket {m.package_code})
                      </label>
                    ))
                  ) : (
                    <p>
                      Pilih pembelajaran dan aktifkan versi kurikulum terlebih
                      dahulu.
                    </p>
                  )}
                </fieldset>
                <button className="primary" disabled={busy || !chosen.length}>
                  Terbitkan dengan KD terpilih
                </button>
              </form>
            </>
          )}
        </>
      )}
    </section>
  );
}
