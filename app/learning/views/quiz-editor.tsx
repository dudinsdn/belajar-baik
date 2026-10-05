import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { useEffect, useState } from "react";
import { readApi, writeApi } from "../request";
import type { ModuleCatalog } from "../types";
type Question = {
  prompt: string;
  kind: string;
  competencyId: string;
  difficulty: string;
  explanation: string;
  acceptedAnswer: string;
  reviewSectionId: string;
  options: Array<{ label: string; correct: boolean }>;
};
type Detail = {
  quiz: { id: string; title: string; status: string; passing_score: number };
  competencyResults: Array<{
    attempt_id: string;
    student_id: string;
    display_name: string;
    purpose: string;
    competency_id: string;
    competency_code: string;
    total: number;
    correct: number;
    pending: number;
    started_at: string;
    completed_at: string;
  }>;
  questions: Array<
    Omit<Question, "options"> & {
      id: string;
      competency_id: string;
      accepted_answer: string | null;
      review_section_id: string | null;
      competency_code: string;
      options: Array<{ label: string; is_correct: number }>;
    }
  >;
  attempts: Array<{
    id: string;
    display_name: string;
    score: number | null;
    status: string;
  }>;
  analysis: Array<{
    id: string;
    prompt: string;
    attempts: number;
    correct: number;
    pending: number;
  }>;
  responses: Array<{
    attempt_id: string;
    question_id: string;
    prompt: string;
    answer_json: string;
    credit: number | null;
  }>;
};
type Catalog = ModuleCatalog & {
  quizzes: Array<{ id: string; title: string; status: string }>;
};
const statusLabel = (value: string) =>
  ({ draft: "Draf", published: "Terbit", archived: "Diarsipkan" })[value] ??
  value;
const kindLabel = (value: string) =>
  ({
    single: "Pilihan tunggal",
    multiple: "Pilihan jamak",
    short: "Isian",
    essay: "Uraian",
  })[value] ?? value;
const difficultyLabel = (value: string) =>
  ({ easy: "Mudah", medium: "Sedang", hard: "Sulit" })[value] ?? value;
