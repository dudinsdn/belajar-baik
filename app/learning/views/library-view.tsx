type Book = {
  id: number | string;
  code: string;
  title: string;
  author: string;
  progress: number;
  bookmarked: boolean;
};
type Props = {
  books: Book[];
  query: string;
  saving: string | null;
  setQuery: (value: string) => void;
  advance: (id: string) => void;
  toggle: (id: number | string) => void;
  goTo: (destination: string) => void;
};

export function LibraryView({
  books,
  query,
  saving,
  setQuery,
  advance,
  toggle,
  goTo,
}: Props) {
  return (
    <section>
      <header className="inner-header">
        <div>
          <p className="eyebrow">EPERPUSTAKAAN</p>
          <h1>Temukan bahan belajar</h1>
          <p>Cari, simpan, dan lanjutkan bacaanmu.</p>
        </div>
      </header>
      <input
        className="library-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Cari judul atau penulis…"
        aria-label="Cari buku"
      />
      <div className="library-grid">
        {books.map((book) => (
          <article className="library-card" key={book.id}>
            <div className="book-cover">
              <b>{book.code}</b>
              <small>
                {book.progress ? `${book.progress}% selesai` : "Belum dibaca"}
              </small>
            </div>
            <div>
              <p>{book.author}</p>
              <h2>{book.title}</h2>
              <div className="progress">
                <span style={{ width: `${book.progress}%` }} />
              </div>
              <div className="book-actions">
                <button
                  className="text-button"
                  disabled={saving === String(book.id)}
                  onClick={() =>
                    typeof book.id === "string"
                      ? advance(book.id)
                      : goTo("Materi")
                  }
                >
                  {typeof book.id === "string"
                    ? "Catat +10%"
                    : book.progress
                      ? "Lanjutkan"
                      : "Mulai baca"}
                </button>
                <button
                  className="save-book"
                  disabled={saving === String(book.id)}
                  onClick={() => toggle(book.id)}
                  aria-pressed={book.bookmarked}
                >
                  {book.bookmarked ? "★ Tersimpan" : "☆ Simpan"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!books.length && (
        <div className="empty-state">
          <span aria-hidden="true">⌕</span>
          <h1>Buku tidak ditemukan</h1>
          <p>Coba gunakan kata kunci judul atau penulis yang berbeda.</p>
        </div>
      )}
    </section>
  );
}
