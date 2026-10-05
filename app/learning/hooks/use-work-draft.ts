import { createWorkActions } from "../actions/work-actions";
import {
  initialWorkDraft,
  readWorkQueue,
  persistWorkQueue,
  clearWorkQueue,
} from "../work-draft-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { readApi, writeApi } from "../request";
import { useUnsavedChanges } from "./use-unsaved-changes";
import type { WorkDetail, WorkDraft, SubmissionDetail } from "../work-types";
export function useWorkDraft(
  assignmentId: string,
  userId: string,
  onSaved?: (detail: WorkDetail) => void,
) {
  const [detail, setDetail] = useState<WorkDetail | null>(null),
    [draft, setDraft] = useState<WorkDraft>({
      answerText: "",
      evidence: [],
      priorLearning: false,
    }),
    [notice, setNotice] = useState("Memuat karya…"),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<WorkDraft | null>(null);
  const server = useRef<WorkDetail | null>(null),
    latest = useRef(draft),
    saved = useRef(""),
    queue = useRef(Promise.resolve()),
    mounted = useRef(true),
    pendingVersion = useRef<number | null>(null);
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);
  const key = `rt:work-queue:${userId}:${assignmentId}`;
  useUnsavedChanges(dirty || !!pending);
  useEffect(() => {
    mounted.current = true;
    const c = new AbortController();
    readApi<WorkDetail>(`/api/v1/work/${assignmentId}`, c.signal)
      .then((d) => {
        server.current = d;
        setDetail(d);
        const original = initialWorkDraft(d);
        setDraft(original);
        latest.current = original;
        saved.current = JSON.stringify(original);
        const entry = readWorkQueue(key);
        if (entry) {
          pendingVersion.current = entry.version;
          setPending(entry.draft);
          setNotice(
            "Ada salinan lokal belum tersinkron. Pulihkan atau buang secara eksplisit.",
          );
          return;
        }
        setNotice("Karya dimuat dari server.");
      })
      .catch((e) => {
        if (!c.signal.aborted) setNotice(e.message);
      });
    return () => {
      mounted.current = false;
      c.abort();
    };
  }, [assignmentId, key]);
  const edit = (next: WorkDraft) => {
    latest.current = next;
    setDraft(next);
    setDirty(true);
    if (
      !persistWorkQueue(
        key,
        next,
        Number(server.current?.submission?.version ?? 0),
      )
    )
      setNotice(
        "Salinan lokal tidak tersedia. Jangan tutup halaman sebelum tersimpan.",
      );
  };
  const save = useCallback(() => {
    let success = false;
    const job = queue.current
      .then(async () => {
        if (!server.current || pending) return;
        if (JSON.stringify(latest.current) === saved.current) {
          success = true;
          return;
        }
        if (
          server.current.submission?.status &&
          server.current.submission.status !== "draft"
        )
          throw new Error("Karya telah dikirim. Draf lokal tetap tersedia.");
        setBusy(true);
        setNotice("Menyimpan draf…");
        if (!server.current.submission) {
          await writeApi(`/api/v1/work/${assignmentId}`, "POST");
          server.current = await readApi<WorkDetail>(
            `/api/v1/work/${assignmentId}`,
          );
        }
        const captured = latest.current,
          sub = server.current.submission!;
        const updated = await writeApi<SubmissionDetail>(
          `/api/v1/work/submissions/${sub.id}`,
          "PUT",
          { action: "save", version: sub.version, ...captured },
        );
        server.current = { ...server.current, ...updated };
        saved.current = JSON.stringify(captured);
        onSavedRef.current?.(server.current);
        if (mounted.current) {
          setDetail(server.current);
          if (saved.current === JSON.stringify(latest.current)) {
            setDirty(false);
            clearWorkQueue(key);
          } else
            persistWorkQueue(
              key,
              latest.current,
              Number(server.current.submission?.version ?? 0),
            );
          setNotice("Draf tersimpan di server.");
        }
        success = true;
      })
      .catch((e) => {
        if (mounted.current) setNotice(e.message);
      })
      .finally(() => {
        if (mounted.current) setBusy(false);
      });
    queue.current = job;
    return job.then(() => success);
  }, [assignmentId, key, pending]);
  useEffect(() => {
    if (!dirty || pending) return;
    const timer = setTimeout(() => {
      void save();
    }, 1200);
    return () => clearTimeout(timer);
  }, [draft, dirty, pending, save]); // Save serializes writes and takes the latest draft.
  const actions = () =>
    createWorkActions({
      assignmentId,
      server,
      onSavedRef,
      save,
      setBusy,
      setDetail,
      setNotice,
    });
  const recover = (restore: boolean) => {
    if (
      restore &&
      pending &&
      pendingVersion.current !==
        Number(server.current?.submission?.version ?? 0)
    ) {
      setNotice(
        "Versi server berubah. Salin teks lokal untuk digabungkan; pemulihan otomatis diblokir agar tidak menimpa karya terbaru.",
      );
      return;
    }
    if (restore && pending) edit(pending);
    else clearWorkQueue(key);
    setPending(null);
    setNotice(
      restore
        ? "Salinan lokal dipulihkan; penyimpanan otomatis dilanjutkan."
        : "Salinan lokal dibuang.",
    );
  };
  return {
    detail,
    draft,
    notice,
    dirty,
    busy,
    pending,
    edit,
    save,
    act: (action: string, extra?: Record<string, unknown>) =>
      actions().act(action, extra),
    upload: (file: File) => actions().upload(file),
    recover,
  };
}
