import type { WorkDetail } from "../work-types";
import { longDateTime } from "../data";
const labels: Record<string, string> = {
  created: "Karya dimulai",
  previous_state: "Keadaan sebelumnya",
  save: "Draf disimpan",
  submit: "Karya dikirim",
  grade: "Penilaian rubrik",
  revise: "Permintaan revisi",
  portfolio: "Pilihan portofolio",
  upload: "Bukti diunggah",
  state: "Status karya",
};
export function WorkHistory({
  history,
  files,
}: Pick<WorkDetail, "history" | "files">) {
  return (
    <>
      <h3>Berkas bukti</h3>
      {files.length ? (
        <ul>
          {files.map((f) => (
            <li key={f.id}>
              <a href={`/api/v1/work/files/${f.id}`}>{f.name}</a> ·{" "}
              {Math.ceil(f.size / 1024)} KB
            </li>
          ))}
        </ul>
      ) : (
        <p>Belum ada berkas.</p>
      )}
      <details>
        <summary>Histori karya ({history.length})</summary>
        {history.map((h) => {
          const snapshot = JSON.parse(h.snapshot_json);
          return (
            <article key={h.id}>
              <p>
                <b>{labels[h.event] ?? h.event}</b> · {h.display_name} ·{" "}
                {longDateTime.format(new Date(h.created_at))}
              </p>
              {snapshot.answer !== undefined && (
                <blockquote>{snapshot.answer}</blockquote>
              )}
              {snapshot.score !== undefined && snapshot.score !== null && (
                <p>Nilai {snapshot.score}</p>
              )}
              {snapshot.feedback && <p>{snapshot.feedback}</p>}
              {snapshot.request?.criteria && (
                <ul>
                  {snapshot.request.criteria.map(
                    (r: { score: number; comment: string }, i: number) => (
                      <li key={i}>
                        Kriteria {i + 1}: {r.score} · {r.comment}
                      </li>
                    ),
                  )}
                </ul>
              )}
              {snapshot.request?.evidenceDecision && (
                <p>
                  Validasi bukti:{" "}
                  {snapshot.request.evidenceDecision === "supported"
                    ? "Mendukung penilaian"
                    : "Belum memadai"}
                  . SKK belum diberikan.
                </p>
              )}
              {snapshot.request?.reason && (
                <p>Alasan perubahan: {snapshot.request.reason}</p>
              )}
            </article>
          );
        })}
      </details>
    </>
  );
}
