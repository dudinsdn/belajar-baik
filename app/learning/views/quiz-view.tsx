import { useState } from "react";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import type { Dispatch, SetStateAction } from "react";
import type { QuizData, QuizServerResult } from "../types";
type Answer = string | string[];
export type QuizViewProps = {
  loading: boolean;
  viewResult: (id: string) => void;
  data: QuizData | null;
  catalog: Array<{ id: string; title: string }>;
  history: Array<{ id: string; status: string; score: number | null }>;
  error: string;
  choose: (id: string) => void;
  attemptId: string | null;
  step: number;
  answers: number[];
  selections: Record<string, Answer>;
  result: boolean;
  serverResult: QuizServerResult | null;
  saving: boolean;
  setStep: Dispatch<SetStateAction<number>>;
  setAnswers: Dispatch<SetStateAction<number[]>>;
  setResult: Dispatch<SetStateAction<boolean>>;
  select: (id: string, answer: Answer) => void;
  submit: () => void;
  restart: () => void;
  goTo: (destination: string, resourceId?: string) => void;
};
export function ResultActions({
  onMaterial,
  onRestart,
}: {
  onMaterial: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="quiz-actions">
      <button className="secondary" onClick={onMaterial}>
        Buka materi
      </button>
      <button className="primary" onClick={onRestart}>
        Ulangi latihan
      </button>
    </div>
  );
}
export function QuizView(p: QuizViewProps) {
  const [drafts, setDrafts] = useState<Record<string, Answer>>({});
  const q = p.data?.questions[p.step],
    saved = q ? p.selections[q.id] : undefined;
  const draft = q
    ? (drafts[q.id] ?? saved ?? (q.kind === "multiple" ? [] : ""))
    : "";
  const setDraft = (value: Answer) => {
    if (q) setDrafts((x) => ({ ...x, [q.id]: value }));
  };
  const dirty =
    JSON.stringify(draft) !==
    JSON.stringify(saved ?? (q?.kind === "multiple" ? [] : ""));
  useUnsavedChanges(dirty);
  if (!p.data)
    return (
      <section className="empty-state">
        <h1>Belum ada latihan</h1>
        <p>Asesmen yang diterbitkan tutor akan tampil di sini.</p>
      </section>
    );
  const move = (action: () => void) => {
    if (
      dirty &&
      !window.confirm("Jawaban belum tersimpan. Tinggalkan perubahan?")
    )
      return;
    action();
  };
  return (
    <section className="quiz-page">
      <header className="inner-header">
        <div>
          <p className="eyebrow">
            {p.data.purpose === "diagnostic"
              ? "DIAGNOSTIK AWAL"
              : "LATIHAN FORMATIF"}{" "}
            · {p.data.subject}
          </p>
          <h1>{p.data.title}</h1>
          <p>
            Ambang nilai {p.data.passing_score} · Maksimal {p.data.max_attempts}{" "}
            percobaan. Nilai ini tidak otomatis menjadi ketuntasan KD atau SKK.
          </p>
        </div>
      </header>
      {p.catalog.length > 0 && (
        <label>
          Pilih asesmen
          <select
            disabled={p.saving}
            value={p.data.id}
            onChange={(e) => move(() => p.choose(e.target.value))}
          >
            {p.catalog.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {p.error && <p role="alert">{p.error}</p>}
      <div className="quiz-card">
        {p.serverResult ? (
          <>
            <h2>
              {p.serverResult.attempt.score === null
                ? "Menunggu penilaian uraian"
                : `Nilai kamu: ${p.serverResult.attempt.score}`}
            </h2>
            <p>
              {p.serverResult.passed === null
                ? "Tutor perlu menilai uraian sebelum skor akhir tersedia."
                : p.serverResult.passed
                  ? "Ambang nilai tercapai."
                  : "Pelajari kembali bagian yang direkomendasikan sebelum mencoba lagi."}
            </p>
            {p.serverResult.answers.map((a) => (
              <div
                className={`feedback ${a.is_correct === 1 ? "correct" : "wrong"}`}
                key={a.question_id}
              >
                <h3>{a.prompt}</h3>
                <b>
                  {a.is_correct === null
                    ? "Menunggu tutor"
                    : a.is_correct === 1
                      ? "Jawaban benar"
                      : `Jawaban yang diharapkan: ${a.correct_option_label}`}
                </b>
                <p>{a.explanation}</p>
                {a.feedback && <p>Umpan balik tutor: {a.feedback}</p>}
                {a.is_correct === 0 && p.serverResult?.materialId && (
                  <button
                    className="secondary"
                    onClick={() =>
                      p.goTo(
                        "Materi",
                        p.serverResult!.materialId! +
                          (a.review_section_id
                            ? "#" + a.review_section_id
                            : ""),
                      )
                    }
                  >
                    Pelajari kembali{" "}
                    {a.review_section_id ? "bagian terkait" : "modul terkait"}
                  </button>
                )}
              </div>
            ))}
            <ResultActions
              onMaterial={() =>
                p.goTo("Materi", p.serverResult?.materialId ?? undefined)
              }
              onRestart={p.restart}
            />
          </>
        ) : p.attemptId && q ? (
          <>
            <p>
              Soal {p.step + 1} dari {p.data.questions.length} ·{" "}
              {Object.keys(p.selections).length} jawaban tersimpan
            </p>
            <fieldset disabled={p.saving}>
              <legend>{q.prompt}</legend>
              {q.kind === "single" || q.kind === "multiple" ? (
                q.options.map((o, i) => (
                  <label className="option" key={o.id}>
                    <input
                      type={q.kind === "multiple" ? "checkbox" : "radio"}
                      name={q.id}
                      checked={
                        Array.isArray(draft)
                          ? draft.includes(o.id)
                          : draft === o.id
                      }
                      onChange={() =>
                        setDraft(
                          q.kind === "multiple"
                            ? Array.isArray(draft) && draft.includes(o.id)
                              ? draft.filter((x) => x !== o.id)
                              : [...(Array.isArray(draft) ? draft : []), o.id]
                            : o.id,
                        )
                      }
                    />
                    <span className="radio-letter">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{o.label}</span>
                  </label>
                ))
              ) : (
                <label>
                  Jawaban {q.kind === "essay" ? "uraian" : "isian"}
                  <textarea
                    maxLength={4000}
                    value={typeof draft === "string" ? draft : ""}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                </label>
              )}
            </fieldset>
            <p role="status">
              {p.saving
                ? "Menyimpan…"
                : dirty
                  ? "Perubahan belum disimpan."
                  : saved
                    ? "Jawaban tersimpan di server."
                    : "Belum dijawab."}
            </p>
            <button
              className="primary"
              disabled={p.saving || !dirty || !draft.length}
              onClick={() => p.select(q.id, draft)}
            >
              Simpan jawaban
            </button>
            <div className="quiz-actions">
              <button
                className="secondary"
                disabled={p.saving || p.step === 0}
                onClick={() => move(() => p.setStep(p.step - 1))}
              >
                Soal sebelumnya
              </button>
              {p.step < p.data.questions.length - 1 ? (
                <button
                  className="secondary"
                  disabled={p.saving}
                  onClick={() => move(() => p.setStep(p.step + 1))}
                >
                  Soal berikutnya
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={
                    p.saving ||
                    dirty ||
                    Object.keys(p.selections).length !== p.data.questions.length
                  }
                  onClick={p.submit}
                >
                  Kirim & lihat pembahasan
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <p>
              {p.loading
                ? "Menyiapkan asesmen…"
                : "Mulai asesmen untuk mengerjakan, atau buka pembahasan dari riwayat."}
            </p>
            <button
              className="secondary"
              disabled={p.saving || p.loading}
              onClick={p.restart}
            >
              Mulai asesmen
            </button>
          </>
        )}
      </div>
      <h2>Riwayat percobaan</h2>
      {p.loading ? (
        <p role="status">Memuat riwayat…</p>
      ) : p.history.length ? (
        <ol>
          {p.history.map((a) => (
            <li key={a.id}>
              {a.status === "active"
                ? "Sedang dikerjakan"
                : a.score === null
                  ? "Menunggu tutor"
                  : `Nilai ${a.score}`}
              {a.status === "completed" && (
                <button
                  className="secondary"
                  disabled={p.saving}
                  onClick={() => move(() => p.viewResult(a.id))}
                >
                  Lihat pembahasan
                </button>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p>Belum ada percobaan tersimpan.</p>
      )}
    </section>
  );
}
