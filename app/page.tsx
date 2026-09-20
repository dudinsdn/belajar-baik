'use client';

import { useEffect, useRef, useState } from 'react';

const courses = [
  { code: 'SEJ', title: 'Sejarah Indonesia', teacher: 'Pak Adi Rama', progress: 68, tone: 'coral', next: 'Lanjut: Perjuangan mempertahankan kemerdekaan' },
  { code: 'MAT', title: 'Matematika', teacher: 'Bu Ratna Sari', progress: 42, tone: 'blue', next: 'Lanjut: Persamaan kuadrat' },
  { code: 'ING', title: 'Bahasa Inggris', teacher: 'Mr. Farhan', progress: 81, tone: 'green', next: 'Lanjut: Narrative text' },
];

const nav = ['Beranda', 'Materi', 'Latihan', 'Tugas', 'Perpustakaan'];
const assignments = [
  {id:1,subject:'Matematika',title:'Latihan Persamaan Kuadrat',due:'Hari ini · 20.00'},
  {id:2,subject:'Bahasa Inggris',title:'Ringkasan Narrative Text',due:'Besok · 18.00'},
  {id:3,subject:'Sejarah',title:'Refleksi Pertempuran Surabaya',due:'Dinilai · 88'},
];
const library = [
  {id:1,code:'SEJ',title:'Indonesia Mempertahankan Kemerdekaan',author:'Tim Sejarah Nasional',progress:43},
  {id:2,code:'MAT',title:'Aljabar dalam Kehidupan Sehari-hari',author:'Ratna Sari',progress:18},
  {id:3,code:'ING',title:'Everyday English Stories',author:'Farhan Akbar',progress:0},
];
const quiz = [
  ['Apa dampak strategis Pertempuran Surabaya?', ['Pengakuan langsung Belanda','Sekutu pergi keesokan hari','Menarik perhatian dunia dan memperkuat legitimasi perjuangan','Pusat pemerintahan pindah'], 2],
  ['Mengapa 10 November diperingati sebagai Hari Pahlawan?', ['Hari Proklamasi','Puncak perlawanan rakyat Surabaya','Hari pengakuan kedaulatan','Hari pembentukan pemerintahan'], 1],
  ['Siapa tokoh yang membakar semangat arek-arek Surabaya?', ['Bung Tomo','Mohammad Hatta','Jenderal Sudirman','Sutan Sjahrir'], 0],
  ['Apa cara diplomasi Indonesia mempertahankan kemerdekaan?', ['Menutup hubungan luar negeri','Menyerahkan pemerintahan','Mencari pengakuan internasional','Menghentikan pemerintahan'], 2],
  ['Nilai utama dari Pertempuran Surabaya adalah…', ['Kepentingan pribadi','Keberanian, persatuan, dan rela berkorban','Menghindari perubahan','Menyerahkan keputusan'], 1],
] as const;

const shortDateTime = new Intl.DateTimeFormat('id-ID', { dateStyle:'medium', timeStyle:'short', timeZone:'Asia/Jakarta' });
const longDateTime = new Intl.DateTimeFormat('id-ID', { dateStyle:'long', timeStyle:'short', timeZone:'Asia/Jakarta' });

type ProfileData = { id:string; email:string; displayName:string; role:string; enrollment?:{ class_name:string; program:string; grade_level:string; academic_year:string } | null };
type DashboardData = { continueMaterial?:{ id:string; title:string; subject:string; percent:number; last_position:string | null } | null; assignments:Array<{ id:string; title:string; due_at:string; subject:string; submission_status:string }>; progress?:{ started:number; average_percent:number } | null };
type MaterialData = { id:string; title:string; summary:string; order_index:number; subject_code:string; subject:string; percent:number; last_position:string | null; completed_at:string | null };
type LibraryData = { id:string; title:string; author:string; description:string; page_count:number; subject_code:string | null; subject:string | null; percent:number; bookmarked:number; last_position:string | null };
type AssignmentData = { id:string; title:string; instructions:string; due_at:string; subject:string; answer_text:string | null; submission_status:string; score:number | null; feedback:string | null };
type ApiEnvelope<T> = { data:T; error?:never } | { data?:never; error:{ message:string } };

