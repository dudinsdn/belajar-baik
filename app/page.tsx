"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createAssignmentActions } from "./learning/actions/assignment-actions";
import { createLibraryActions } from "./learning/actions/library-actions";
import { ActiveView } from "./learning/components/active-view";
import {
  AccessState,
  LearningShell,
} from "./learning/components/learning-shell";
import { studentNav } from "./learning/data";
import { useInitialData } from "./learning/hooks/use-initial-data";
import { usePreferences } from "./learning/hooks/use-preferences";
import { useQuiz } from "./learning/hooks/use-quiz";

export default function Home() {
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [active, setActive] = useState("Beranda");
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [savingProgress, setSavingProgress] = useState<string | null>(null);
  const [savingAssignment, setSavingAssignment] = useState<string | null>(null);
  const [savingGrade, setSavingGrade] = useState<string | null>(null);
  const contentRef = useRef<HTMLElement>(null);
  const data = useInitialData(setActive);
  const preferences = usePreferences(setNotice);
  const quiz = useQuiz(active, data.quiz, setNotice);

  const goTo = useCallback((destination: string, id?: string) => {
    if (!window.dispatchEvent(new Event("rt:navigate", { cancelable: true })))
      return;
    setResourceId(id ?? null);
    setBookmarked(false);
    setActive(destination);
    setMenuOpen(false);
    window.requestAnimationFrame(() => contentRef.current?.focus());
  }, []);

  useEffect(() => {
    const closeMenu = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeMenu);
    return () => window.removeEventListener("keydown", closeMenu);
  }, []);

  const libraryActions = createLibraryActions({
    books: data.books,
    setBooks: data.setBooks,
    materials: resourceId
      ? data.materials.filter((m) => m.id === resourceId)
      : data.materials,
    setBookmarked,
    setSaving: setSavingProgress,
    setNotice,
  });
  const assignmentActions = createAssignmentActions({
    answers: data.assignmentAnswers,
    grades: data.grades,
    setAssignments: data.setAssignments,
    setSubmissions: data.setSubmissions,
    setSavingAssignment,
    setSavingGrade,
    setNotice,
  });
  const displayName = data.profile?.displayName ?? "Pengguna";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const shownLibrary = data.books
    .map((book) => ({
      id: book.id,
      code: book.subject_code ?? "BUK",
      title: book.title,
      author: book.author,
      progress: book.percent,
      bookmarked: Boolean(book.bookmarked),
    }))
    .filter((book) =>
      `${book.title} ${book.author}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  const navigation =
    data.profile?.role === "teacher"
      ? ["Kurikulum", "Rencana", "Materi", "Penilaian", "Profil"]
      : [...studentNav, "Kurikulum", "Rencana"];

  if (data.status !== "ready")
    return <AccessState status={data.status} message={data.message} />;

  return (
    <LearningShell
      active={active}
      menuOpen={menuOpen}
      displayName={displayName}
      initials={initials}
      notice={notice}
      navigation={navigation}
      profile={data.profile}
      pendingTaskCount={
        data.assignments.filter((task) =>
          ["not_started", "draft"].includes(task.submission_status),
        ).length
      }
      contentRef={contentRef}
      goTo={goTo}
      setMenuOpen={setMenuOpen}
      setNotice={setNotice}
    >
      <ActiveView
        resourceId={resourceId}
        active={active}
        displayName={displayName}
        initials={initials}
        bookmarked={bookmarked}
        fontSize={fontSize}
        query={query}
        savingProgress={savingProgress}
        savingAssignment={savingAssignment}
        savingGrade={savingGrade}
        shownLibrary={shownLibrary}
        data={data}
        preferences={preferences}
        quiz={quiz}
        actions={{ library: libraryActions, assignment: assignmentActions }}
        setQuery={setQuery}
        setFontSize={setFontSize}
        setNotice={setNotice}
        goTo={goTo}
      />
    </LearningShell>
  );
}
