import type { Dispatch, SetStateAction } from "react";
import { assignments, longDateTime } from "../data";
import type { AssignmentData } from "../types";

type Props = {
  items: AssignmentData[];
  submitted: number[];
  answers: Record<string, string>;
  saving: string | null;
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  submit: (id: number | string) => void;
};

export function AssignmentsView({
  items,
  submitted,
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
          <h1>Tugas yang terarah</h1>
          <p>
            {items.length
              ? "Jawaban dan status pengumpulan tersimpan di server belajar."
              : "Status pengumpulan disimpan di perangkat ini."}
          </p>
        </div>
      </header>
      <div className="assignment-grid">
        {(items.length ? items : assignments).map((task) => {
          const serverTask = "due_at" in task;
          const status = serverTask
            ? task.submission_status
            : submitted.includes(task.id)
              ? "submitted"
              : "not_started";
          return (
            <article className="assignment-card" key={task.id}>
              <span>{task.subject}</span>
              <h2>{task.title}</h2>
              <p>
                {serverTask
                  ? longDateTime.format(new Date(task.due_at))
                  : task.due}
              </p>
              {status === "graded" ? (
                <div className="teacher-note">
                  <b>Nilai {serverTask ? task.score : ""}</b>
                  <p>
                    {serverTask
                      ? task.feedback
                      : "Sudut pandangmu bagus. Tambahkan contoh tindakan nyata."}
                  </p>
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
                    value={serverTask ? (answers[task.id] ?? "") : undefined}
                    onChange={
                      serverTask
                        ? (event) =>
                            setAnswers((current) => ({
                              ...current,
                              [task.id]: event.target.value,
                            }))
                        : undefined
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
    </section>
  );
}
