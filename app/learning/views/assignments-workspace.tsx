import type { useInitialData } from "../hooks/use-initial-data";
import { readApi } from "../request";
import type { DashboardData } from "../types";
import { WorkStudent } from "./work-student";
import { AssignmentsView } from "./assignments-view";
type Props = {
  data: ReturnType<typeof useInitialData>;
  resourceId: string | null;
  saving: string | null;
  submit: (id: string) => void;
  setNotice: (message: string) => void;
};
export function AssignmentsWorkspace({
  data,
  resourceId,
  saving,
  submit,
  setNotice,
}: Props) {
  return (
    <>
      <WorkStudent
        items={data.assignments.filter((a) => a.managed_work)}
        userId={data.profile!.id}
        initialId={resourceId}
        onSaved={(detail) => {
          data.setAssignments((items) =>
            items.map((a) =>
              a.id === detail.assignment.id
                ? {
                    ...a,
                    submission_status: String(
                      detail.submission?.status ?? "not_started",
                    ),
                    answer_text: String(detail.submission?.answer_text ?? ""),
                    score:
                      detail.submission?.score === null
                        ? null
                        : Number(detail.submission?.score),
                    feedback:
                      detail.submission?.feedback === null
                        ? null
                        : String(detail.submission?.feedback),
                  }
                : a,
            ),
          );
          if (
            data.assignments.find((a) => a.id === detail.assignment.id)
              ?.submission_status !== detail.submission?.status
          )
            void readApi<DashboardData>("/api/v1/dashboard")
              .then(data.setDashboard)
              .catch((e) => setNotice(e.message));
        }}
      />
      {data.assignments.some(
        (a) => !a.managed_work && (!resourceId || a.id === resourceId),
      ) && (
        <AssignmentsView
          items={
            resourceId
              ? data.assignments.filter(
                  (a) => a.id === resourceId && !a.managed_work,
                )
              : data.assignments.filter((a) => !a.managed_work)
          }
          answers={data.assignmentAnswers}
          saving={saving}
          setAnswers={data.setAssignmentAnswers}
          submit={submit}
        />
      )}
    </>
  );
}
