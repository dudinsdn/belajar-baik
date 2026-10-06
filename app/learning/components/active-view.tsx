import { MentoringView } from "../views/mentoring-view";
import { AssignmentsWorkspace } from "../views/assignments-workspace";
import { readApi } from "../request";
import type { DashboardData } from "../types";
import type { Dispatch, SetStateAction } from "react";
import type { useInitialData } from "../hooks/use-initial-data";
import type { usePreferences } from "../hooks/use-preferences";
import type { useQuiz } from "../hooks/use-quiz";
import { DashboardView } from "../views/dashboard-view";
import { GradingView } from "../views/grading-view";
import { LibraryView } from "../views/library-view";
import { ModuleReader } from "../views/module-reader";
import { ModuleEditor } from "../views/module-editor";
import { ProfileView } from "../views/profile-view";
import { QuizEditor } from "../views/quiz-editor";
import { QuizView } from "../views/quiz-view";
import { PlanningView } from "../views/planning-view";
import { StudentPlansView } from "../views/student-plans-view";
import { CurriculumView } from "../views/curriculum-view";

type Data = ReturnType<typeof useInitialData>;
type Preferences = ReturnType<typeof usePreferences>;
type Quiz = ReturnType<typeof useQuiz>;
type Actions = {
  library: {
    toggle: (id: string) => void;
    advance: (id: string) => void;
    saveMaterial: () => void;
  };
  assignment: {
    submit: (id: string) => void;
    saveGrade: (id: string) => void;
  };
};
type Props = {
  active: string;
  resourceId: string | null;
  displayName: string;
  initials: string;
  bookmarked: boolean;
  fontSize: number;
  query: string;
  savingProgress: string | null;
  savingAssignment: string | null;
  savingGrade: string | null;
  shownLibrary: Array<{
    id: string;
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
  goTo: (value: string, resourceId?: string) => void;
};

export function ActiveView(p: Props) {
  if (p.active === "Pendampingan" && p.data.profile?.role === "teacher")
    return <MentoringView goTo={p.goTo} />;
  if (p.active === "Rencana")
    return p.data.profile?.role === "teacher" ? (
      <PlanningView initialScope={p.resourceId} />
    ) : (
      <StudentPlansView goTo={p.goTo} />
    );
  if (p.active === "Kurikulum") return <CurriculumView />;
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
    return p.data.profile?.role === "teacher" ? (
      <ModuleEditor />
    ) : (
      <ModuleReader
        key={p.resourceId ?? "all"}
        materials={d.materials}
        initialId={p.resourceId?.split("#")[0] ?? null}
        initialSection={p.resourceId?.split("#")[1]}
        onSaved={async (module) => {
          d.setMaterials((items) =>
            items.map((m) =>
              m.id === module.material.id
                ? {
                    ...m,
                    percent: module.progress?.percent ?? 0,
                    last_position:
                      module.sections.find(
                        (s) => s.id === module.progress?.last_position,
                      )?.title ??
                      module.progress?.last_position ??
                      null,
                  }
                : m,
            ),
          );
          d.setDashboard(await readApi<DashboardData>("/api/v1/dashboard"));
        }}
      />
    );
  if (p.active === "Latihan")
    return d.profile?.role === "teacher" ? (
      <QuizEditor />
    ) : (
      <QuizView
        key={q.attemptId ?? "preparing"}
        loading={q.loading}
        viewResult={q.viewResult}
        choose={q.choose}
        catalog={q.catalog}
        history={q.history}
        error={q.error}
        data={q.data}
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
      <AssignmentsWorkspace
        data={d}
        resourceId={p.resourceId}
        saving={p.savingAssignment}
        submit={p.actions.assignment.submit}
        setNotice={p.setNotice}
      />
    );
  if (p.active === "Penilaian")
    return (
      <GradingView
        key={p.resourceId ?? "all"}
        initialId={p.resourceId}
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
