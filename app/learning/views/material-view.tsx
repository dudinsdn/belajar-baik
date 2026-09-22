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
  return (
    <section className="reader-page">
      <header className="inner-header">
        <div>
          <p className="eyebrow">
            {material
              ? `${material.subject.toUpperCase()} · MATERI ${material.order_index}`
              : "SEJARAH INDONESIA · BAB 3"}
          </p>
          <h1>{material?.title ?? "Mempertahankan Kemerdekaan"}</h1>
          <p>
            {material?.last_position
              ? `Terakhir dibaca: ${material.last_position}`
              : (material?.summary ?? "Terakhir dibaca: halaman 12 dari 28")}
          </p>
        </div>
        <button
          className={bookmarked ? "bookmark saved" : "bookmark"}
          disabled={savingProgress === material?.id}
          onClick={saveProgress}
          aria-pressed={bookmarked}
        >
          <span aria-hidden="true">{bookmarked ? "★" : "☆"}</span>
          {savingProgress === material?.id
            ? "Menyimpan…"
            : bookmarked
              ? "Progres tersimpan"
              : "Simpan progres"}
        </button>
      </header>
      <div className="reader-layout">
        <aside className="toc">
          <p className="eyebrow">DAFTAR ISI</p>
          <button className="done">✓ Proklamasi</button>
          <button className="done">✓ Kedatangan Sekutu</button>
          <button className="current">3. Pertempuran Surabaya</button>
          <button>4. Diplomasi Indonesia</button>
          <button>5. Pengakuan Kedaulatan</button>
        </aside>
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
          <p className="chapter">03</p>
          <h2>Pertempuran Surabaya</h2>
          <p>
            Pertempuran Surabaya merupakan salah satu peristiwa penting dalam
            sejarah perjuangan mempertahankan kemerdekaan Indonesia. Perlawanan
            rakyat menunjukkan bahwa kemerdekaan bukan sekadar pernyataan,
            tetapi sesuatu yang akan dipertahankan bersama.
          </p>
          <aside className="key-note">
            <b>Gagasan utama</b>
            <p>
              Perjuangan terjadi melalui perlawanan fisik sekaligus diplomasi
              untuk memperoleh pengakuan dunia.
            </p>
          </aside>
          <h3>Mengapa peristiwa ini penting?</h3>
          <p>
            Semangat perlawanan menarik perhatian internasional dan memperkuat
            legitimasi Republik Indonesia. Tanggal 10 November kemudian
            diperingati sebagai Hari Pahlawan.
          </p>
          <div className="reader-progress">
            <span>Progres bab</span>
            <div className="progress">
              <i style={{ width: "43%" }} />
            </div>
            <b>43%</b>
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
