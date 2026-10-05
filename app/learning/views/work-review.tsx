import { WorkGradeFields } from "../components/work-grade-fields";
import { useEffect, useState } from "react";
import { readApi, writeApi } from "../request";
import type { SubmissionDetail, WorkRow } from "../work-types";
import { WorkHistory } from "../components/work-history";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
export function WorkReview({
  id,
  assignment,
  onSaved,
}: {
  id: string;
  assignment: WorkRow;
  onSaved: (result: SubmissionDetail) => Promise<void>;
}) {
  const [detail, setDetail] = useState<SubmissionDetail | null>(null),
    [criteria, setCriteria] = useState<
      Array<{ score: number; comment: string }>
    >([]),
    [feedback, setFeedback] = useState(""),
    [reason, setReason] = useState(""),
    [decision, setDecision] = useState("supported"),
    [notice, setNotice] = useState("Memuat karya…"),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);
  useEffect(() => {
    const c = new AbortController();
    readApi<SubmissionDetail>(`/api/v1/work/submissions/${id}`, c.signal)
      .then((d) => {
        setDetail(d);
        const lastGrade = [...d.history]
          .reverse()
          .find((h) => h.event === "grade");
        const previous = lastGrade
          ? JSON.parse(lastGrade.snapshot_json).request
          : null;
        setCriteria(
          previous?.criteria ??
            JSON.parse(String(assignment.rubric_json)).map(() => ({
              score: 0,
              comment: "",
            })),
        );
        setFeedback(String(d.submission?.feedback ?? ""));
        setDecision(previous?.evidenceDecision ?? "supported");
        setNotice("Karya dimuat. Periksa bukti sebelum menilai.");
      })
      .catch((e) => {
        if (!c.signal.aborted) setNotice(e.message);
      });
    return () => c.abort();
  }, [id, assignment.rubric_json]);
  const act = async (action: string) => {
    setBusy(true);
    try {
      const d = await writeApi<SubmissionDetail>(
        `/api/v1/work/submissions/${id}`,
        "PUT",
        {
          action,
          version: detail?.submission?.version,
          criteria,
          feedback,
          reason,
          evidenceDecision: decision,
        },
      );
      setDetail(d);
      setDirty(false);
      setNotice(
        action === "revise"
          ? "Revisi diminta; histori sebelumnya tetap tersedia."
          : "Penilaian tersimpan dengan histori.",
      );
      await onSaved(d);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="grading-card work-card">
      <h2>Periksa {String(assignment.title)}</h2>
      <p role="status">{notice}</p>
      {detail && (
        <>
          <p>
            Status:{" "}
            {{
              draft: "Revisi diminta",
              submitted: "Menunggu penilaian",
              graded: "Sudah dinilai",
            }[String(detail.submission?.status)] ?? "Belum tersedia"}{" "}
            ·{" "}
            {detail.submission?.prior_learning
              ? "Calon alih kredit, belum diakui"
              : "Karya pembelajaran"}
          </p>
          {detail.submission?.score !== null &&
            detail.submission?.score !== undefined && (
              <p>
                <b>Nilai saat ini: {Number(detail.submission.score)}</b>
              </p>
            )}
          {detail.submission?.feedback && (
            <p>Umpan balik: {String(detail.submission.feedback)}</p>
          )}
          <blockquote>{String(detail.submission?.answer_text)}</blockquote>
          {JSON.parse(String(detail.submission?.evidence_json ?? "[]")).map(
            (l: { label: string; url: string }, i: number) => (
              <p key={i}>
                <a href={l.url} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              </p>
            ),
          )}
          <WorkHistory history={detail.history} files={detail.files} />
          {detail.submission?.status !== "draft" && (
            <fieldset disabled={busy}>
              <legend>Penilaian berbobot dan komentar spesifik</legend>
              <WorkGradeFields
                rubric={String(assignment.rubric_json)}
                criteria={criteria}
                setCriteria={setCriteria}
                setDirty={setDirty}
              />
              <label>
                Umpan balik / instruksi revisi
                <textarea
                  value={feedback}
                  onChange={(e) => {
                    setFeedback(e.target.value);
                    setDirty(true);
                  }}
                />
              </label>
              {detail.submission?.status === "graded" && (
                <label>
                  Alasan perubahan nilai (wajib)
                  <textarea
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setDirty(true);
                    }}
                  />
                </label>
              )}
              <label>
                Validasi bukti (bukan pemberian SKK)
                <select
                  value={decision}
                  onChange={(e) => {
                    setDecision(e.target.value);
                    setDirty(true);
                  }}
                >
                  <option value="supported">Bukti mendukung penilaian</option>
                  <option value="insufficient">Bukti belum memadai</option>
                </select>
              </label>
              <button className="primary" onClick={() => void act("grade")}>
                Simpan penilaian rubrik
              </button>
              <button onClick={() => void act("revise")}>
                Minta revisi dengan umpan balik
              </button>
            </fieldset>
          )}
        </>
      )}
    </article>
  );
}
