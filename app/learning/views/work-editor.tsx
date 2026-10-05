import { WorkRubricFields } from "../components/work-rubric-fields";
import { useState } from "react";
import { writeApi } from "../request";
import type { ModuleCatalog } from "../types";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
const templates = {
  task: {
    instructions:
      "Pelajari konteks, tuliskan jawaban, dan lampirkan bukti yang mendukung.",
    labels: ["Pengetahuan", "Ketepatan bukti"],
  },
  project: {
    instructions:
      "Rencanakan proyek, catat proses, jelaskan hasil, dan refleksikan perbaikan.",
    labels: ["Perencanaan", "Proses kerja", "Produk", "Refleksi"],
  },
  skill: {
    instructions:
      "Demonstrasikan keterampilan, lampirkan bukti proses dan hasil, jelaskan langkah kerja.",
    labels: ["Sikap kerja", "Langkah kerja", "Hasil keterampilan", "Refleksi"],
  },
  prior_learning: {
    instructions:
      "Jelaskan pengalaman terdahulu, peran Anda, waktu kegiatan, dan bukti kompetensi. Ini pengajuan calon alih kredit.",
    labels: ["Kesesuaian kompetensi", "Kekuatan bukti"],
  },
};
export function WorkEditor({
  catalog,
  reload,
}: {
  catalog: ModuleCatalog;
  reload: () => Promise<void>;
}) {
  const [kind, setKind] = useState<keyof typeof templates>("task"),
    [title, setTitle] = useState(""),
    [instructions, setInstructions] = useState(templates.task.instructions),
    [cs, setCs] = useState(""),
    [kd, setKd] = useState<string[]>([]),
    [due, setDue] = useState(""),
    [late, setLate] = useState(false),
    [skk, setSkk] = useState("0"),
    [rubric, setRubric] = useState(
      templates.task.labels.map((label) => ({ label, weight: 50 })),
    ),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useUnsavedChanges(!!title);
  const save = async () => {
    setBusy(true);
    try {
      await writeApi("/api/v1/work", "POST", {
        title,
        instructions,
        classSubjectId: cs,
        kind,
        competencyIds: kd,
        dueAt: due ? new Date(due).toISOString() : "",
        allowLate: late,
        plannedSkk: Number(skk),
        rubric,
      });
      setTitle("");
      setNotice("Draf tersimpan. Periksa kemudian terbitkan.");
      await reload();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <details>
      <summary>Buat tugas dari template</summary>
      <fieldset className="work-card" disabled={busy}>
        <legend>Tugas, proyek, keterampilan, atau pengajuan alih kredit</legend>
        <label>
          Template
          <select
            value={kind}
            onChange={(e) => {
              const k = e.target.value as keyof typeof templates;
              setKind(k);
              setInstructions(templates[k].instructions);
              setRubric(
                templates[k].labels.map((label) => ({
                  label,
                  weight: 100 / templates[k].labels.length,
                })),
              );
            }}
          >
            <option value="task">Tugas</option>
            <option value="project">Proyek</option>
            <option value="skill">Keterampilan</option>
            <option value="prior_learning">Pengalaman terdahulu</option>
          </select>
        </label>
        <label>
          Judul
          <input
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Penugasan kelas
          <select
            value={cs}
            onChange={(e) => {
              setCs(e.target.value);
              setKd([]);
            }}
          >
            <option value="">Pilih kelas / mata pelajaran</option>
            {catalog.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.class_name} · {s.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>KD dan paket kompetensi</legend>
          {catalog.competencies
            .filter((k) => k.class_subject_id === cs)
            .map((k) => (
              <label key={k.id}>
                <input
                  type="checkbox"
                  checked={kd.includes(k.id)}
                  onChange={(e) =>
                    setKd(
                      e.target.checked
                        ? [...kd, k.id]
                        : kd.filter((id) => id !== k.id),
                    )
                  }
                />
                {k.code} · {k.learner_outcome} · {k.package_code} ·{" "}
                {k.version_code}
              </label>
            ))}
        </fieldset>
        <label>
          Instruksi
          <textarea
            maxLength={5000}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </label>
        <label>
          Tenggat
          <input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={late}
            onChange={(e) => setLate(e.target.checked)}
          />
          Izinkan pengumpulan terlambat
        </label>
        <label>
          SKK terkait kegiatan (bukan pemberian SKK)
          <input
            type="number"
            min="0"
            max="100"
            value={skk}
            onChange={(e) => setSkk(e.target.value)}
          />
        </label>
        <WorkRubricFields rubric={rubric} setRubric={setRubric} />
        <button className="primary" onClick={() => void save()}>
          Simpan draf tugas
        </button>
        <p role="status">{notice}</p>
      </fieldset>
    </details>
  );
}
