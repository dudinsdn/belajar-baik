import { longDate, shortDateTime } from "../data";
import type { DashboardData } from "../types";

type Props = {
  displayName: string;
  dashboard: DashboardData | null;
  goTo: (destination: string) => void;
};

export function DashboardView({ displayName, dashboard, goTo }: Props) {
  const current = dashboard?.continueMaterial;
  const tasks = dashboard?.assignments ?? [];

  return (
    <>
      <section className="welcome">
        <div>
          <p className="eyebrow">{longDate.format(new Date()).toUpperCase()}</p>
          <h1>Selamat pagi, {displayName.split(" ")[0]}!</h1>
          <p>
            Mulai dari yang kecil. Satu materi hari ini adalah satu langkah
            maju.
          </p>
        </div>
      </section>
      {current ? (
        <section className="continue-card" aria-labelledby="continue-title">
          <div className="continue-copy">
            <p className="eyebrow">LANJUTKAN BELAJAR</p>
            <h2 id="continue-title">{current.title}</h2>
            <p>
              {current.subject}
              {current.last_position ? ` · ${current.last_position}` : ""}
            </p>
            <div className="progress-row">
              <div className="progress">
                <span style={{ width: `${current.percent}%` }} />
              </div>
              <b>{current.percent}%</b>
            </div>
          </div>
          <button className="primary" onClick={() => goTo("Materi")}>
            Lanjutkan materi <span aria-hidden="true">→</span>
          </button>
        </section>
      ) : (
        <section className="empty-state" aria-labelledby="continue-title">
          <h2 id="continue-title">Belum ada progres materi</h2>
          <p>Materi yang mulai dipelajari akan tampil di sini.</p>
          <button className="primary" onClick={() => goTo("Materi")}>
            Lihat materi
          </button>
        </section>
      )}
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
        {!tasks.length && (
          <div className="empty-state">
            <h3>Belum ada tugas</h3>
            <p>Tugas yang diterbitkan tutor akan tampil di sini.</p>
          </div>
        )}
      </section>
    </>
  );
}
