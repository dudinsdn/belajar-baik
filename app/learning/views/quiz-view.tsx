import type { Dispatch, SetStateAction } from "react";
import type { QuizData, QuizServerResult } from "../types";
import { FallbackQuiz } from "./quiz-fallback-view";

export type QuizViewProps = {
  data: QuizData | null;
  attemptId: string | null;
  step: number;
  answers: number[];
  selections: Record<string, string>;
  result: boolean;
  serverResult: QuizServerResult | null;
  saving: boolean;
  setStep: Dispatch<SetStateAction<number>>;
  setAnswers: Dispatch<SetStateAction<number[]>>;
  setResult: Dispatch<SetStateAction<boolean>>;
  select: (questionId: string, optionId: string) => void;
  submit: () => void;
  restart: () => void;
  goTo: (destination: string) => void;
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

export function QuizView(props: QuizViewProps) {
  return props.data ? (
    <ServerQuiz {...props} data={props.data} />
  ) : (
    <FallbackQuiz {...props} />
  );
}

function ServerQuiz({
  data,
  attemptId,
  step,
  selections,
  serverResult,
  saving,
  setStep,
  select,
  submit,
  restart,
  goTo,
}: QuizViewProps & { data: QuizData }) {
  const question = data.questions[step];
  return (
    <section className="quiz-page">
      <header className="inner-header">
        <div>
          <p className="eyebrow">
            LATIHAN PEMAHAMAN · {data.subject.toUpperCase()}
          </p>
          <h1>{data.title}</h1>
          <p>
            {serverResult
              ? "Hasil latihan tersimpan di server."
              : `Soal ${step + 1} dari ${data.questions.length} · Jawaban disimpan otomatis.`}
          </p>
        </div>
        <span className="quiz-count">
          {serverResult
            ? serverResult.attempt.score
            : `${step + 1} / ${data.questions.length}`}
        </span>
      </header>
      <div className="quiz-card">
        {serverResult ? (
          <>
            <h2>Nilai kamu: {serverResult.attempt.score}</h2>
            <p>
              {serverResult.passed
                ? "Kamu mencapai nilai kelulusan."
                : `Nilai kelulusan adalah ${serverResult.passingScore}. Coba pelajari kembali materinya.`}
            </p>
            <div className="quiz-review">
              {serverResult.answers.map((answer) => (
                <div
                  className={
                    answer.is_correct ? "feedback correct" : "feedback wrong"
                  }
                  key={answer.question_id}
                >
                  <b>
                    {answer.is_correct
                      ? "Jawaban benar"
                      : `Jawaban benar: ${answer.correct_option_label}`}
                  </b>
                  <p>{answer.explanation}</p>
                </div>
              ))}
            </div>
            <ResultActions
              onMaterial={() => goTo("Materi")}
              onRestart={restart}
            />
          </>
        ) : attemptId && question ? (
          <>
            <div className="quiz-progress">
              <span
                style={{
                  width: `${((step + 1) / data.questions.length) * 100}%`,
                }}
              />
            </div>
            <fieldset>
              <legend>{question.prompt}</legend>
              {question.options.map((option, index) => (
                <label
                  className={`option ${selections[question.id] === option.id ? "selected" : ""}`}
                  key={option.id}
                >
                  <input
                    type="radio"
                    name="answer"
                    checked={selections[question.id] === option.id}
                    onChange={() => select(question.id, option.id)}
                  />
                  <span className="radio-letter">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>
            <div className="quiz-actions">
              <button
                className="secondary"
                onClick={() => (step ? setStep(step - 1) : goTo("Materi"))}
              >
                {step ? "← Soal sebelumnya" : "← Buka materi"}
              </button>
              <button
                className="primary"
                disabled={saving || !selections[question.id]}
                onClick={() =>
                  step < data.questions.length - 1
                    ? setStep(step + 1)
                    : submit()
                }
              >
                {saving
                  ? "Menyimpan…"
                  : step < data.questions.length - 1
                    ? "Soal berikutnya →"
                    : "Kirim & lihat hasil"}
              </button>
            </div>
          </>
        ) : (
          <p>Menyiapkan latihan…</p>
        )}
      </div>
    </section>
  );
}
