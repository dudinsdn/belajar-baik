export type WorkRow = Record<string, string | number | null>;
export type WorkDetail = {
  assignment: WorkRow;
  submission: WorkRow | null;
  history: Array<{
    id: string;
    event: string;
    snapshot_json: string;
    created_at: string;
    display_name: string;
  }>;
  files: Array<{ id: string; name: string; mime: string; size: number }>;
  competencies: WorkRow[];
};
export type SubmissionDetail = Omit<WorkDetail, "assignment" | "competencies">;
export type WorkDraft = {
  answerText: string;
  evidence: Array<{ label: string; url: string }>;
  priorLearning: boolean;
};
