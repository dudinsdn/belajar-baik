'use client';

import { useState } from 'react';

const courses = [
  { code: 'SEJ', title: 'Sejarah Indonesia', teacher: 'Pak Adi Rama', progress: 68, tone: 'coral', next: 'Lanjut: Perjuangan mempertahankan kemerdekaan' },
  { code: 'MAT', title: 'Matematika', teacher: 'Bu Ratna Sari', progress: 42, tone: 'blue', next: 'Lanjut: Persamaan kuadrat' },
  { code: 'ING', title: 'Bahasa Inggris', teacher: 'Mr. Farhan', progress: 81, tone: 'green', next: 'Lanjut: Narrative text' },
];

const nav = ['Beranda', 'Materi', 'Latihan', 'Tugas', 'Perpustakaan'];

export default function Home() {
  const [active, setActive] = useState('Beranda');
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);

  return (
    <main>
      <a className="skip-link" href="#konten">Lewati ke konten utama</a>
      <header className="topbar">
        <button className="menu-button" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <span/><span/><span/>
        </button>
        <a className="brand" href="#" aria-label="Ruang Tumbuh, beranda">
          <span className="brand-mark">R</span>
          <span>Ruang<span>Tumbuh</span></span>
        </a>
        <div className="top-actions">
          <button className="icon-button" aria-label="Buka notifikasi"><span className="notification-dot"/>◎</button>
          <button className="profile-button" aria-label="Buka profil Dudin Sahidin">
            <span className="avatar">DS</span><span className="profile-copy"><b>Dudin Sahidin</b><small>Paket C · Kelas 10</small></span>
          </button>
        </div>
      </header>

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`} aria-label="Navigasi utama">
        <nav>
          <p className="nav-label">MENU BELAJAR</p>
          {nav.map((item, index) => (
            <button key={item} className={active === item ? 'active' : ''} onClick={() => { setActive(item); setMenuOpen(false); }}>
              <span className="nav-icon" aria-hidden="true">{['⌂','▤','✓','□','▥'][index]}</span>{item}
              {item === 'Tugas' && <span className="badge">2</span>}
            </button>
          ))}
        </nav>
        <section className="help-card" aria-labelledby="help-title">
          <span aria-hidden="true">?</span>
          <h2 id="help-title">Butuh bantuan?</h2>
          <p>Panduan belajar tersedia kapan saja.</p>
          <button>Lihat panduan</button>
        </section>
      </aside>
      {menuOpen && <button className="backdrop" aria-label="Tutup menu" onClick={() => setMenuOpen(false)}/>} 

      <div className="page" id="konten">
        {active === 'Beranda' && <>
        <section className="welcome">
          <div>
            <p className="eyebrow">SABTU, 20 SEPTEMBER 2026</p>
            <h1>Selamat pagi, Dudin!</h1>
            <p>Mulai dari yang kecil. Satu materi hari ini adalah satu langkah maju.</p>
          </div>
          <div className="streak" aria-label="Rangkaian belajar 4 hari">
            <span aria-hidden="true">✦</span><div><b>4 hari</b><small>Rangkaian belajar</small></div>
          </div>
        </section>

        <section className="continue-card" aria-labelledby="continue-title">
          <div className="continue-art" aria-hidden="true"><span>45</span><small>menit</small></div>
          <div className="continue-copy">
            <p className="eyebrow">LANJUTKAN BELAJAR</p>
            <h2 id="continue-title">Mempertahankan Kemerdekaan Indonesia</h2>
            <p>Sejarah Indonesia · Bab 3</p>
            <div className="progress-row"><div className="progress"><span style={{width:'68%'}}/></div><b>68%</b></div>
          </div>
          <button className="primary">Lanjutkan materi <span aria-hidden="true">→</span></button>
        </section>

        <section className="section-block" aria-labelledby="today-title">
          <div className="section-heading"><div><p className="eyebrow">RENCANA HARI INI</p><h2 id="today-title">Yang perlu diselesaikan</h2></div><button className="text-button">Lihat semua</button></div>
          <div className="task-grid">
            <article className="task-card"><span className="task-icon blue">✓</span><div><span className="pill urgent">Hari ini · 20.00</span><h3>Latihan Persamaan Kuadrat</h3><p>Matematika · 10 soal</p></div><button aria-label="Buka latihan Persamaan Kuadrat">Mulai</button></article>
            <article className="task-card"><span className="task-icon coral">□</span><div><span className="pill">Besok · 18.00</span><h3>Ringkasan Narrative Text</h3><p>Bahasa Inggris · Tugas</p></div><button aria-label="Buka tugas Ringkasan Narrative Text">Buka</button></article>
          </div>
        </section>

        <section className="section-block" aria-labelledby="courses-title">
          <div className="section-heading"><div><p className="eyebrow">MATA PELAJARAN</p><h2 id="courses-title">Perjalanan belajarmu</h2></div><button className="text-button">Semua pelajaran</button></div>
          <div className="course-grid">
            {courses.map(course => <article className="course-card" key={course.code}>
              <div className={`course-cover ${course.tone}`}><span>{course.code}</span><b>{course.progress}%</b></div>
              <div className="course-body"><p>{course.teacher}</p><h3>{course.title}</h3><div className="progress"><span style={{width:`${course.progress}%`}}/></div><small>{course.next}</small><button aria-label={`Lanjutkan ${course.title}`}>Lanjut belajar <span aria-hidden="true">→</span></button></div>
            </article>)}
          </div>
        </section>
        </>}

        {active === 'Materi' && <section className="reader-page">
          <header className="inner-header"><div><p className="eyebrow">SEJARAH INDONESIA · BAB 3</p><h1>Mempertahankan Kemerdekaan</h1><p>Terakhir dibaca: halaman 12 dari 28</p></div><button className={bookmarked ? 'bookmark saved' : 'bookmark'} onClick={() => setBookmarked(!bookmarked)} aria-pressed={bookmarked}><span aria-hidden="true">{bookmarked ? '★' : '☆'}</span>{bookmarked ? 'Tersimpan' : 'Simpan halaman'}</button></header>
          <div className="reader-layout">
            <aside className="toc"><p className="eyebrow">DAFTAR ISI</p><button className="done">✓ Proklamasi</button><button className="done">✓ Kedatangan Sekutu</button><button className="current">3. Pertempuran Surabaya</button><button>4. Diplomasi Indonesia</button><button>5. Pengakuan Kedaulatan</button></aside>
            <article className="reader" style={{fontSize}}>
              <div className="reader-tools"><span>Ukuran teks</span><button onClick={() => setFontSize(Math.max(16,fontSize-2))} aria-label="Perkecil teks">A−</button><button onClick={() => setFontSize(Math.min(24,fontSize+2))} aria-label="Perbesar teks">A+</button></div>
              <p className="chapter">03</p><h2>Pertempuran Surabaya</h2>
              <p>Pertempuran Surabaya merupakan salah satu peristiwa penting dalam sejarah perjuangan mempertahankan kemerdekaan Indonesia. Perlawanan rakyat menunjukkan bahwa kemerdekaan bukan sekadar pernyataan, tetapi sesuatu yang akan dipertahankan bersama.</p>
              <aside className="key-note"><b>Gagasan utama</b><p>Perjuangan terjadi melalui perlawanan fisik sekaligus diplomasi untuk memperoleh pengakuan dunia.</p></aside>
              <h3>Mengapa peristiwa ini penting?</h3><p>Semangat perlawanan menarik perhatian internasional dan memperkuat legitimasi Republik Indonesia. Tanggal 10 November kemudian diperingati sebagai Hari Pahlawan.</p>
              <div className="reader-progress"><span>Progres bab</span><div className="progress"><i style={{width:'43%'}}/></div><b>43%</b></div>
              <button className="primary reader-next" onClick={() => setActive('Latihan')}>Cek pemahaman <span aria-hidden="true">→</span></button>
            </article>
          </div>
        </section>}

        {active === 'Latihan' && <section className="quiz-page">
          <header className="inner-header"><div><p className="eyebrow">LATIHAN PEMAHAMAN</p><h1>Pertempuran Surabaya</h1><p>Soal 1 dari 5 · Pilih satu jawaban yang paling tepat.</p></div><span className="quiz-count">1 / 5</span></header>
          <div className="quiz-card">
            <div className="quiz-progress"><span style={{width:'20%'}}/></div>
            <fieldset><legend>Apa dampak strategis Pertempuran Surabaya bagi perjuangan kemerdekaan Indonesia?</legend>
              {[
                ['a','Indonesia langsung memperoleh pengakuan kedaulatan dari Belanda.'],
                ['b','Sekutu meninggalkan seluruh wilayah Indonesia pada hari berikutnya.'],
                ['c','Perlawanan rakyat menarik perhatian dunia dan memperkuat legitimasi perjuangan.'],
                ['d','Pemerintah Indonesia memindahkan pusat pemerintahan ke Surabaya.']
              ].map(([value,label]) => <label className={`option ${answer===value?'selected':''}`} key={value}><input type="radio" name="answer" value={value} checked={answer===value} onChange={() => {setAnswer(value);setChecked(false)}}/><span className="radio-letter">{value.toUpperCase()}</span><span>{label}</span></label>)}
            </fieldset>
            {checked && <div className={answer==='c'?'feedback correct':'feedback wrong'} role="status"><b>{answer==='c'?'Jawabanmu tepat!':'Belum tepat, coba lagi.'}</b><p>{answer==='c'?'Perlawanan di Surabaya menunjukkan kepada dunia bahwa Republik Indonesia memiliki dukungan rakyat dan bersungguh-sungguh mempertahankan kemerdekaan.':'Baca kembali bagian “Mengapa peristiwa ini penting?” pada materi.'}</p></div>}
            <div className="quiz-actions"><button className="secondary" onClick={() => setActive('Materi')}>← Buka materi</button><button className="primary" disabled={!answer} onClick={() => setChecked(true)}>Periksa jawaban</button></div>
          </div>
        </section>}

        {(active === 'Tugas' || active === 'Perpustakaan') && <section className="empty-state"><span aria-hidden="true">{active === 'Tugas' ? '□' : '▥'}</span><p className="eyebrow">{active.toUpperCase()}</p><h1>{active === 'Tugas' ? 'Tugas yang terarah' : 'Perpustakaan digital'}</h1><p>{active === 'Tugas' ? 'Lihat tenggat, petunjuk, status pengumpulan, dan umpan balik guru dalam satu tempat.' : 'Cari buku dan materi, simpan bookmark, lalu lanjutkan membaca dari halaman terakhir.'}</p><button className="primary" onClick={() => setActive(active === 'Tugas' ? 'Beranda' : 'Materi')}>{active === 'Tugas' ? 'Kembali ke beranda' : 'Buka materi contoh'}</button></section>}
      </div>

      <nav className="bottom-nav" aria-label="Navigasi seluler">
        {nav.slice(0,4).map((item, index) => <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}><span aria-hidden="true">{['⌂','▤','✓','□'][index]}</span>{item}</button>)}
      </nav>
    </main>
  );
}
