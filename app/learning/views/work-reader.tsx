import type { WorkDetail } from "../work-types";
import { useWorkDraft } from "../hooks/use-work-draft";
import { WorkHistory } from "../components/work-history";
import { WorkEvidenceForm } from "../components/work-evidence-form";
export function WorkReader({
  id,
  userId,
  onSaved,
}: {
  id: string;
  userId: string;
  onSaved?: (detail: WorkDetail) => void;
}) {
  const w = useWorkDraft(id, userId, onSaved),
    d = w.detail;
  return (
    <article className="assignment-card work-card">
      <p role="status" aria-live="polite">
        {w.notice}
      </p>
      {!d ? (
        <button onClick={() => location.reload()}>Muat ulang</button>
      ) : (
        <>
          <h2>{String(d.assignment.title)}</h2>
          <p className="work-text">{String(d.assignment.instructions)}</p>
          <p>
            Tenggat:{" "}
            {new Date(String(d.assignment.personal_due_at)).toLocaleString(
              "id-ID",
            )}
          </p>
          <h3>Kompetensi dan SKK terkait</h3>
          <ul>
            {d.competencies.map((k) => (
              <li key={String(k.id)}>
                {String(k.code)} · {String(k.learner_outcome)} · paket{" "}
                {String(k.package_code)} · versi {String(k.version_code)} ·
                alokasi {String(k.allocation_skk)} SKK
              </li>
            ))}
          </ul>
          <p>
            Bobot kegiatan:{" "}
            {String(d.assignment.planned_skk ?? "belum ditetapkan")} SKK.
            Pengumpulan dan nilai belum memberikan SKK.
          </p>
          <h3>Rubrik sebelum mengerjakan</h3>
          {d.assignment.rubric_json ? (
            <ul>
              {JSON.parse(String(d.assignment.rubric_json)).map(
                (r: { label: string; weight: number }, i: number) => (
                  <li key={i}>
                    {r.label}: {r.weight}%
                  </li>
                ),
              )}
            </ul>
          ) : (
            <p>Tugas lama belum memiliki rubrik.</p>
          )}
          {w.pending && (
            <div className="teacher-note">
              <p>
                Salinan lokal adalah antrean belum tersinkron, bukan catatan
                belajar resmi.
              </p>
              <label>
                Teks salinan lokal untuk digabungkan
                <textarea readOnly value={w.pending.answerText} />
              </label>
              <button disabled={w.busy} onClick={() => w.recover(true)}>
                Pulihkan salinan lokal
              </button>
              <button onClick={() => w.recover(false)}>
                Buang salinan lokal
              </button>
            </div>
          )}
          {d.submission?.feedback && (
            <div className="teacher-note">
              <b>
                {d.submission.status === "draft"
                  ? "Tutor meminta revisi"
                  : `Nilai ${d.submission.score ?? "belum tersedia"}`}
              </b>
              <p>{String(d.submission.feedback)}</p>
            </div>
          )}
          {!d.submission || d.submission.status === "draft" ? (
            <WorkEvidenceForm w={w} />
          ) : (
            <>
              <p>
                {d.submission.status === "submitted"
                  ? "Karya menunggu penilaian tutor."
                  : "Karya telah dinilai."}
              </p>
              <blockquote>{String(d.submission.answer_text)}</blockquote>
              {JSON.parse(String(d.submission.evidence_json ?? "[]")).map(
                (l: { label: string; url: string }, i: number) => (
                  <p key={i}>
                    <a href={l.url} target="_blank" rel="noreferrer">
                      {l.label}
                    </a>
                  </p>
                ),
              )}
              {d.submission.status === "graded" && (
                <button
                  disabled={w.busy}
                  onClick={() =>
                    void w.act("portfolio", {
                      selected: !d.submission?.portfolio,
                    })
                  }
                >
                  {d.submission.portfolio
                    ? "Keluarkan dari portofolio"
                    : "Simpan sebagai karya terbaik di portofolio"}
                </button>
              )}
            </>
          )}
          <WorkHistory history={d.history} files={d.files} />
        </>
      )}
    </article>
  );
}