const blank = (): Question => ({
  prompt: "",
  kind: "single",
  competencyId: "",
  difficulty: "medium",
  explanation: "",
  acceptedAnswer: "",
  reviewSectionId: "",
  options: [
    { label: "", correct: true },
    { label: "", correct: false },
  ],
});
export function QuizEditor() {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [detail, setDetail] = useState<Detail | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [title, setTitle] = useState(""),
    [cs, setCs] = useState(""),
    [material, setMaterial] = useState(""),
    [purpose, setPurpose] = useState("formative"),
    [passing, setPassing] = useState(70),
    [max, setMax] = useState(3),
    [questions, setQuestions] = useState<Question[]>([blank()]),
    [sections, setSections] = useState<
      Array<{ id: string; title: string; competency_id: string }>
    >([]),
    [grades, setGrades] = useState<
      Record<string, { credit: number; feedback: string }>
    >({});
  const [bankKd, setBankKd] = useState(""),
    [bankDifficulty, setBankDifficulty] = useState("");
  const load = () =>
    readApi<Catalog>("/api/v1/teacher/quizzes")
      .then(setCatalog)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (material)
      readApi<{ sections: typeof sections }>(`/api/v1/modules/${material}`)
        .then((x) => {
          if (!cancelled) setSections(x.sections);
        })
        .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [material]);
  useUnsavedChanges(Boolean(title || questions.some((q) => q.prompt)));
  const edit = (i: number, patch: Partial<Question>) =>
    setQuestions((q) => q.map((x, j) => (i === j ? { ...x, ...patch } : x)));
  const action = async (fn: () => Promise<Detail>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setDetail(await fn());
      setNotice("Perubahan tersimpan.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="module-editor quiz-editor">
      <h1>Asesmen diagnostik dan formatif</h1>
      <p>
        Susun kisi-kisi berdasarkan KD dan kesulitan. Uraian dinilai tutor;
        nilai tidak otomatis mengakui KD atau SKK.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!catalog ? (
        <p>Memuat penugasan…</p>
      ) : (
        <>
          <label>
            Asesmen tersimpan
            <select
              value={detail?.quiz.id ?? ""}
              disabled={busy}
              onChange={(e) =>
                e.target.value &&
                void action(() =>
                  readApi(`/api/v1/teacher/quizzes/${e.target.value}`),
                )
              }
            >
              <option value="">Pilih asesmen</option>
              {catalog.quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} · {statusLabel(q.status)}
                </option>
              ))}
            </select>
          </label>
          {detail && (
            <article>
              <h2>{detail.quiz.title}</h2>
              <p>
                Status: {statusLabel(detail.quiz.status)}. Isi tersimpan; revisi
                dibuat sebagai asesmen baru.
              </p>
              {detail.questions.map((q, i) => (
                <p key={q.id}>
                  {i + 1}. {q.prompt} · {kindLabel(q.kind)} · KD{" "}
                  {q.competency_code ?? "pemetaan lama"} ·{" "}
                  {difficultyLabel(q.difficulty)}
                </p>
              ))}
              {detail.quiz.status === "draft" && (
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    void action(() =>
                      writeApi(
                        `/api/v1/teacher/quizzes/${detail.quiz.id}`,
                        "POST",
                        { action: "publish" },
                      ),
                    )
                  }
                >
                  Terbitkan asesmen
                </button>
              )}
              <h3>Bank soal dan kisi-kisi</h3>
              <label>
                Filter KD
                <select
                  value={bankKd}
                  onChange={(e) => setBankKd(e.target.value)}
                >
                  <option value="">Semua KD</option>
                  {catalog.competencies.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.version_code} · {k.code} · {k.package_code}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Filter kesulitan
                <select
                  value={bankDifficulty}
                  onChange={(e) => setBankDifficulty(e.target.value)}
                >
                  <option value="">Semua</option>
                  <option value="easy">Mudah</option>
                  <option value="medium">Sedang</option>
                  <option value="hard">Sulit</option>
                </select>
              </label>
              {detail.questions
                .filter(
                  (q) =>
                    (!bankKd || q.competency_id === bankKd) &&
                    (!bankDifficulty || q.difficulty === bankDifficulty),
                )
                .map((q) => (
                  <div key={q.id}>
                    <p>
                      {q.prompt} · KD {q.competency_code} ·{" "}
                      {difficultyLabel(q.difficulty)}
                    </p>
                    <button
                      className="secondary"
                      type="button"
                      disabled={
                        !cs ||
                        questions.length >= 50 ||
                        !catalog.competencies.some(
                          (k) =>
                            k.id === q.competency_id &&
                            k.class_subject_id === cs,
                        )
                      }
                      onClick={() =>
                        setQuestions((x) => [
                          ...x,
                          {
                            prompt: q.prompt,
                            kind: q.kind,
                            competencyId: q.competency_id,
                            difficulty: q.difficulty,
                            explanation: q.explanation,
                            acceptedAnswer: q.accepted_answer ?? "",
                            reviewSectionId: "",
                            options: q.options.map((o) => ({
                              label: o.label,
                              correct: Boolean(o.is_correct),
                            })),
                          },
                        ])
                      }
                    >
                      Salin soal ke asesmen baru
                    </button>
                  </div>
                ))}
              <h3>Indikator hasil per KD</h3>
              <p>
                Perbandingan menggunakan percobaan terakhir per jenis asesmen
                pada KD dan penugasan yang sama. Ini indikator jawaban, bukan
                keputusan ketuntasan.
              </p>
              {Array.from(
                new Set(
                  detail.competencyResults.map(
                    (r) => r.student_id + ":" + r.competency_id,
                  ),
                ),
              ).map((key) => {
                const rows = detail.competencyResults.filter(
                    (r) => r.student_id + ":" + r.competency_id === key,
                  ),
                  d = rows.find((r) => r.purpose === "diagnostic"),
                  f = rows.find((r) => r.purpose === "formative");
                const score = (r: (typeof rows)[number] | undefined) =>
                    !r || r.pending
                      ? null
                      : Math.round((r.correct / r.total) * 100),
                  ds = score(d),
                  fs = score(f);
                return (
                  <p key={key}>
                    {rows[0].display_name} · KD {rows[0].competency_code}:
                    diagnostik {ds ?? "belum tersedia"}, formatif{" "}
                    {fs ?? "belum tersedia"}
                    {ds !== null && fs !== null
                      ? ` · perubahan ${fs - ds} poin`
                      : ""}
                  </p>
                );
              })}
              <h3>Analisis soal</h3>
              {detail.analysis.map((q) => (
                <p key={q.id}>
                  {q.prompt}: {q.correct}/{q.attempts} benar, {q.pending}{" "}
                  menunggu tutor.
                </p>
              ))}
              <h3>Tindak lanjut warga belajar</h3>
              {detail.attempts.length ? (
                detail.attempts.map((a) => (
                  <p key={a.id}>
                    {a.display_name}:{" "}
                    {a.status === "active"
                      ? "sedang mengerjakan"
                      : a.score === null
                        ? "menunggu penilaian"
                        : a.score < detail.quiz.passing_score
                          ? "pelajari ulang / remedial"
                          : "pengayaan sesuai penilaian tutor"}{" "}
                    ·{" "}
                    {a.score === null
                      ? "belum ada skor akhir"
                      : `nilai ${a.score}`}
                  </p>
                ))
              ) : (
                <p>Belum ada percobaan.</p>
              )}
              {detail.responses
                .filter((r) => r.credit === null)
                .map((r) => {
                  const key = r.attempt_id + r.question_id,
                    g = grades[key] ?? { credit: 0, feedback: "" };
                  return (
                    <fieldset key={key}>
                      <legend>{r.prompt}</legend>
                      <p>{JSON.parse(r.answer_json)}</p>
                      <label>
                        Penilaian
                        <select
                          value={g.credit}
                          onChange={(e) =>
                            setGrades((x) => ({
                              ...x,
                              [key]: { ...g, credit: Number(e.target.value) },
                            }))
                          }
                        >
                          <option value={0}>Belum tepat (0)</option>
                          <option value={1}>Tepat (1)</option>
                        </select>
                      </label>
                      <label>
                        Umpan balik
                        <textarea
                          value={g.feedback}
                          onChange={(e) =>
                            setGrades((x) => ({
                              ...x,
                              [key]: { ...g, feedback: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <button
                        className="primary"
                        disabled={busy || !g.feedback.trim()}
                        onClick={() =>
                          void action(() =>
                            writeApi(
                              `/api/v1/teacher/quizzes/${detail.quiz.id}`,
                              "POST",
                              {
                                attemptId: r.attempt_id,
                                questionId: r.question_id,
                                ...g,
                              },
                            ),
                          )
                        }
                      >
                        Simpan penilaian
                      </button>
                    </fieldset>
                  );
                })}
            </article>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action(async () => {
                const d = await writeApi<Detail>(
                  "/api/v1/teacher/quizzes",
                  "POST",
                  {
                    title,
                    classSubjectId: cs,
                    materialId: material,
                    purpose,
                    passingScore: passing,
                    maxAttempts: max,
                    questions,
                  },
                );
                setTitle("");
                setQuestions([blank()]);
                return d;
              });
            }}
          >
            <h2>Buat asesmen baru</h2>
            <fieldset disabled={busy}>
              <label>
                Judul
                <input
                  required
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                Penugasan
                <select
                  required
                  value={cs}
                  onChange={(e) => {
                    setCs(e.target.value);
                    setMaterial("");
                    setQuestions([blank()]);
                  }}
                >
                  <option value="">Pilih</option>
                  {catalog.subjects.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} · {x.class_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Modul terkait
                <select
                  value={material}
                  onChange={(e) => {
                    setSections([]);
                    setMaterial(e.target.value);
                    setQuestions((q) =>
                      q.map((x) => ({ ...x, reviewSectionId: "" })),
                    );
                  }}
                >
                  <option value="">Tanpa modul</option>
                  {catalog.materials
                    .filter(
                      (x) =>
                        x.class_subject_id === cs && x.status === "published",
                    )
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.title}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Tujuan
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                >
                  <option value="diagnostic">Diagnostik awal</option>
                  <option value="formative">Formatif</option>
                </select>
              </label>
              <label>
                Ambang nilai
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={passing}
                  onChange={(e) => setPassing(Number(e.target.value))}
                />
              </label>
              <label>
                Batas percobaan
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={max}
                  onChange={(e) => setMax(Number(e.target.value))}
                />
              </label>
              {questions.map((q, i) => (
                <fieldset key={i}>
                  <legend>Soal {i + 1}</legend>
                  <label>
                    KD
                    <select
                      required
                      value={q.competencyId}
                      onChange={(e) =>
                        edit(i, {
                          competencyId: e.target.value,
                          reviewSectionId: "",
                        })
                      }
                    >
                      <option value="">Pilih KD</option>
                      {catalog.competencies
                        .filter((x) => x.class_subject_id === cs)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.version_code} · {x.package_code} · {x.code} ·{" "}
                            {x.learner_outcome}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Jenis
                    <select
                      value={q.kind}
                      onChange={(e) => edit(i, { kind: e.target.value })}
                    >
                      <option value="single">Pilihan tunggal</option>
                      <option value="multiple">Pilihan jamak</option>
                      <option value="short">Isian</option>
                      <option value="essay">Uraian</option>
                    </select>
                  </label>
                  <label>
                    Kesulitan
                    <select
                      value={difficultyLabel(q.difficulty)}
                      onChange={(e) => edit(i, { difficulty: e.target.value })}
                    >
                      <option value="easy">Mudah</option>
                      <option value="medium">Sedang</option>
                      <option value="hard">Sulit</option>
                    </select>
                  </label>
                  <label>
                    Pertanyaan
                    <textarea
                      required
                      maxLength={4000}
                      value={q.prompt}
                      onChange={(e) => edit(i, { prompt: e.target.value })}
                    />
                  </label>
                  {["single", "multiple"].includes(q.kind) ? (
                    <>
                      {q.options.map((o, j) => (
                        <div key={j}>
                          <label>
                            Pilihan {j + 1}
                            <input
                              required
                              maxLength={1000}
                              value={o.label}
                              onChange={(e) =>
                                edit(i, {
                                  options: q.options.map((x, k) =>
                                    j === k
                                      ? { ...x, label: e.target.value }
                                      : x,
                                  ),
                                })
                              }
                            />
                          </label>
                          <label>
                            <input
                              type={q.kind === "single" ? "radio" : "checkbox"}
                              name={`key-${i}`}
                              checked={o.correct}
                              onChange={() =>
                                edit(i, {
                                  options: q.options.map((x, k) =>
                                    q.kind === "single"
                                      ? { ...x, correct: k === j }
                                      : k === j
                                        ? { ...x, correct: !x.correct }
                                        : x,
                                  ),
                                })
                              }
                            />
                            Kunci pilihan {j + 1}
                          </label>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="secondary"
                        disabled={q.options.length >= 8}
                        onClick={() =>
                          edit(i, {
                            options: [
                              ...q.options,
                              { label: "", correct: false },
                            ],
                          })
                        }
                      >
                        Tambah pilihan
                      </button>
                    </>
                  ) : q.kind === "short" ? (
                    <label>
                      Jawaban isian yang diterima
                      <input
                        required
                        maxLength={500}
                        value={q.acceptedAnswer}
                        onChange={(e) =>
                          edit(i, { acceptedAnswer: e.target.value })
                        }
                      />
                    </label>
                  ) : (
                    <p>
                      Uraian menunggu penilaian tutor. Pembahasan menjadi
                      pedoman, bukan penilaian otomatis.
                    </p>
                  )}
                  <label>
                    Pembahasan / pedoman
                    <textarea
                      required
                      maxLength={4000}
                      value={q.explanation}
                      onChange={(e) => edit(i, { explanation: e.target.value })}
                    />
                  </label>
                  <label>
                    Bagian untuk dipelajari ulang
                    <select
                      value={q.reviewSectionId}
                      onChange={(e) =>
                        edit(i, { reviewSectionId: e.target.value })
                      }
                    >
                      <option value="">Modul terkait secara umum</option>
                      {sections
                        .filter((x) => x.competency_id === q.competencyId)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.title}
                          </option>
                        ))}
                    </select>
                  </label>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        setQuestions((x) => x.filter((_, j) => i !== j))
                      }
                    >
                      Hapus soal {i + 1}
                    </button>
                  )}
                </fieldset>
              ))}
              <button
                className="secondary"
                type="button"
                disabled={questions.length >= 50}
                onClick={() => setQuestions((x) => [...x, blank()])}
              >
                Tambah soal
              </button>
              <button className="primary" type="submit">
                {busy ? "Menyimpan…" : "Simpan draf asesmen"}
              </button>
            </fieldset>
          </form>
        </>
      )}
    </section>
  );
}
