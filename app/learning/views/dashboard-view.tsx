import { courses, shortDateTime } from "../data";
import type { DashboardData } from "../types";

type Props = {
  displayName: string;
  dashboard: DashboardData | null;
  goTo: (destination: string) => void;
};

export function DashboardView({ displayName, dashboard, goTo }: Props) {
  const current = dashboard?.continueMaterial;
  const tasks = dashboard?.assignments.length
    ? dashboard.assignments
    : [
        {
          id: "fallback-1",
          title: "Latihan Persamaan Kuadrat",
          due_at: "2026-09-20T20:00:00+07:00",
          subject: "Matematika",
          submission_status: "not_started",
        },
        {
          id: "fallback-2",
          title: "Ringkasan Narrative Text",
          due_at: "2026-09-21T18:00:00+07:00",
          subject: "Bahasa Inggris",
          submission_status: "not_started",
        },
      ];

  return (
    <>
      <section className="welcome">
        <div>
          <p className="eyebrow">SABTU, 20 SEPTEMBER 2026</p>
          <h1>Selamat pagi, {displayName.split(" ")[0]}!</h1>
          <p>
            Mulai dari yang kecil. Satu materi hari ini adalah satu langkah
            maju.
          </p>
        </div>
        <div className="streak" aria-label="Rangkaian belajar 4 hari">
          <span aria-hidden="true">✦</span>
          <div>
            <b>4 hari</b>
            <small>Rangkaian belajar</small>
          </div>
        </div>
      </section>
      <section className="continue-card" aria-labelledby="continue-title">
        <div className="continue-art" aria-hidden="true">
          <span>45</span>
          <small>menit</small>
        </div>
        <div className="continue-copy">
          <p className="eyebrow">LANJUTKAN BELAJAR</p>
          <h2 id="continue-title">
            {current?.title ?? "Mempertahankan Kemerdekaan Indonesia"}
          </h2>
          <p>
            {current
              ? `${current.subject}${current.last_position ? ` · ${current.last_position}` : ""}`
              : "Sejarah Indonesia · Bab 3"}
          </p>
          <div className="progress-row">
            <div className="progress">
              <span style={{ width: `${current?.percent ?? 68}%` }} />
            </div>
            <b>{current?.percent ?? 68}%</b>
          </div>
        </div>
        <button className="primary" onClick={() => goTo("Materi")}>
          Lanjutkan materi <span aria-hidden="true">→</span>
        </button>
      </section>
      <section className="section-block" aria-labelledby="today-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RENCANA HARI INI</p>
            <h2 id="today-title">Yang perlu diselesaikan</h2>
          </div>
          <button className="text-button" onClick={() => goTo("Tugas")}>
            Lihat semua
          </button>
        </div>
        <div className="task-grid">
          {tasks.map((task, index) => (
            <article className="task-card" key={task.id}>
              <span
                className={`task-icon ${index % 2 ? "coral" : "blue"}`}
                aria-hidden="true"
              >
                {index % 2 ? "□" : "✓"}
              </span>
              <div>
                <span className={`pill ${index === 0 ? "urgent" : ""}`}>
                  {shortDateTime.format(new Date(task.due_at))}
                </span>
                <h3>{task.title}</h3>
                <p>
                  {task.subject} ·{" "}
                  {task.submission_status === "submitted"
                    ? "Terkirim"
                    : "Tugas"}
                </p>
              </div>
              <button
                aria-label={`Buka tugas ${task.title}`}
                onClick={() => goTo("Tugas")}
              >
                Buka
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="section-block" aria-labelledby="courses-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MATA PELAJARAN</p>
            <h2 id="courses-title">Perjalanan belajarmu</h2>
          </div>
          <button className="text-button" onClick={() => goTo("Materi")}>
            Semua pelajaran
          </button>
        </div>
        <div className="course-grid">
          {courses.map((course) => (
            <article className="course-card" key={course.code}>
              <div className={`course-cover ${course.tone}`}>
                <span>{course.code}</span>
                <b>{course.progress}%</b>
              </div>
              <div className="course-body">
                <p>{course.teacher}</p>
                <h3>{course.title}</h3>
                <div
                  className="progress"
                  role="progressbar"
                  aria-label={`Progres ${course.title}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={course.progress}
                >
                  <span style={{ width: `${course.progress}%` }} />
                </div>
                <small>{course.next}</small>
                <button
                  aria-label={`Lanjutkan ${course.title}`}
                  onClick={() => goTo("Materi")}
                >
                  Lanjut belajar <span aria-hidden="true">→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
