import type { Dispatch, SetStateAction } from "react";
import { longDateTime } from "../data";
import type { AssignmentData } from "../types";

type Props = {
  items: AssignmentData[];
  answers: Record<string, string>;
  saving: string | null;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  submit: (id: string) => void;
};

export function AssignmentsView({
  items,
  answers,
  saving,
  setAnswers,
  submit,
}: Props) {
  return (
    <section>
      <header className="inner-header">
        <div>
          <p className="eyebrow">RUANG TUGAS</p>
          <h2>Tugas sebelumnya</h2>
          <p>Jawaban dan status pengumpulan tersimpan di server belajar.</p>
        </div>
      </header>
      <div className="assignment-grid">
        {items.map((task) => {
          const status = task.submission_status;
          return (
            <article className="assignment-card" key={task.id}>
              <span>{task.subject}</span>
              <h2>{task.title}</h2>
              <p>{longDateTime.format(new Date(task.due_at))}</p>
              {status === "graded" ? (
                <div className="teacher-note">
                  <b>Nilai {task.score}</b>
                  <p>{task.feedback}</p>
                </div>
              ) : status === "submitted" ? (
                <div className="teacher-note">
                  <b>Tugas sudah terkirim</b>
                  <p>Jawaban menunggu penilaian guru.</p>
                </div>
              ) : (
                <>
                  <textarea
                    aria-label={`Jawaban ${task.title}`}
                    placeholder="Tuliskan jawaban atau catatan untuk guru…"
                    value={answers[task.id] ?? ""}
                    onChange={(event) =>
                      setAnswers((current) => ({
                        ...current,
                        [task.id]: event.target.value,
                      }))
                    }
                  />
                  <button
                    className="primary"
                    disabled={saving === String(task.id)}
                    onClick={() => submit(task.id)}
                  >
                    {saving === String(task.id) ? "Mengirim…" : "Kirim tugas"}
                  </button>
                </>
              )}
            </article>
          );
        })}
      </div>
      {!items.length && (
        <div className="empty-state">
          <h2>Belum ada tugas</h2>
          <p>Tugas yang diterbitkan tutor akan tampil di sini.</p>
        </div>
      )}
    </section>
  );
}
