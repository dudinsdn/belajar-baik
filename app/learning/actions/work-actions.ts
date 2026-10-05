import type { Dispatch, SetStateAction, RefObject } from "react";
import type { WorkDetail, SubmissionDetail } from "../work-types";
import { readApi, writeApi } from "../request";
import { uploadWorkEvidence } from "../work-draft-storage";
type Props = {
  assignmentId: string;
  server: RefObject<WorkDetail | null>;
  onSavedRef: RefObject<((detail: WorkDetail) => void) | undefined>;
  save: () => Promise<boolean>;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setDetail: Dispatch<SetStateAction<WorkDetail | null>>;
  setNotice: Dispatch<SetStateAction<string>>;
};
export function createWorkActions({
  assignmentId,
  server,
  onSavedRef,
  save,
  setBusy,
  setDetail,
  setNotice,
}: Props) {
  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!(await save())) return;
    setBusy(true);
    setNotice(
      action === "submit" ? "Mengirim karya…" : "Menyimpan pilihan portofolio…",
    );
    try {
      if (!server.current?.submission)
        throw new Error("Isi jawaban atau bukti terlebih dahulu.");
      const sub = server.current.submission;
      const updated = await writeApi<SubmissionDetail>(
        `/api/v1/work/submissions/${sub.id}`,
        "PUT",
        { action, version: sub.version, ...extra },
      );
      server.current = { ...server.current, ...updated };
      setDetail(server.current);
      onSavedRef.current?.(server.current);
      setNotice(
        action === "submit"
          ? "Karya terkirim. Menunggu tutor."
          : "Pilihan portofolio tersimpan.",
      );
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file: File) => {
    if (!(await save())) return;
    setBusy(true);
    setNotice("Mengunggah bukti…");
    try {
      if (!server.current?.submission) {
        await writeApi(`/api/v1/work/${assignmentId}`, "POST");
        server.current = await readApi<WorkDetail>(
          `/api/v1/work/${assignmentId}`,
        );
      }
      const sub = server.current.submission!;
      const updated = await uploadWorkEvidence(
        String(sub.id),
        Number(sub.version),
        file,
      );
      server.current = { ...server.current, ...updated };
      setDetail(server.current);
      setNotice("Berkas tersimpan.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { act, upload };
}
