export const studentNav = [
  "Beranda",
  "Materi",
  "Latihan",
  "Tugas",
  "Perpustakaan",
];

export const shortDateTime = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});
export const longDateTime = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});
export const longDate = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "full",
  timeZone: "Asia/Jakarta",
});
