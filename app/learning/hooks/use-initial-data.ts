import { useEffect, useState } from "react";
import type {
  AssignmentData,
  DashboardData,
  LibraryData,
  MaterialData,
  ProfileData,
  QuizData,
  TeacherSubmission,
} from "../types";
import { readApi } from "../request";

export function useInitialData(setActive: (value: string) => void) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [books, setBooks] = useState<LibraryData[]>([]);
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [assignmentAnswers, setAssignmentAnswers] = useState<
    Record<string, string>
  >({});
  const [submissions, setSubmissions] = useState<TeacherSubmission[]>([]);
  const [grades, setGrades] = useState<
    Record<string, { score: string; feedback: string }>
  >({});
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    readApi<ProfileData>("/api/v1/me", controller.signal)
      .then(async (current) => {
        setProfile(current);
        if (current.role === "teacher") {
          const items = await readApi<TeacherSubmission[]>(
            "/api/v1/teacher/submissions",
            controller.signal,
          );
          setSubmissions(items);
          setGrades(
            Object.fromEntries(
              items.map((item) => [
                item.id,
                {
                  score: item.score?.toString() ?? "",
                  feedback: item.feedback ?? "",
                },
              ]),
            ),
          );
          setActive("Penilaian");
          setStatus("ready");
          return;
        }
        const [
          dashboardData,
          materialData,
          libraryData,
          assignmentData,
          quizData,
        ] = await Promise.all([
          readApi<DashboardData>("/api/v1/dashboard", controller.signal),
          readApi<MaterialData[]>("/api/v1/materials", controller.signal),
          readApi<LibraryData[]>("/api/v1/library", controller.signal),
          readApi<AssignmentData[]>("/api/v1/assignments", controller.signal),
          readApi<QuizData>("/api/v1/quizzes/quiz_surabaya", controller.signal),
        ]);
        setDashboard(dashboardData);
        setMaterials(materialData);
        setBooks(libraryData);
        setAssignments(assignmentData);
        setQuiz(quizData);
        setAssignmentAnswers(
          Object.fromEntries(
            assignmentData.map((task) => [task.id, task.answer_text ?? ""]),
          ),
        );
        setStatus("ready");
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setMessage(error.message);
          setStatus("error");
        }
      });
    return () => controller.abort();
  }, [setActive]);

  return {
    profile,
    dashboard,
    materials,
    books,
    setBooks,
    assignments,
    setAssignments,
    assignmentAnswers,
    setAssignmentAnswers,
    submissions,
    setSubmissions,
    grades,
    setGrades,
    quiz,
    status,
    message,
  };
}
