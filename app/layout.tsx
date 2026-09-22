import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./styles/foundation.css";
import "./styles/navigation.css";
import "./styles/dashboard.css";
import "./styles/courses.css";
import "./styles/responsive-shell.css";
import "./styles/material-reader.css";
import "./styles/quiz.css";
import "./styles/access-and-assignments.css";
import "./styles/library-and-profile.css";
import "./styles/teacher-grading.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RuangTumbuh — Belajar lebih terarah",
  description:
    "Ruang belajar digital yang jelas, ramah ponsel, dan membantu siswa berkembang setiap hari.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
