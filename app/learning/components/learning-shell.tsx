import type { ReactNode, RefObject } from "react";
import type { ProfileData } from "../types";

type Props = {
  active: string;
  menuOpen: boolean;
  displayName: string;
  initials: string;
  notice: string;
  navigation: string[];
  profile: ProfileData | null;
  contentRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  goTo: (value: string) => void;
  setMenuOpen: (value: boolean) => void;
  setNotice: (value: string) => void;
};

export function LearningShell(props: Props) {
  const {
    active,
    menuOpen,
    displayName,
    initials,
    notice,
    navigation,
    profile,
    contentRef,
    children,
    goTo,
    setMenuOpen,
    setNotice,
  } = props;
  const icons =
    profile?.role === "teacher" ? ["✓", "◎"] : ["⌂", "▤", "✓", "□", "▥"];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#konten">
        Lewati ke konten utama
      </a>
      <header className="topbar">
        <button
          className="menu-button"
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          aria-controls="navigasi-utama"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span />
          <span />
          <span />
        </button>
        <button
          className="brand"
          onClick={() => goTo("Beranda")}
          aria-label="Ruang Tumbuh, kembali ke beranda"
        >
          <span className="brand-mark">R</span>
          <span>
            Ruang<span>Tumbuh</span>
          </span>
        </button>
        <div className="top-actions">
          <button
            className="icon-button"
            aria-label="Buka notifikasi, ada satu pemberitahuan"
            onClick={() => setNotice("Belum ada pengumuman baru hari ini.")}
          >
            <span className="notification-dot" />◎
          </button>
          <button
            className="profile-button"
            aria-label={`Buka profil ${displayName}`}
            onClick={() => goTo("Profil")}
          >
            <span className="avatar">{initials}</span>
            <span className="profile-copy">
              <b>{displayName}</b>
              <small>
                {profile?.enrollment
                  ? `${profile.enrollment.program} · Kelas ${profile.enrollment.grade_level}`
                  : "Profil siswa"}
              </small>
            </span>
          </button>
        </div>
      </header>
      <aside
        id="navigasi-utama"
        className={`sidebar ${menuOpen ? "open" : ""}`}
        aria-label="Navigasi utama"
      >
        <nav>
          <p className="nav-label">MENU BELAJAR</p>
          {navigation.map((item, index) => (
            <button
              key={item}
              className={active === item ? "active" : ""}
              aria-current={active === item ? "page" : undefined}
              onClick={() => goTo(item)}
            >
              <span className="nav-icon" aria-hidden="true">
                {icons[index]}
              </span>
              {item}
              {item === "Tugas" && <span className="badge">2</span>}
            </button>
          ))}
        </nav>
        <section className="help-card" aria-labelledby="help-title">
          <span aria-hidden="true">?</span>
          <h2 id="help-title">Butuh bantuan?</h2>
          <p>Panduan belajar tersedia kapan saja.</p>
          <button
            onClick={() =>
              setNotice("Panduan belajar akan tersedia pada tahap berikutnya.")
            }
          >
            Lihat panduan
          </button>
        </section>
      </aside>
      {menuOpen && (
        <button
          className="backdrop"
          aria-label="Tutup menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {notice}
      </p>
      <main className="page" id="konten" tabIndex={-1} ref={contentRef}>
        {children}
      </main>
      <nav className="bottom-nav" aria-label="Navigasi seluler">
        {navigation.slice(0, 4).map((item, index) => (
          <button
            key={item}
            className={active === item ? "active" : ""}
            aria-current={active === item ? "page" : undefined}
            onClick={() => goTo(item)}
          >
            <span aria-hidden="true">{icons[index]}</span>
            {item}
          </button>
        ))}
      </nav>
    </div>
  );
}

export function AccessState({
  status,
  message,
}: {
  status: "loading" | "error";
  message: string;
}) {
  return (
    <main className="access-state" id="konten">
      <section className="access-card" aria-live="polite">
        <span className="brand-mark" aria-hidden="true">
          R
        </span>
        <p className="eyebrow">RUANGTUMBUH</p>
        <h1>
          {status === "loading"
            ? "Menyiapkan ruang belajarmu…"
            : "Akun belum dapat dibuka"}
        </h1>
        <p>
          {status === "loading"
            ? "Kami sedang memuat profil dan progres belajar yang tersimpan."
            : message}
        </p>
        {status === "error" && (
          <button className="primary" onClick={() => window.location.reload()}>
            Coba lagi
          </button>
        )}
      </section>
    </main>
  );
}
