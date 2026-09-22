import type { Dispatch, SetStateAction } from "react";
import type { LibraryData, MaterialData } from "../types";
import { writeApi } from "../request";

type Params = {
  books: LibraryData[];
  setBooks: Dispatch<SetStateAction<LibraryData[]>>;
  materials: MaterialData[];
  saved: number[];
  setSaved: Dispatch<SetStateAction<number[]>>;
  bookmarked: boolean;
  setBookmarked: Dispatch<SetStateAction<boolean>>;
  setSaving: Dispatch<SetStateAction<string | null>>;
  setNotice: Dispatch<SetStateAction<string>>;
};
export function createLibraryActions(p: Params) {
  const toggle = async (id: number | string) => {
    if (typeof id === "number") {
      const next = p.saved.includes(id)
        ? p.saved.filter((item) => item !== id)
        : [...p.saved, id];
      p.setSaved(next);
      localStorage.setItem("rt-books", JSON.stringify(next));
      return;
    }
    const book = p.books.find((item) => item.id === id);
    if (!book) return;
    p.setSaving(id);
    try {
      await writeApi(`/api/v1/library/${id}/progress`, "PUT", {
        percent: book.percent,
        lastPosition: book.last_position,
        bookmarked: !Boolean(book.bookmarked),
      });
      p.setBooks((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, bookmarked: item.bookmarked ? 0 : 1 }
            : item,
        ),
      );
      p.setNotice(
        book.bookmarked
          ? "Buku dihapus dari daftar tersimpan."
          : "Buku disimpan ke akun belajar.",
      );
    } catch (error) {
      p.setNotice(
        error instanceof Error ? error.message : "Buku gagal disimpan.",
      );
    } finally {
      p.setSaving(null);
    }
  };
  const advance = async (id: string) => {
    const book = p.books.find((item) => item.id === id);
    if (!book) return;
    const percent = Math.min(100, book.percent + 10);
    p.setSaving(id);
    try {
      await writeApi(`/api/v1/library/${id}/progress`, "PUT", {
        percent,
        lastPosition: `progres-${percent}`,
        bookmarked: Boolean(book.bookmarked),
      });
      p.setBooks((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, percent, last_position: `progres-${percent}` }
            : item,
        ),
      );
      p.setNotice(`Progres buku diperbarui menjadi ${percent}%.`);
    } catch (error) {
      p.setNotice(
        error instanceof Error ? error.message : "Progres gagal disimpan.",
      );
    } finally {
      p.setSaving(null);
    }
  };
  const saveMaterial = async () => {
    const material = p.materials[0];
    if (!material) {
      p.setBookmarked(!p.bookmarked);
      return;
    }
    p.setSaving(material.id);
    try {
      await writeApi(`/api/v1/materials/${material.id}/progress`, "PUT", {
        percent: material.percent,
        lastPosition: material.last_position ?? "halaman-12",
      });
      p.setBookmarked(true);
      p.setNotice("Posisi dan progres materi disimpan ke akun belajar.");
    } catch (error) {
      p.setNotice(
        error instanceof Error
          ? error.message
          : "Progres materi gagal disimpan.",
      );
    } finally {
      p.setSaving(null);
    }
  };
  return { toggle, advance, saveMaterial };
}
