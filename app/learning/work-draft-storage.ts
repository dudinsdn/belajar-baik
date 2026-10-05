import type { WorkDetail, WorkDraft, SubmissionDetail } from "./work-types";
export function initialWorkDraft(d: WorkDetail): WorkDraft {
  return {
    answerText: String(d.submission?.answer_text ?? ""),
    evidence: JSON.parse(String(d.submission?.evidence_json ?? "[]")),
    priorLearning:
      !!d.submission?.prior_learning || d.assignment.kind === "prior_learning",
  };
}
export function readWorkQueue(
  key: string,
): { draft: WorkDraft; version: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const e = JSON.parse(raw);
    if (
      !e.draft ||
      typeof e.draft.answerText !== "string" ||
      !Array.isArray(e.draft.evidence) ||
      typeof e.draft.priorLearning !== "boolean" ||
      !Number.isSafeInteger(e.version) ||
      e.version < 0
    )
      return null;
    if (
      e.draft.evidence.some(
        (l: unknown) =>
          !l ||
          typeof l !== "object" ||
          typeof (l as { label: unknown }).label !== "string" ||
          typeof (l as { url: unknown }).url !== "string",
      )
    )
      return null;
    return e;
  } catch {
    return null;
  }
}
export function persistWorkQueue(
  key: string,
  draft: WorkDraft,
  version: number,
) {
  try {
    localStorage.setItem(key, JSON.stringify({ draft, version }));
    return true;
  } catch {
    return false;
  }
}
export function clearWorkQueue(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* Server remains authoritative. */
  }
}
export async function uploadWorkEvidence(
  id: string,
  version: number,
  file: File,
) {
  const form = new FormData();
  form.set("file", file);
  form.set("version", String(version));
  const response = await fetch(`/api/v1/work/submissions/${id}/files`, {
    method: "POST",
    body: form,
  });
  const body = (await response.json()) as {
    data: SubmissionDetail;
    error?: { message: string };
  };
  if (!response.ok) throw new Error(body.error?.message ?? "Unggahan gagal.");
  return body.data;
}
