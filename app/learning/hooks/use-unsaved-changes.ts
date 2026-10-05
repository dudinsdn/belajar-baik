import { useEffect } from "react";
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const navigate = (e: Event) => {
      if (!window.confirm("Perubahan belum disimpan. Tinggalkan halaman?"))
        e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("rt:navigate", navigate);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("rt:navigate", navigate);
    };
  }, [dirty]);
}