export default function Home() {
  const [active, setActive] = useState('Beranda');
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [notice, setNotice] = useState('');
  const [submitted, setSubmitted] = useState<number[]>(() => { try { return typeof window === 'undefined' ? [] : JSON.parse(localStorage.getItem('rt-submitted') || '[]'); } catch { return []; } });
  const [savedBooks, setSavedBooks] = useState<number[]>(() => { try { return typeof window === 'undefined' ? [] : JSON.parse(localStorage.getItem('rt-books') || '[]'); } catch { return []; } });
  const [query, setQuery] = useState('');
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(() => { try { return typeof window === 'undefined' ? 30 : Number(localStorage.getItem('rt-daily-goal') || 30); } catch { return 30; } });
  const [reminders, setReminders] = useState(() => { try { return typeof window === 'undefined' ? true : localStorage.getItem('rt-reminders') !== 'false'; } catch { return true; } });
  const [readingMode, setReadingMode] = useState(() => { try { return typeof window === 'undefined' ? 'Nyaman' : localStorage.getItem('rt-reading-mode') || 'Nyaman'; } catch { return 'Nyaman'; } });
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [materialData, setMaterialData] = useState<MaterialData[]>([]);
  const [libraryData, setLibraryData] = useState<LibraryData[]>([]);
  const [assignmentData, setAssignmentData] = useState<AssignmentData[]>([]);
  const [assignmentAnswers, setAssignmentAnswers] = useState<Record<string,string>>({});
  const [savingAssignment, setSavingAssignment] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'loading'|'ready'|'error'>('loading');
  const [apiMessage, setApiMessage] = useState('');
  const contentRef = useRef<HTMLElement>(null);

  const goTo = (destination: string) => {
    setActive(destination);
    setMenuOpen(false);
    window.requestAnimationFrame(() => contentRef.current?.focus());
  };

  useEffect(() => {
    const closeMenu = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeMenu);
    return () => window.removeEventListener('keydown', closeMenu);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const read = async <T,>(url:string) => {
      const response = await fetch(url, { signal:controller.signal });
      const body = await response.json() as ApiEnvelope<T>;
      if (!response.ok || body.error) throw new Error(body.error?.message ?? 'Data tidak dapat dimuat.');
      return body.data as T;
    };
    Promise.all([
      read<ProfileData>('/api/v1/me'), read<DashboardData>('/api/v1/dashboard'),
      read<MaterialData[]>('/api/v1/materials'), read<LibraryData[]>('/api/v1/library'), read<AssignmentData[]>('/api/v1/assignments'),
    ]).then(([profile,dashboard,materials,books,studentAssignments]) => {
      setProfileData(profile); setDashboardData(dashboard); setMaterialData(materials); setLibraryData(books);
      setAssignmentData(studentAssignments); setAssignmentAnswers(Object.fromEntries(studentAssignments.map(task=>[task.id,task.answer_text ?? ''])));
      setSavedBooks(books.filter(book=>Boolean(book.bookmarked)).map((_,index)=>index+1)); setApiStatus('ready');
    }).catch(error => { if (error instanceof Error && error.name !== 'AbortError') { setApiMessage(error.message); setApiStatus('error'); } });
    return () => controller.abort();
  }, []);

  const toggleBook = (id:number) => { const next=savedBooks.includes(id)?savedBooks.filter(x=>x!==id):[...savedBooks,id]; setSavedBooks(next); localStorage.setItem('rt-books',JSON.stringify(next)); };
  const submitTask = async (id:number|string) => {
    if (typeof id === 'number') { const next=[...new Set([...submitted,id])]; setSubmitted(next); localStorage.setItem('rt-submitted',JSON.stringify(next)); setNotice('Tugas tersimpan sebagai terkirim di perangkat ini.'); return; }
    setSavingAssignment(id);
    try {
      const write = async <T,>(url:string, method:string, body?:unknown) => {
        const response = await fetch(url, { method, headers:body ? {'content-type':'application/json'} : undefined, body:body ? JSON.stringify(body) : undefined });
        const payload = await response.json() as ApiEnvelope<T>;
        if (!response.ok || payload.error) throw new Error(payload.error?.message ?? 'Tugas gagal dikirim.');
        return payload.data as T;
      };
      await write<AssignmentData>(`/api/v1/assignments/${id}/submission`, 'PUT', { answerText:assignmentAnswers[id] ?? '' });
      const updated = await write<AssignmentData>(`/api/v1/assignments/${id}/submission/submit`, 'POST');
      setAssignmentData(current=>current.map(task=>task.id===id ? updated : task)); setNotice('Tugas berhasil dikirim ke server lokal.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Tugas gagal dikirim.'); }
    finally { setSavingAssignment(null); }
  };
  const displayName = profileData?.displayName ?? 'Dudin Sahidin';
  const initials = displayName.split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase();
  const continueMaterial = dashboardData?.continueMaterial;
  const shownLibrary = (libraryData.length ? libraryData.map((book,index)=>({id:index+1,code:book.subject_code??'BUK',title:book.title,author:book.author,progress:book.percent})) : library)
    .filter(book=>`${book.title} ${book.author}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="app-shell">
      <a className="skip-link" href="#konten">Lewati ke konten utama</a>
      <header className="topbar">
        <button className="menu-button" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} aria-controls="navigasi-utama" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <span/><span/><span/>
        </button>
        <button className="brand" onClick={() => goTo('Beranda')} aria-label="Ruang Tumbuh, kembali ke beranda">
          <span className="brand-mark">R</span>
          <span>Ruang<span>Tumbuh</span></span>
        </button>
        <div className="top-actions">
          <button className="icon-button" aria-label="Buka notifikasi, ada satu pemberitahuan" onClick={() => setNotice('Belum ada pengumuman baru hari ini.')}><span className="notification-dot"/>◎</button>
          <button className="profile-button" aria-label={`Buka profil ${displayName}`} onClick={() => goTo('Profil')}>
            <span className="avatar">{initials}</span><span className="profile-copy"><b>{displayName}</b><small>{profileData?.enrollment ? `${profileData.enrollment.program} · Kelas ${profileData.enrollment.grade_level}` : 'Profil siswa'}</small></span>
          </button>
        </div>
      </header>

      <aside id="navigasi-utama" className={`sidebar ${menuOpen ? 'open' : ''}`} aria-label="Navigasi utama">
        <nav>
          <p className="nav-label">MENU BELAJAR</p>
          {nav.map((item, index) => (
            <button key={item} className={active === item ? 'active' : ''} aria-current={active === item ? 'page' : undefined} onClick={() => goTo(item)}>
              <span className="nav-icon" aria-hidden="true">{['⌂','▤','✓','□','▥'][index]}</span>{item}
              {item === 'Tugas' && <span className="badge">2</span>}
            </button>
          ))}
        </nav>
        <section className="help-card" aria-labelledby="help-title">
          <span aria-hidden="true">?</span>
          <h2 id="help-title">Butuh bantuan?</h2>
          <p>Panduan belajar tersedia kapan saja.</p>
          <button onClick={() => setNotice('Panduan belajar akan tersedia pada tahap berikutnya.')}>Lihat panduan</button>
        </section>
      </aside>
      {menuOpen && <button className="backdrop" aria-label="Tutup menu" onClick={() => setMenuOpen(false)}/>} 

      <p className="sr-only" role="status" aria-live="polite">{notice}</p>
      <main className="page" id="konten" tabIndex={-1} ref={contentRef}>
        {apiStatus !== 'ready' && <p className={`api-banner ${apiStatus}`} role="status">{apiStatus === 'loading' ? 'Memuat data belajar…' : apiMessage}</p>}
        {active === 'Beranda' && <>
        <section className="welcome">
          <div>
            <p className="eyebrow">SABTU, 20 SEPTEMBER 2026</p>
            <h1>Selamat pagi, {displayName.split(' ')[0]}!</h1>
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
            <h2 id="continue-title">{continueMaterial?.title ?? 'Mempertahankan Kemerdekaan Indonesia'}</h2>
            <p>{continueMaterial ? `${continueMaterial.subject}${continueMaterial.last_position ? ` · ${continueMaterial.last_position}` : ''}` : 'Sejarah Indonesia · Bab 3'}</p>
            <div className="progress-row"><div className="progress"><span style={{width:`${continueMaterial?.percent ?? 68}%`}}/></div><b>{continueMaterial?.percent ?? 68}%</b></div>
          </div>
          <button className="primary" onClick={() => goTo('Materi')}>Lanjutkan materi <span aria-hidden="true">→</span></button>
        </section>

        <section className="section-block" aria-labelledby="today-title">
          <div className="section-heading"><div><p className="eyebrow">RENCANA HARI INI</p><h2 id="today-title">Yang perlu diselesaikan</h2></div><button className="text-button" onClick={() => goTo('Tugas')}>Lihat semua</button></div>
          <div className="task-grid">
            {(dashboardData?.assignments.length ? dashboardData.assignments : [
              {id:'fallback-1', title:'Latihan Persamaan Kuadrat', due_at:'2026-09-20T20:00:00+07:00', subject:'Matematika', submission_status:'not_started'},
              {id:'fallback-2', title:'Ringkasan Narrative Text', due_at:'2026-09-21T18:00:00+07:00', subject:'Bahasa Inggris', submission_status:'not_started'},
            ]).map((task, index) => <article className="task-card" key={task.id}><span className={`task-icon ${index % 2 ? 'coral' : 'blue'}`} aria-hidden="true">{index % 2 ? '□' : '✓'}</span><div><span className={`pill ${index === 0 ? 'urgent' : ''}`}>{shortDateTime.format(new Date(task.due_at))}</span><h3>{task.title}</h3><p>{task.subject} · {task.submission_status === 'submitted' ? 'Terkirim' : 'Tugas'}</p></div><button aria-label={`Buka tugas ${task.title}`} onClick={() => goTo('Tugas')}>Buka</button></article>)}
          </div>
        </section>

        <section className="section-block" aria-labelledby="courses-title">
          <div className="section-heading"><div><p className="eyebrow">MATA PELAJARAN</p><h2 id="courses-title">Perjalanan belajarmu</h2></div><button className="text-button" onClick={() => goTo('Materi')}>Semua pelajaran</button></div>
          <div className="course-grid">
            {courses.map(course => <article className="course-card" key={course.code}>
              <div className={`course-cover ${course.tone}`}><span>{course.code}</span><b>{course.progress}%</b></div>
              <div className="course-body"><p>{course.teacher}</p><h3>{course.title}</h3><div className="progress" role="progressbar" aria-label={`Progres ${course.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={course.progress}><span style={{width:`${course.progress}%`}}/></div><small>{course.next}</small><button aria-label={`Lanjutkan ${course.title}`} onClick={() => goTo('Materi')}>Lanjut belajar <span aria-hidden="true">→</span></button></div>
            </article>)}
          </div>
        </section>
        </>}

        {active === 'Materi' && <section className="reader-page">
          <header className="inner-header"><div><p className="eyebrow">{materialData[0] ? `${materialData[0].subject.toUpperCase()} · MATERI ${materialData[0].order_index}` : 'SEJARAH INDONESIA · BAB 3'}</p><h1>{materialData[0]?.title ?? 'Mempertahankan Kemerdekaan'}</h1><p>{materialData[0]?.last_position ? `Terakhir dibaca: ${materialData[0].last_position}` : materialData[0]?.summary ?? 'Terakhir dibaca: halaman 12 dari 28'}</p></div><button className={bookmarked ? 'bookmark saved' : 'bookmark'} onClick={() => setBookmarked(!bookmarked)} aria-pressed={bookmarked}><span aria-hidden="true">{bookmarked ? '★' : '☆'}</span>{bookmarked ? 'Tersimpan' : 'Simpan halaman'}</button></header>
          <div className="reader-layout">
            <aside className="toc"><p className="eyebrow">DAFTAR ISI</p><button className="done">✓ Proklamasi</button><button className="done">✓ Kedatangan Sekutu</button><button className="current">3. Pertempuran Surabaya</button><button>4. Diplomasi Indonesia</button><button>5. Pengakuan Kedaulatan</button></aside>
            <article className="reader" style={{fontSize}}>
              <div className="reader-tools"><span>Ukuran teks</span><button onClick={() => setFontSize(Math.max(16,fontSize-2))} aria-label="Perkecil teks">A−</button><button onClick={() => setFontSize(Math.min(24,fontSize+2))} aria-label="Perbesar teks">A+</button></div>
              <p className="chapter">03</p><h2>Pertempuran Surabaya</h2>
              <p>Pertempuran Surabaya merupakan salah satu peristiwa penting dalam sejarah perjuangan mempertahankan kemerdekaan Indonesia. Perlawanan rakyat menunjukkan bahwa kemerdekaan bukan sekadar pernyataan, tetapi sesuatu yang akan dipertahankan bersama.</p>
              <aside className="key-note"><b>Gagasan utama</b><p>Perjuangan terjadi melalui perlawanan fisik sekaligus diplomasi untuk memperoleh pengakuan dunia.</p></aside>
              <h3>Mengapa peristiwa ini penting?</h3><p>Semangat perlawanan menarik perhatian internasional dan memperkuat legitimasi Republik Indonesia. Tanggal 10 November kemudian diperingati sebagai Hari Pahlawan.</p>
              <div className="reader-progress"><span>Progres bab</span><div className="progress"><i style={{width:'43%'}}/></div><b>43%</b></div>
              <button className="primary reader-next" onClick={() => goTo('Latihan')}>Cek pemahaman <span aria-hidden="true">→</span></button>
            </article>
          </div>
        </section>}

        {active === 'Latihan' && <section className="quiz-page">
          <header className="inner-header"><div><p className="eyebrow">LATIHAN PEMAHAMAN</p><h1>Pertempuran Surabaya</h1><p>{quizResult ? 'Hasil latihan' : `Soal ${quizStep + 1} dari 5 · Pilih satu jawaban.`}</p></div><span className="quiz-count">{quizResult ? `${quizAnswers.filter((a,i)=>a===quiz[i][2]).length * 20}` : `${quizStep + 1} / 5`}</span></header>
          <div className="quiz-card">
            {quizResult ? <><h2>Nilai kamu: {quizAnswers.filter((a,i)=>a===quiz[i][2]).length * 20}</h2><p>Latihan tersimpan di sesi lokal ini. Ulangi untuk mencoba lagi.</p><div className="quiz-actions"><button className="secondary" onClick={()=>goTo('Materi')}>Buka materi</button><button className="primary" onClick={()=>{setQuizStep(0);setQuizAnswers([]);setQuizResult(false)}}>Ulangi latihan</button></div></> : <><div className="quiz-progress"><span style={{width:`${(quizStep+1)*20}%`}}/></div>
            <fieldset><legend>{quiz[quizStep][0]}</legend>
              {quiz[quizStep][1].map((label,index) => <label className={`option ${quizAnswers[quizStep]===index?'selected':''}`} key={label}><input type="radio" name="answer" checked={quizAnswers[quizStep]===index} onChange={() => setQuizAnswers([...quizAnswers.slice(0,quizStep),index])}/><span className="radio-letter">{String.fromCharCode(65+index)}</span><span>{label}</span></label>)}
            </fieldset>
            <div className="quiz-actions"><button className="secondary" onClick={() => goTo('Materi')}>← Buka materi</button><button className="primary" disabled={quizAnswers[quizStep] === undefined} onClick={() => quizStep < 4 ? setQuizStep(quizStep+1) : setQuizResult(true)}>{quizStep < 4 ? 'Soal berikutnya →' : 'Lihat hasil'}</button></div></>}
          </div>
        </section>}

        {active === 'Tugas' && <section><header className="inner-header"><div><p className="eyebrow">RUANG TUGAS</p><h1>Tugas yang terarah</h1><p>{assignmentData.length ? 'Jawaban dan status pengumpulan tersimpan di server belajar.' : 'Status pengumpulan disimpan di perangkat ini.'}</p></div></header><div className="assignment-grid">{(assignmentData.length ? assignmentData : assignments).map(task=>{
          const serverTask = 'due_at' in task; const status = serverTask ? task.submission_status : (submitted.includes(task.id) ? 'submitted' : 'not_started');
          return <article className="assignment-card" key={task.id}><span>{task.subject}</span><h2>{task.title}</h2><p>{serverTask ? longDateTime.format(new Date(task.due_at)) : task.due}</p>{status === 'graded' ? <div className="teacher-note"><b>Nilai {serverTask ? task.score : ''}</b><p>{serverTask ? task.feedback : 'Sudut pandangmu bagus. Tambahkan contoh tindakan nyata.'}</p></div> : status === 'submitted' ? <div className="teacher-note"><b>Tugas sudah terkirim</b><p>Jawaban menunggu penilaian guru.</p></div> : <><textarea aria-label={`Jawaban ${task.title}`} placeholder="Tuliskan jawaban atau catatan untuk guru…" value={serverTask ? assignmentAnswers[task.id] ?? '' : undefined} onChange={serverTask ? event=>setAssignmentAnswers(current=>({...current,[task.id]:event.target.value})) : undefined}/><button className="primary" disabled={savingAssignment === String(task.id)} onClick={()=>submitTask(task.id)}>{savingAssignment === String(task.id) ? 'Mengirim…' : 'Kirim tugas'}</button></>}</article>;
        })}</div></section>}

        {active === 'Perpustakaan' && <section><header className="inner-header"><div><p className="eyebrow">EPERPUSTAKAAN</p><h1>Temukan bahan belajar</h1><p>Cari, simpan, dan lanjutkan bacaanmu.</p></div></header><input className="library-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari judul atau penulis…" aria-label="Cari buku"/><div className="library-grid">{shownLibrary.map(book=><article className="library-card" key={book.id}><div className="book-cover"><b>{book.code}</b><small>{book.progress?`${book.progress}% selesai`:'Belum dibaca'}</small></div><div><p>{book.author}</p><h2>{book.title}</h2><div className="progress"><span style={{width:`${book.progress}%`}}/></div><div className="book-actions"><button className="text-button" onClick={()=>goTo('Materi')}>{book.progress?'Lanjutkan':'Mulai baca'}</button><button className="save-book" onClick={()=>toggleBook(book.id)} aria-pressed={savedBooks.includes(book.id)}>{savedBooks.includes(book.id)?'★ Tersimpan':'☆ Simpan'}</button></div></div></article>)}</div>{shownLibrary.length === 0 && <div className="empty-state"><span aria-hidden="true">⌕</span><h1>Buku tidak ditemukan</h1><p>Coba gunakan kata kunci judul atau penulis yang berbeda.</p></div>}</section>}

        {active === 'Profil' && <section><header className="inner-header"><div><p className="eyebrow">PROFIL & PENGATURAN</p><h1>Ruang belajar milikmu</h1><p>Identitas dan progres berasal dari akun belajar. Preferensi tetap disimpan di perangkat ini.</p></div></header><div className="profile-settings-grid"><article className="student-profile-card"><span className="profile-avatar-large">{initials}</span><div><h2>{displayName}</h2><p>{profileData?.enrollment ? `${profileData.enrollment.program} · Kelas ${profileData.enrollment.grade_level}` : profileData?.role ?? 'Siswa'}</p><small>{profileData?.email ?? 'Memuat identitas…'}</small></div><dl><div><dt>Rangkaian</dt><dd>4 hari</dd></div><div><dt>Materi dimulai</dt><dd>{dashboardData?.progress?.started ?? 0}</dd></div><div><dt>Nilai rata-rata</dt><dd>{Math.round(dashboardData?.progress?.average_percent ?? 0)}</dd></div></dl></article><article className="preferences-card"><div><h2>Target belajar harian</h2><p>Pilih durasi yang realistis agar belajar tetap konsisten.</p><div className="setting-options">{[15,30,45,60].map(goal=><button key={goal} className={dailyGoal===goal?'active':''} onClick={()=>{setDailyGoal(goal);localStorage.setItem('rt-daily-goal',String(goal));setNotice(`Target belajar diubah menjadi ${goal} menit.`)}}>{goal} menit</button>)}</div></div><div className="setting-divider"/><label className="setting-toggle"><span><b>Pengingat belajar</b><small>Pengingat target harian dan tenggat tugas.</small></span><input type="checkbox" checked={reminders} onChange={e=>{setReminders(e.target.checked);localStorage.setItem('rt-reminders',String(e.target.checked))}}/></label><div className="setting-divider"/><div><h2>Ukuran tampilan</h2><p>Pilih kerapatan teks yang paling nyaman dibaca.</p><div className="setting-options">{['Ringkas','Nyaman','Besar'].map(mode=><button key={mode} className={readingMode===mode?'active':''} onClick={()=>{setReadingMode(mode);localStorage.setItem('rt-reading-mode',mode);setFontSize(mode==='Besar'?22:mode==='Ringkas'?16:18)}}>{mode}</button>)}</div></div><div className="setting-divider"/><button className="reset-button" onClick={()=>{localStorage.removeItem('rt-submitted');localStorage.removeItem('rt-books');localStorage.removeItem('rt-daily-goal');localStorage.removeItem('rt-reminders');localStorage.removeItem('rt-reading-mode');setSubmitted([]);setSavedBooks([]);setDailyGoal(30);setReminders(true);setReadingMode('Nyaman');setNotice('Progres dan preferensi lokal telah diatur ulang.')}}>Atur ulang progres lokal</button></article></div></section>}
      </main>

      <nav className="bottom-nav" aria-label="Navigasi seluler">
        {nav.slice(0,4).map((item, index) => <button key={item} className={active === item ? 'active' : ''} aria-current={active === item ? 'page' : undefined} onClick={() => goTo(item)}><span aria-hidden="true">{['⌂','▤','✓','□'][index]}</span>{item}</button>)}
      </nav>
    </div>
  );
}
