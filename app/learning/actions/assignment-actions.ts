import type { Dispatch, SetStateAction } from "react";
import type { AssignmentData, TeacherSubmission } from "../types";
import { writeApi } from "../request";

export function createAssignmentActions(p: {
  answers: Record<string, string>;
  submitted: number[];
  grades: Record<string, { score: string; feedback: string }>;
  setSubmitted: Dispatch<SetStateAction<number[]>>;
  setAssignments: Dispatch<SetStateAction<AssignmentData[]>>;
  setSubmissions: Dispatch<SetStateAction<TeacherSubmission[]>>;
  setSavingAssignment: Dispatch<SetStateAction<string | null>>;
  setSavingGrade: Dispatch<SetStateAction<string | null>>;
  setNotice: Dispatch<SetStateAction<string>>;
}) {
  const submit = async (id: number | string) => {
    if (typeof id === "number") {
      const next = [...new Set([...p.submitted, id])];
      p.setSubmitted(next);
      localStorage.setItem("rt-submitted", JSON.stringify(next));
      p.setNotice("Tugas tersimpan sebagai terkirim di perangkat ini.");
      return;
    }
    p.setSavingAssignment(id);
    try {
      await writeApi<AssignmentData>(
        `/api/v1/assignments/${id}/submission`,
        "PUT",
        { answerText: p.answers[id] ?? "" },
      );
      const updated = await writeApi<AssignmentData>(
        `/api/v1/assignments/${id}/submission/submit`,
        "POST",
      );
      p.setAssignments((current) =>
        current.map((task) => (task.id === id ? updated : task)),
      );
      p.setNotice("Tugas berhasil dikirim ke server lokal.");
    } catch (error) {
      p.setNotice(
        error instanceof Error ? error.message : "Tugas gagal dikirim.",
      );
    } finally {
      p.setSavingAssignment(null);
    }
  };
  const saveGrade = async (id: string) => {
    const grade = p.grades[id];
    if (!grade) return;
    p.setSavingGrade(id);
    try {
      const updated = await writeApi<TeacherSubmission>(
        `/api/v1/submissions/${id}/grade`,
        "PUT",
        { score: Number(grade.score), feedback: grade.feedback },
      );
      p.setSubmissions((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
      p.setNotice("Nilai dan umpan balik berhasil disimpan.");
    } catch (error) {
      p.setNotice(
        error instanceof Error ? error.message : "Penilaian gagal disimpan.",
      );
    } finally {
      p.setSavingGrade(null);
    }
  };
  return { submit, saveGrade };
}
