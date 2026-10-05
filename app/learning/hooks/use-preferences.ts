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
    ["rt-daily-goal", "rt-reminders", "rt-reading-mode"].forEach((key) =>
      localStorage.removeItem(key),
    );
    setDailyGoal(30);
    setReminders(true);
    setReadingMode("Nyaman");
    setNotice("Preferensi perangkat telah diatur ulang.");
  };
  return {
    dailyGoal,
    setDailyGoal,
    reminders,
    setReminders,
    readingMode,
    setReadingMode,
    reset,
  };
}
