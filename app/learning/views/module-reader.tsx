import { useEffect, useRef, useState } from "react";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { moduleText } from "../module-text";
import { readApi, writeApi } from "../request";
import type { ModuleDetail, MaterialData } from "../types";

export function ModuleReader({
  materials,
  initialId,
  initialSection,
  onSaved,
}: {
  materials: MaterialData[];
  initialId: string | null;
  initialSection?: string;
  onSaved: (d: ModuleDetail) => Promise<void>;
}) {
  const [id, setId] = useState(initialId ?? materials[0]?.id ?? "");
  const [data, setData] = useState<ModuleDetail | null>(null);
  const [sectionId, setSectionId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [font, setFont] = useState(18);
  const [reading, setReading] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const [note, setNote] = useState("");
  useUnsavedChanges(!!note.trim());
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    readApi<ModuleDetail>(`/api/v1/modules/${id}`, controller.signal)
      .then((d) => {
        if (controller.signal.aborted) return;
        setData(d);
        setSectionId(
          initialSection && d.sections.some((s) => s.id === initialSection)
            ? initialSection
            : d.sections.some((s) => s.id === d.progress?.last_position)
              ? d.progress!.last_position!
              : (d.sections[0]?.id ?? ""),
        );
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [id, reload, initialSection]);
  const section = data?.sections.find((s) => s.id === sectionId);
  async function update(action: string, target = sectionId) {
    setBusy(true);
    setError("");
    setNotice("");
    if (action === "visit") {
      setSectionId(target);
      window.requestAnimationFrame(() => articleRef.current?.focus());
    }
    try {
      const d = await writeApi<ModuleDetail>(`/api/v1/modules/${id}`, "PUT", {
        action,
        sectionId: target,
        bookmarked: !section?.bookmarked,
        note,
      });
      setData(d);
      setSectionId(target);

      setNotice(
        action === "help"
          ? "Pertanyaan tersimpan untuk tutor."
          : "Posisi dan progres tersimpan.",
      );
      if (action === "help") setNote("");
      try {
        await onSaved(d);
      } catch {
        setNotice(
          "Perubahan tersimpan. Muat ulang dasbor untuk melihat progres terbaru.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }
  if (!materials.length)
    return (
      <section className="empty-state">
        <h1>Belum ada materi</h1>
        <p>Materi yang diterbitkan tutor akan tampil di sini.</p>
      </section>
    );
  return (
    <section className={`reader-page ${reading ? "module-reading" : ""}`}>
      <h1>Modul belajar</h1>
      <label>
        Modul
        <select
          value={id}
          disabled={busy || !!note.trim()}
          onChange={(e) => {
            setData(null);
            setError("");
            setNotice("");
            setNote("");
            setId(e.target.value);
          }}
        >
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert">
          {error}{" "}
          {!data && (
            <button
              onClick={() => {
                setError("");
                setReload((r) => r + 1);
              }}
            >
              Coba lagi
            </button>
          )}
        </p>
      )}
      {!data && !error && <p role="status">Memuat isi modul…</p>}
      <p role="status">{busy ? "Menyimpan…" : notice}</p>
      {data && (
        <>
          <header className="inner-header">
            <div>
              <p>{data.material.subject}</p>
              <h2>{data.material.title}</h2>
              <p>{data.material.summary}</p>
            </div>
            <a
              className="module-download"
              href={`/api/v1/modules/${id}/download`}
              download
            >
              Unduh teks modul
            </a>
          </header>
          <details>
            <summary>Salin teks untuk dibaca tanpa koneksi</summary>
            <textarea
              aria-label="Teks lengkap modul"
              readOnly
              rows={10}
              value={moduleText(data)}
            />
          </details>
          <div className="reader-tools">
            <button
              onClick={() => setFont((f) => Math.max(16, f - 2))}
              aria-label="Perkecil teks"
            >
              A−
            </button>
            <button
              onClick={() => setFont((f) => Math.min(28, f + 2))}
              aria-label="Perbesar teks"
            >
              A+
            </button>
            <button aria-pressed={reading} onClick={() => setReading(!reading)}>
              Mode baca
            </button>
          </div>
          <p>
            Estimasi: {data.settings?.estimated_minutes ?? "Belum diatur"}{" "}
            menit.
          </p>
          <p>
            Bobot SKK rencana modul:{" "}
            {data.settings?.planned_skk ?? "Belum ditetapkan"}. Pengakuan
            pencapaian memerlukan bukti dan validasi tutor.
          </p>
          {data.allocations.map((a) => (
            <p key={a.package_code}>
              Paket {a.package_code}: {a.planned_skk} SKK terencana untuk mata
              pelajaran; bukan bobot atau SKK tercapai dari modul ini.
            </p>
          ))}
          <p>
            {data.sections.length
              ? "Progres bagian"
              : "Progres historis sebelum reader per bagian"}
            : {data.progress?.percent ?? 0}%. Penyelesaian bagian bukan
            pengakuan kompetensi atau SKK.
          </p>
          {data.sections.length ? (
            <div className="module-layout">
              <nav aria-label="Daftar isi modul">
                {data.sections.map((s) => (
                  <button
                    key={s.id}
                    disabled={busy || !!note.trim()}
                    aria-current={s.id === sectionId ? "step" : undefined}
                    onClick={() => void update("visit", s.id)}
                  >
                    {s.title} {s.completed_at ? "· Selesai" : ""}{" "}
                    {s.bookmarked ? "· Ditandai" : ""}
                  </button>
                ))}
              </nav>
              {section && (
                <article
                  ref={articleRef}
                  tabIndex={-1}
                  className="reader"
                  style={{ fontSize: font }}
                >
                  <h2>{section.title}</h2>
                  <p>
                    KD {section.competency_code}: {section.learner_outcome}
                  </p>
                  <p>
                    Mode:{" "}
                    {section.mode === "independent"
                      ? "Mandiri"
                      : section.mode === "tutorial"
                        ? "Tutorial"
                        : "Tatap muka"}
                  </p>
                  {section.media_url && (
                    <ModuleMedia
                      key={`${section.id}:${section.media_url}`}
                      title={section.title}
                      url={section.media_url}
                      type={section.media_type}
                    />
                  )}
                  {section.media_url && (
                    <p>Media dimuat hanya saat diputar. Transkrip:</p>
                  )}
                  <div className="module-body">{section.body}</div>
                  <div className="reader-tools">
                    <button
                      disabled={busy || !!section.completed_at}
                      onClick={() => void update("complete")}
                    >
                      {section.completed_at
                        ? "Bagian selesai"
                        : "Tandai bagian selesai"}
                    </button>
                    <button
                      disabled={busy}
                      aria-pressed={!!section.bookmarked}
                      onClick={() => void update("bookmark")}
                    >
                      {section.bookmarked
                        ? "Hapus penanda"
                        : "Tandai bagian penting"}
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void update("help");
                    }}
                  >
                    <label>
                      Pertanyaan untuk tutor pada bagian ini
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        required
                        disabled={busy}
                        maxLength={2000}
                      />
                    </label>
                    <button disabled={busy || !note.trim()}>
                      Minta bantuan tutor
                    </button>
                  </form>
                </article>
              )}
            </div>
          ) : (
            <article className="reader" style={{ fontSize: font }}>
              <p>
                Materi lama belum dibagi menjadi bagian. Isi dari database
                ditampilkan utuh; progres lama tetap disimpan.
              </p>
              <div className="module-body">{data.material.content}</div>
            </article>
          )}
        </>
      )}
    </section>
  );
}

function ModuleMedia({
  title,
  url,
  type,
}: {
  title: string;
  url: string;
  type: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const props = {
    controls: true,
    preload: "none",
    src: url,
    "aria-label": title,
    onError: () => {
      setFailed(true);
      setWaiting(false);
    },
    onWaiting: () => setWaiting(true),
    onPlaying: () => {
      setFailed(false);
      setWaiting(false);
    },
    onCanPlay: () => setWaiting(false),
  };
  return (
    <>
      {type === "audio" ? (
        <audio key={attempt} {...props} />
      ) : (
        <video key={attempt} {...props} playsInline />
      )}
      {waiting && !failed && (
        <p role="status">Sedang memuat media. Transkrip tetap dapat dibaca.</p>
      )}
      {failed && (
        <div>
          <p role="alert">
            Media tidak dapat diputar. Periksa koneksi atau hubungi tutor jika
            sumber tidak tersedia. Transkrip tetap dapat dibaca.
          </p>
          <button
            onClick={() => {
              setFailed(false);
              setWaiting(false);
              setAttempt(attempt + 1);
            }}
          >
            Coba lagi media
          </button>
        </div>
      )}
    </>
  );
}
