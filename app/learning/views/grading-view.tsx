import { WorkTeacher } from "./work-teacher";
import type { Dispatch, SetStateAction } from "react";
import { longDateTime } from "../data";
import type { TeacherSubmission } from "../types";

type Grades = Record<string, { score: string; feedback: string }>;
type Props = {
  items: TeacherSubmission[];
  grades: Grades;
  saving: string | null;
  setGrades: Dispatch<SetStateAction<Grades>>;
  save: (id: string) => void;
};

export function GradingView({ items, grades, saving, setGrades, save }: Props) {
  return (
    <section>
      <WorkTeacher />
      <header className="inner-header">
        <div>
          <p className="eyebrow">RUANG GURU</p>
          <h2>Penilaian tugas sebelumnya</h2>
          <p>
            Periksa jawaban, berikan nilai, dan kirim umpan balik yang jelas.
          </p>
        </div>
        <span className="queue-count">
          {
            items.filter(
              (item) => item.status === "submitted" && !item.managed_work,
            ).length
          }{" "}
          menunggu
        </span>
      </header>
      {items.length ? (
        <div className="grading-list">
          {items
            .filter((item) => !item.managed_work)
            .map((item) => {
              const grade = grades[item.id] ?? { score: "", feedback: "" };
              return (
                <article className="grading-card" key={item.id}>
                  <div className="grading-meta">
                    <span>{item.subject}</span>
                    <b
                      className={
                        item.status === "graded" ? "graded" : "waiting"
                      }
                    >
                      {item.status === "graded"
                        ? "Sudah dinilai"
                        : "Menunggu penilaian"}
                    </b>
                  </div>
                  <h2>{item.assignment_title}</h2>
                  <p className="student-name">
                    {item.student_name} · dikirim{" "}
                    {longDateTime.format(new Date(item.submitted_at))}
                  </p>
                  <blockquote>{item.answer_text}</blockquote>
                  <div className="grade-fields">
                    <label>
                      Nilai
                      <input
                        aria-label={`Nilai ${item.student_name}`}
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={grade.score}
                        onChange={(event) =>
                          setGrades((current) => ({
                            ...current,
                            [item.id]: { ...grade, score: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label>
                      Umpan balik
                      <textarea
                        aria-label={`Umpan balik ${item.student_name}`}
                        value={grade.feedback}
                        onChange={(event) =>
                          setGrades((current) => ({
                            ...current,
                            [item.id]: {
                              ...grade,
                              feedback: event.target.value,
                            },
                          }))
                        }
                        placeholder="Tuliskan kekuatan jawaban dan saran perbaikan…"
                      />
                    </label>
                  </div>
                  <button
                    className="primary"
                    disabled={
                      saving === item.id ||
                      !grade.score ||
                      !grade.feedback.trim()
                    }
                    onClick={() => save(item.id)}
                  >
                    {saving === item.id
                      ? "Menyimpan…"
                      : item.status === "graded"
                        ? "Perbarui penilaian"
                        : "Simpan penilaian"}
                  </button>
                </article>
              );
            })}
        </div>
      ) : (
        <div className="empty-state">
          <span aria-hidden="true">✓</span>
          <h2>Belum ada tugas untuk dinilai</h2>
          <p>Pengumpulan siswa yang sudah dikirim akan muncul di sini.</p>
        </div>
      )}
    </section>
  );
}
