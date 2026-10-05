import { useEffect, useRef, useState } from "react";
import type { QuizAttempt, QuizData, QuizServerResult } from "../types";
import { readApi, writeApi } from "../request";
type Answer = string | string[];
export function useQuiz(
  active: string,
  initial: QuizData | null,
  setNotice: (value: string) => void,
) {
  const [chosen, setData] = useState<QuizData | null>(null),
    [catalog, setCatalog] = useState<Array<{ id: string; title: string }>>([]),
    [history, setHistory] = useState<
      Array<{ id: string; status: string; score: number | null }>
    >([]);
  const [step, setStep] = useState(0),
    [answers, setAnswers] = useState<number[]>([]),
    [result, setResult] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null),
    [selections, setSelections] = useState<Record<string, Answer>>({}),
    [serverResult, setServerResult] = useState<QuizServerResult | null>(null),
    [saving, setSaving] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const busy = useRef(false),
    generation = useRef(0);
  const data = chosen ?? initial;
  useEffect(() => {
    if (active !== "Latihan" || !initial) return;
    readApi<Array<{ id: string; title: string }>>("/api/v1/quizzes/catalog")
      .then(setCatalog)
      .catch((e) => setError(e.message));
  }, [active, initial]);
  useEffect(() => {
    if (active !== "Latihan" || !data) return;
    let cancelled = false;
    readApi<typeof history>(`/api/v1/quizzes/${data.id}/history`)
      .then(async (rows) => {
        if (cancelled) return;
        setHistory(rows);
        if (!rows.some((a) => a.status === "active")) return;
        const a = await writeApi<QuizAttempt>(
          `/api/v1/quizzes/${data.id}/attempts`,
          "POST",
        );
        if (cancelled) return;
        const restored = Object.fromEntries(
          (a.answers ?? []).map((x) => [x.question_id, x.answer]),
        );
        setSelections(restored);
        const first = data.questions.findIndex((q) => !restored[q.id]);
        setStep(first < 0 ? 0 : first);
        setAttemptId(a.id);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, data]);
  const choose = async (id: string) => {
    if (busy.current) return;
    generation.current++;
    setSaving(true);
    try {
      const next = await readApi<QuizData>(`/api/v1/quizzes/${id}`);
      setLoading(true);
      setData(next);
      setHistory([]);
      setAttemptId(null);
      setSelections({});
      setServerResult(null);
      setStep(0);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const select = async (questionId: string, answer: Answer) => {
    if (!attemptId || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    const version = generation.current;
    try {
      await writeApi(
        `/api/v1/quiz-attempts/${attemptId}/answers/${questionId}`,
        "PUT",
        { answer },
      );
      if (version === generation.current) {
        setSelections((x) => ({ ...x, [questionId]: answer }));
        setNotice("Jawaban tersimpan.");
      }
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      setNotice(message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const submit = async () => {
    if (!attemptId || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await writeApi(`/api/v1/quiz-attempts/${attemptId}/submit`, "POST");
      setServerResult(
        await readApi<QuizServerResult>(
          `/api/v1/quiz-attempts/${attemptId}/result`,
        ),
      );
      if (data)
        setHistory(
          await readApi<typeof history>(`/api/v1/quizzes/${data.id}/history`),
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const restart = async () => {
    if (!data || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const a = await writeApi<QuizAttempt>(
        `/api/v1/quizzes/${data.id}/attempts`,
        "POST",
      );
      const restored = Object.fromEntries(
        (a.answers ?? []).map((x) => [x.question_id, x.answer]),
      );
      setSelections(restored);
      setServerResult(null);
      setAttemptId(a.id);
      setStep(0);
      setHistory(
        await readApi<typeof history>(`/api/v1/quizzes/${data.id}/history`),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const viewResult = async (id: string) => {
    if (busy.current) return;
    setSaving(true);
    try {
      setServerResult(
        await readApi<QuizServerResult>(`/api/v1/quiz-attempts/${id}/result`),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return {
    loading,
    viewResult,
    data,
    catalog,
    history,
    error,
    choose,
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
