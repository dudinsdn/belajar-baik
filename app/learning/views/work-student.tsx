import { useState } from "react";
import type { WorkDetail } from "../work-types";
import { readApi } from "../request";
import type { AssignmentData } from "../types";
import { WorkReader } from "./work-reader";
export function WorkStudent({
  items,
  userId,
  initialId,
  onSaved,
}: {
  items: AssignmentData[];
  userId: string;
  initialId?: string | null;
  onSaved?: (detail: WorkDetail) => void;
}) {
  const [selected, setSelected] = useState(initialId ?? ""),
    [portfolio, setPortfolio] = useState<Array<{
      assignmentId: string;
      title: string;
      score: number;
    }> | null>(null),
    [portfolioNotice, setPortfolioNotice] = useState("");
  const loadPortfolio = async () => {
    setPortfolioNotice("Memuat portofolio…");
    try {
      setPortfolio(await readApi("/api/v1/work/portfolio"));
      setPortfolioNotice("Portofolio dimuat dari server.");
    } catch (e) {
      setPortfolioNotice((e as Error).message);
    }
  };
  return (
    <section className="work-student">
      <h1>Tugas dan portofolio</h1>
      <p>Pilih karya. Draf otomatis disimpan saat koneksi tersedia.</p>
      {items.length ? (
        <label>
          Pilih tugas
          <select
            value={selected}
            onChange={(e) => {
              if (
                window.dispatchEvent(
                  new Event("rt:navigate", { cancelable: true }),
                )
              )
                setSelected(e.target.value);
            }}
          >
            <option value="">Pilih karya…</option>
            {items.map((a) => (
              <option value={a.id} key={a.id}>
                {a.title} ·{" "}
                {{
                  not_started: "Belum mulai",
                  draft: "Draf / revisi",
                  submitted: "Menunggu tutor",
                  graded: "Sudah dinilai",
                }[a.submission_status] ?? a.submission_status}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p>Belum ada tugas dengan rubrik yang diterbitkan.</p>
      )}
      <button onClick={() => void loadPortfolio()}>
        Lihat / muat ulang portofolio
      </button>
      <p role="status">{portfolioNotice}</p>
      {portfolio && (
        <section>
          <h2>Karya terbaik</h2>
          {portfolio.length ? (
            <ul>
              {portfolio.map((p) => (
                <li key={p.assignmentId}>
                  <button
                    onClick={() => {
                      if (
                        window.dispatchEvent(
                          new Event("rt:navigate", { cancelable: true }),
                        )
                      )
                        setSelected(p.assignmentId);
                    }}
                  >
                    {p.title} · nilai {p.score}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>Belum ada karya yang dipilih untuk portofolio.</p>
          )}
        </section>
      )}
      {selected && items.some((a) => a.id === selected) && (
        <WorkReader
          key={selected}
          id={selected}
          userId={userId}
          onSaved={onSaved}
        />
      )}
    </section>
  );
}
