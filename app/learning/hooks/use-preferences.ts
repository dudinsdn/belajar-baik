import { useState } from "react";

function stored<T>(key: string, fallback: T, read: (value: string) => T): T {
  try {
    return typeof window === "undefined"
      ? fallback
      : read(localStorage.getItem(key) ?? String(fallback));
  } catch {
    return fallback;
  }
}
export function usePreferences(setNotice: (value: string) => void) {
  const [submitted, setSubmitted] = useState<number[]>(() =>
    stored("rt-submitted", [], JSON.parse),
  );
  const [savedBooks, setSavedBooks] = useState<number[]>(() =>
    stored("rt-books", [], JSON.parse),
  );
  const [dailyGoal, setDailyGoal] = useState(() =>
    stored("rt-daily-goal", 30, Number),
  );
  const [reminders, setReminders] = useState(() =>
    stored("rt-reminders", true, (value) => value !== "false"),
  );
  const [readingMode, setReadingMode] = useState(() =>
    stored("rt-reading-mode", "Nyaman", String),
  );
  const reset = () => {
    [
      "rt-submitted",
      "rt-books",
      "rt-daily-goal",
      "rt-reminders",
      "rt-reading-mode",
    ].forEach((key) => localStorage.removeItem(key));
    setSubmitted([]);
    setSavedBooks([]);
    setDailyGoal(30);
    setReminders(true);
    setReadingMode("Nyaman");
    setNotice("Progres dan preferensi lokal telah diatur ulang.");
  };
  return {
    submitted,
    setSubmitted,
    savedBooks,
    setSavedBooks,
    dailyGoal,
    setDailyGoal,
    reminders,
    setReminders,
    readingMode,
    setReadingMode,
    reset,
  };
}
