import type { Dispatch, SetStateAction } from "react";
import type { MaterialData } from "../types";

type Props = {
  material: MaterialData | undefined;
  bookmarked: boolean;
  fontSize: number;
  savingProgress: string | null;
  setFontSize: Dispatch<SetStateAction<number>>;
  saveProgress: () => void;
  goTo: (destination: string) => void;
};

export function MaterialView({
  material,
  bookmarked,
  fontSize,
  savingProgress,
  setFontSize,
  saveProgress,
  goTo,
}: Props) {
  if (!material) {
    return (
      <section className="empty-state">
        <h1>Belum ada materi</h1>
        <p>Materi yang diterbitkan tutor akan tampil di sini.</p>
      </section>
    );
  }
  return (
    <section className="reader-page">
      <header className="inner-header">
        <div>
          <p className="eyebrow">
            {material.subject.toUpperCase()} · MATERI {material.order_index}
          </p>
          <h1>{material.title}</h1>
          <p>
            {material.last_position
              ? `Terakhir dibaca: ${material.last_position}`
              : "Materi ini belum memiliki posisi baca tersimpan."}
          </p>
        </div>
        <button
          className={bookmarked ? "bookmark saved" : "bookmark"}
          disabled={savingProgress === material.id}
          onClick={saveProgress}
          aria-pressed={bookmarked}
        >
          <span aria-hidden="true">{bookmarked ? "★" : "☆"}</span>
          {savingProgress === material.id
            ? "Menyimpan…"
            : bookmarked
              ? "Progres tersimpan"
              : "Simpan progres"}
        </button>
      </header>
      <div className="reader-layout">
        <article className="reader" style={{ fontSize }}>
          <div className="reader-tools">
            <span>Ukuran teks</span>
            <button
              onClick={() => setFontSize(Math.max(16, fontSize - 2))}
              aria-label="Perkecil teks"
            >
              A−
            </button>
            <button
              onClick={() => setFontSize(Math.min(24, fontSize + 2))}
              aria-label="Perbesar teks"
            >
              A+
            </button>
          </div>
          <h2>{material.title}</h2>
          <p>{material.summary}</p>
          <div className="reader-progress">
            <span>Progres bab</span>
            <div className="progress">
              <i style={{ width: `${material.percent}%` }} />
            </div>
            <b>{material.percent}%</b>
          </div>
          <button
            className="primary reader-next"
            onClick={() => goTo("Latihan")}
          >
            Cek pemahaman <span aria-hidden="true">→</span>
          </button>
        </article>
      </div>
    </section>
  );
}
