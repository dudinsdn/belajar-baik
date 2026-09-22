import { useEffect, useState } from "react";
import type { QuizAttempt, QuizData, QuizServerResult } from "../types";
import { readApi, writeApi } from "../request";

export function useQuiz(
  active: string,
  data: QuizData | null,
  setNotice: (value: string) => void,
) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [serverResult, setServerResult] = useState<QuizServerResult | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (active !== "Latihan" || !data || attemptId) return;
    writeApi<QuizAttempt>(`/api/v1/quizzes/${data.id}/attempts`, "POST")
      .then((attempt) => setAttemptId(attempt.id))
      .catch((error) =>
        setNotice(
          error instanceof Error ? error.message : "Latihan gagal dimulai.",
        ),
      );
  }, [active, data, attemptId, setNotice]);

  const select = async (questionId: string, optionId: string) => {
    if (!attemptId) return;
    setSelections((current) => ({ ...current, [questionId]: optionId }));
    setSaving(true);
    try {
      await writeApi(
        `/api/v1/quiz-attempts/${attemptId}/answers/${questionId}`,
        "PUT",
        { selectedOptionId: optionId },
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Jawaban gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  };
  const submit = async () => {
    if (!attemptId) return;
    setSaving(true);
    try {
      await writeApi<QuizAttempt>(
        `/api/v1/quiz-attempts/${attemptId}/submit`,
        "POST",
      );
      setServerResult(
        await readApi<QuizServerResult>(
          `/api/v1/quiz-attempts/${attemptId}/result`,
        ),
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Latihan gagal dikirim.",
      );
    } finally {
      setSaving(false);
    }
  };
  const restart = () => {
    setStep(0);
    setSelections({});
    setServerResult(null);
    setAttemptId(null);
  };
  return {
    step,
    setStep,
    answers,
    setAnswers,
    result,
    setResult,
    attemptId,
    selections,
    serverResult,
    saving,
    select,
    submit,
    restart,
  };
}
