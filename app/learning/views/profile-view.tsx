import type { Dispatch, SetStateAction } from "react";
import type { DashboardData, ProfileData } from "../types";

type Props = {
  initials: string;
  displayName: string;
  profile: ProfileData | null;
  dashboard: DashboardData | null;
  dailyGoal: number;
  reminders: boolean;
  readingMode: string;
  setDailyGoal: Dispatch<SetStateAction<number>>;
  setReminders: Dispatch<SetStateAction<boolean>>;
  setReadingMode: Dispatch<SetStateAction<string>>;
  setFontSize: Dispatch<SetStateAction<number>>;
  resetLocal: () => void;
  setNotice: Dispatch<SetStateAction<string>>;
};

export function ProfileView(props: Props) {
  const {
    initials,
    displayName,
    profile,
    dashboard,
    dailyGoal,
    reminders,
    readingMode,
    setDailyGoal,
    setReminders,
    setReadingMode,
    setFontSize,
    resetLocal,
    setNotice,
  } = props;
  return (
    <section>
      <header className="inner-header">
        <div>
          <p className="eyebrow">PROFIL & PENGATURAN</p>
          <h1>Ruang belajar milikmu</h1>
          <p>
            Identitas dan progres berasal dari akun belajar. Preferensi tetap
            disimpan di perangkat ini.
          </p>
        </div>
      </header>
      <div className="profile-settings-grid">
        <article className="student-profile-card">
          <span className="profile-avatar-large">{initials}</span>
          <div>
            <h2>{displayName}</h2>
            <p>
              {profile?.enrollment
                ? `${profile.enrollment.program} · Kelas ${profile.enrollment.grade_level}`
                : (profile?.role ?? "Siswa")}
            </p>
            <small>{profile?.email ?? "Memuat identitas…"}</small>
          </div>
          <dl>
            <div>
              <dt>Rangkaian</dt>
              <dd>4 hari</dd>
            </div>
            <div>
              <dt>Materi dimulai</dt>
              <dd>{dashboard?.progress?.started ?? 0}</dd>
            </div>
            <div>
              <dt>Nilai rata-rata</dt>
              <dd>{Math.round(dashboard?.progress?.average_percent ?? 0)}</dd>
            </div>
          </dl>
        </article>
        <article className="preferences-card">
          <div>
            <h2>Target belajar harian</h2>
            <p>Pilih durasi yang realistis agar belajar tetap konsisten.</p>
            <div className="setting-options">
              {[15, 30, 45, 60].map((goal) => (
                <button
                  key={goal}
                  className={dailyGoal === goal ? "active" : ""}
                  onClick={() => {
                    setDailyGoal(goal);
                    localStorage.setItem("rt-daily-goal", String(goal));
                    setNotice(`Target belajar diubah menjadi ${goal} menit.`);
                  }}
                >
                  {goal} menit
                </button>
              ))}
            </div>
          </div>
          <div className="setting-divider" />
          <label className="setting-toggle">
            <span>
              <b>Pengingat belajar</b>
              <small>Pengingat target harian dan tenggat tugas.</small>
            </span>
            <input
              type="checkbox"
              checked={reminders}
              onChange={(event) => {
                setReminders(event.target.checked);
                localStorage.setItem(
                  "rt-reminders",
                  String(event.target.checked),
                );
              }}
            />
          </label>
          <div className="setting-divider" />
          <div>
            <h2>Ukuran tampilan</h2>
            <p>Pilih kerapatan teks yang paling nyaman dibaca.</p>
            <div className="setting-options">
              {["Ringkas", "Nyaman", "Besar"].map((mode) => (
                <button
                  key={mode}
                  className={readingMode === mode ? "active" : ""}
                  onClick={() => {
                    setReadingMode(mode);
                    localStorage.setItem("rt-reading-mode", mode);
                    setFontSize(
                      mode === "Besar" ? 22 : mode === "Ringkas" ? 16 : 18,
                    );
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-divider" />
          <button className="reset-button" onClick={resetLocal}>
            Atur ulang progres lokal
          </button>
        </article>
      </div>
    </section>
  );
}
