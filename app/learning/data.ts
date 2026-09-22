export const courses = [
  {
    code: "SEJ",
    title: "Sejarah Indonesia",
    teacher: "Pak Adi Rama",
    progress: 68,
    tone: "coral",
    next: "Lanjut: Perjuangan mempertahankan kemerdekaan",
  },
  {
    code: "MAT",
    title: "Matematika",
    teacher: "Bu Ratna Sari",
    progress: 42,
    tone: "blue",
    next: "Lanjut: Persamaan kuadrat",
  },
  {
    code: "ING",
    title: "Bahasa Inggris",
    teacher: "Mr. Farhan",
    progress: 81,
    tone: "green",
    next: "Lanjut: Narrative text",
  },
];

export const studentNav = [
  "Beranda",
  "Materi",
  "Latihan",
  "Tugas",
  "Perpustakaan",
];

export const assignments = [
  {
    id: 1,
    subject: "Matematika",
    title: "Latihan Persamaan Kuadrat",
    due: "Hari ini · 20.00",
  },
  {
    id: 2,
    subject: "Bahasa Inggris",
    title: "Ringkasan Narrative Text",
    due: "Besok · 18.00",
  },
  {
    id: 3,
    subject: "Sejarah",
    title: "Refleksi Pertempuran Surabaya",
    due: "Dinilai · 88",
  },
];

export const library = [
  {
    id: 1,
    code: "SEJ",
    title: "Indonesia Mempertahankan Kemerdekaan",
    author: "Tim Sejarah Nasional",
    progress: 43,
  },
  {
    id: 2,
    code: "MAT",
    title: "Aljabar dalam Kehidupan Sehari-hari",
    author: "Ratna Sari",
    progress: 18,
  },
  {
    id: 3,
    code: "ING",
    title: "Everyday English Stories",
    author: "Farhan Akbar",
    progress: 0,
  },
];

export const quiz = [
  [
    "Apa dampak strategis Pertempuran Surabaya?",
    [
      "Pengakuan langsung Belanda",
      "Sekutu pergi keesokan hari",
      "Menarik perhatian dunia dan memperkuat legitimasi perjuangan",
      "Pusat pemerintahan pindah",
    ],
    2,
  ],
  [
    "Mengapa 10 November diperingati sebagai Hari Pahlawan?",
    [
      "Hari Proklamasi",
      "Puncak perlawanan rakyat Surabaya",
      "Hari pengakuan kedaulatan",
      "Hari pembentukan pemerintahan",
    ],
    1,
  ],
  [
    "Siapa tokoh yang membakar semangat arek-arek Surabaya?",
    ["Bung Tomo", "Mohammad Hatta", "Jenderal Sudirman", "Sutan Sjahrir"],
    0,
  ],
  [
    "Apa cara diplomasi Indonesia mempertahankan kemerdekaan?",
    [
      "Menutup hubungan luar negeri",
      "Menyerahkan pemerintahan",
      "Mencari pengakuan internasional",
      "Menghentikan pemerintahan",
    ],
    2,
  ],
  [
    "Nilai utama dari Pertempuran Surabaya adalah…",
    [
      "Kepentingan pribadi",
      "Keberanian, persatuan, dan rela berkorban",
      "Menghindari perubahan",
      "Menyerahkan keputusan",
    ],
    1,
  ],
] as const;

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
