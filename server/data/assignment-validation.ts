import { ApiError } from "../api/error.ts";

export function parseAnswerText(input: unknown, required = false) {
  if (
    !input ||
    typeof input !== "object" ||
    !("answerText" in input) ||
    typeof input.answerText !== "string"
  ) {
    throw new ApiError(
      "VALIDATION_ERROR",
      422,
      "Data yang dikirim belum lengkap.",
      { answerText: "Jawaban harus berupa teks." },
    );
  }
  const answerText = input.answerText.trim();
  if (required && !answerText)
    throw new ApiError("VALIDATION_ERROR", 422, "Jawaban wajib diisi.", {
      answerText: "Jawaban wajib diisi.",
    });
  if (answerText.length > 5000)
    throw new ApiError("VALIDATION_ERROR", 422, "Jawaban terlalu panjang.", {
      answerText: "Maksimal 5.000 karakter.",
    });
  return answerText;
}

export function parseGrade(input: unknown) {
  if (!input || typeof input !== "object") {
    throw new ApiError(
      "VALIDATION_ERROR",
      422,
      "Data penilaian belum lengkap.",
    );
  }
  const { score, feedback } = input as { score?: unknown; feedback?: unknown };
  if (
    !Number.isInteger(score) ||
    (score as number) < 0 ||
    (score as number) > 100
  ) {
    throw new ApiError(
      "VALIDATION_ERROR",
      422,
      "Nilai harus berupa bilangan bulat 0–100.",
      { score: "Gunakan bilangan bulat dari 0 sampai 100." },
    );
  }
  if (typeof feedback !== "string" || !feedback.trim()) {
    throw new ApiError("VALIDATION_ERROR", 422, "Umpan balik wajib diisi.", {
      feedback: "Tuliskan umpan balik untuk siswa.",
    });
  }
  const normalizedFeedback = feedback.trim();
  if (normalizedFeedback.length > 2000) {
    throw new ApiError(
      "VALIDATION_ERROR",
      422,
      "Umpan balik terlalu panjang.",
      { feedback: "Maksimal 2.000 karakter." },
    );
  }
  return { score: score as number, feedback: normalizedFeedback };
}
