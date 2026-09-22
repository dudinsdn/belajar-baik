import { quiz } from "../data";
import type { QuizViewProps } from "./quiz-view";

export function FallbackQuiz({
  step,
  answers,
  result,
  setStep,
  setAnswers,
  setResult,
  goTo,
}: QuizViewProps) {
  const score =
    answers.filter((answer, index) => answer === quiz[index][2]).length * 20;
  const restart = () => {
    setStep(0);
    setAnswers([]);
    setResult(false);
  };
  return (
    <section className="quiz-page">
      <header className="inner-header">
        <div>
          <p className="eyebrow">LATIHAN PEMAHAMAN</p>
          <h1>Pertempuran Surabaya</h1>
          <p>
            {result
              ? "Hasil latihan"
              : `Soal ${step + 1} dari 5 · Pilih satu jawaban.`}
          </p>
        </div>
        <span className="quiz-count">{result ? score : `${step + 1} / 5`}</span>
      </header>
      <div className="quiz-card">
        {result ? (
          <>
            <h2>Nilai kamu: {score}</h2>
            <p>
              Backend latihan tidak tersedia; hasil hanya tersimpan di sesi ini.
            </p>
            <div className="quiz-actions">
              <button className="secondary" onClick={() => goTo("Materi")}>
                Buka materi
              </button>
              <button className="primary" onClick={restart}>
                Ulangi latihan
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="quiz-progress">
              <span style={{ width: `${(step + 1) * 20}%` }} />
            </div>
            <fieldset>
              <legend>{quiz[step][0]}</legend>
              {quiz[step][1].map((label, index) => (
                <label
                  className={`option ${answers[step] === index ? "selected" : ""}`}
                  key={label}
                >
                  <input
                    type="radio"
                    name="answer"
                    checked={answers[step] === index}
                    onChange={() =>
                      setAnswers([...answers.slice(0, step), index])
                    }
                  />
                  <span className="radio-letter">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            <div className="quiz-actions">
              <button className="secondary" onClick={() => goTo("Materi")}>
                ← Buka materi
              </button>
              <button
                className="primary"
                disabled={answers[step] === undefined}
                onClick={() => (step < 4 ? setStep(step + 1) : setResult(true))}
              >
                {step < 4 ? "Soal berikutnya →" : "Lihat hasil"}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
