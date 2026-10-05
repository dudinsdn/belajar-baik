import type { useWorkDraft } from "../hooks/use-work-draft";
export function WorkEvidenceForm({
  w,
}: {
  w: ReturnType<typeof useWorkDraft>;
}) {
  return (
    <fieldset disabled={w.busy || !!w.pending}>
      <legend>Jawaban dan bukti karya</legend>
      <label>
        Jawaban / pengalaman terdahulu
        <textarea
          maxLength={5000}
          value={w.draft.answerText}
          onChange={(e) => w.edit({ ...w.draft, answerText: e.target.value })}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={w.draft.priorLearning}
          onChange={(e) =>
            w.edit({ ...w.draft, priorLearning: e.target.checked })
          }
        />
        Ajukan sebagai calon alih kredit (belum diakui)
      </label>
      {w.draft.evidence.map((link, i) => (
        <div key={i}>
          <label>
            Keterangan bukti {i + 1}
            <input
              maxLength={200}
              value={link.label}
              onChange={(e) =>
                w.edit({
                  ...w.draft,
                  evidence: w.draft.evidence.map((l, n) =>
                    n === i ? { ...l, label: e.target.value } : l,
                  ),
                })
              }
            />
          </label>
          <label>
            Tautan HTTPS {i + 1}
            <input
              type="url"
              value={link.url}
              onChange={(e) =>
                w.edit({
                  ...w.draft,
                  evidence: w.draft.evidence.map((l, n) =>
                    n === i ? { ...l, url: e.target.value } : l,
                  ),
                })
              }
            />
          </label>
          <button
            onClick={() =>
              w.edit({
                ...w.draft,
                evidence: w.draft.evidence.filter((_, n) => n !== i),
              })
            }
          >
            Hapus tautan {i + 1}
          </button>
        </div>
      ))}
      <button
        disabled={w.draft.evidence.length >= 10}
        onClick={() =>
          w.edit({
            ...w.draft,
            evidence: [...w.draft.evidence, { label: "", url: "" }],
          })
        }
      >
        Tambah tautan bukti
      </button>
      <label>
        Unggah foto, PDF, atau audio (maks. 1 MB/berkas; 5 berkas, total 3 MB)
        <input
          type="file"
          accept="image/jpeg,image/png,application/pdf,audio/mpeg,audio/wav,audio/ogg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void w.upload(file);
            e.target.value = "";
          }}
        />
      </label>
      <p>
        {w.dirty
          ? "Perubahan belum tersimpan."
          : "Draf mengikuti catatan server."}
      </p>
      <button onClick={() => void w.save()}>Simpan draf sekarang</button>
      <button className="primary" onClick={() => void w.act("submit")}>
        Kirim karya
      </button>
    </fieldset>
  );
}
