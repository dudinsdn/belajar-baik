import type { Dispatch, SetStateAction } from "react";
import type { useInitialData } from "../hooks/use-initial-data";
import type { usePreferences } from "../hooks/use-preferences";
import type { useQuiz } from "../hooks/use-quiz";
import { AssignmentsView } from "../views/assignments-view";
import { DashboardView } from "../views/dashboard-view";
import { GradingView } from "../views/grading-view";
import { LibraryView } from "../views/library-view";
import { MaterialView } from "../views/material-view";
import { ProfileView } from "../views/profile-view";
import { QuizView } from "../views/quiz-view";

type Data = ReturnType<typeof useInitialData>;
type Preferences = ReturnType<typeof usePreferences>;
type Quiz = ReturnType<typeof useQuiz>;
type Actions = {
  library: {
    toggle: (id: number | string) => void;
    advance: (id: string) => void;
    saveMaterial: () => void;
  };
  assignment: {
    submit: (id: number | string) => void;
    saveGrade: (id: string) => void;
  };
};
type Props = {
  active: string;
  displayName: string;
  initials: string;
  bookmarked: boolean;
  fontSize: number;
  query: string;
  savingProgress: string | null;
  savingAssignment: string | null;
  savingGrade: string | null;
  shownLibrary: Array<{
    id: number | string;
    code: string;
    title: string;
    author: string;
    progress: number;
    bookmarked: boolean;
  }>;
  data: Data;
  preferences: Preferences;
  quiz: Quiz;
  actions: Actions;
  setQuery: (value: string) => void;
  setFontSize: Dispatch<SetStateAction<number>>;
  setNotice: Dispatch<SetStateAction<string>>;
  goTo: (value: string) => void;
};

export function ActiveView(p: Props) {
  const d = p.data;
  const pref = p.preferences;
  const q = p.quiz;
  if (p.active === "Beranda")
    return (
      <DashboardView
        displayName={p.displayName}
        dashboard={d.dashboard}
        goTo={p.goTo}
      />
    );
  if (p.active === "Materi")
    return (
      <MaterialView
        material={d.materials[0]}
        bookmarked={p.bookmarked}
        fontSize={p.fontSize}
        savingProgress={p.savingProgress}
        setFontSize={p.setFontSize}
        saveProgress={p.actions.library.saveMaterial}
        goTo={p.goTo}
      />
    );
  if (p.active === "Latihan")
    return (
      <QuizView
        data={d.quiz}
        attemptId={q.attemptId}
        step={q.step}
        answers={q.answers}
        selections={q.selections}
        result={q.result}
        serverResult={q.serverResult}
        saving={q.saving}
        setStep={q.setStep}
        setAnswers={q.setAnswers}
        setResult={q.setResult}
        select={q.select}
        submit={q.submit}
        restart={q.restart}
        goTo={p.goTo}
      />
    );
  if (p.active === "Tugas")
    return (
      <AssignmentsView
        items={d.assignments}
        submitted={pref.submitted}
        answers={d.assignmentAnswers}
        saving={p.savingAssignment}
        setAnswers={d.setAssignmentAnswers}
        submit={p.actions.assignment.submit}
      />
    );
  if (p.active === "Penilaian")
    return (
      <GradingView
        items={d.submissions}
        grades={d.grades}
        saving={p.savingGrade}
        setGrades={d.setGrades}
        save={p.actions.assignment.saveGrade}
      />
    );
  if (p.active === "Perpustakaan")
    return (
      <LibraryView
        books={p.shownLibrary}
        query={p.query}
        saving={p.savingProgress}
        setQuery={p.setQuery}
        advance={p.actions.library.advance}
        toggle={p.actions.library.toggle}
        goTo={p.goTo}
      />
    );
  if (p.active === "Profil")
    return (
      <ProfileView
        initials={p.initials}
        displayName={p.displayName}
        profile={d.profile}
        dashboard={d.dashboard}
        dailyGoal={pref.dailyGoal}
        reminders={pref.reminders}
        readingMode={pref.readingMode}
        setDailyGoal={pref.setDailyGoal}
        setReminders={pref.setReminders}
        setReadingMode={pref.setReadingMode}
        setFontSize={p.setFontSize}
        resetLocal={pref.reset}
        setNotice={p.setNotice}
      />
    );
  return null;
}
