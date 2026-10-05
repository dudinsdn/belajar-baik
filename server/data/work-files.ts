import { env } from "cloudflare:workers";
import type { CurrentUser } from "../auth/types.ts";
import { requireRole } from "../auth/index.ts";
import { ApiError } from "../api/error.ts";
import { workSubmission, submissionDetail } from "./work-access.ts";
import { commitWork } from "./work-mutations.ts";
import { invalid, text, version } from "./work-validation.ts";
const MAX = 1024 * 1024;
export function detectFile(bytes: Uint8Array) {
  const prefix = new TextDecoder().decode(bytes.slice(0, 12));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n))
    return "image/png";
  if (prefix.startsWith("%PDF-")) return "application/pdf";
  if (prefix.startsWith("RIFF") && prefix.slice(8, 12) === "WAVE")
    return "audio/wav";
  if (prefix.startsWith("OggS")) return "audio/ogg";
  if (
    prefix.startsWith("ID3") ||
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
  )
    return "audio/mpeg";
  return invalid("Gunakan JPEG, PNG, PDF, MP3, WAV, atau OGG yang valid.");
}
export async function uploadWorkFile(
  user: CurrentUser,
  id: string,
  file: File,
  expected: unknown,
) {
  requireRole(user, "student");
  const sub = await workSubmission(user, id),
    v = version(expected);
  if (sub.status !== "draft" || Number(sub.version) !== v)
    throw new ApiError(
      "CONFLICT",
      409,
      "Draf berubah atau sudah dikirim. Muat ulang karya.",
    );
  if (!file.size || file.size > MAX)
    return invalid(
      "Ukuran berkas harus 1 byte–1 MB. Gunakan tautan untuk berkas besar.",
    );
  const stats = await env.DB.prepare(
    "SELECT COUNT(*) AS count,SUM(size) AS total FROM work_files WHERE submission_id=?",
  )
    .bind(id)
    .first<{ count: number; total: number }>();
  if ((stats?.count ?? 0) >= 5 || (stats?.total ?? 0) + file.size > 3 * MAX)
    return invalid("Maksimal 5 berkas, total 3 MB per karya.");
  const bytes = new Uint8Array(await file.arrayBuffer()),
    mime = detectFile(bytes);
  if (file.type !== mime)
    return invalid("Jenis berkas tidak sesuai isi berkas.");
  const name = text(file.name, 150).replace(/[\/\\\r\n\x00-\x1f]/g, "_");
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const fileId = crypto.randomUUID();
  await commitWork(
    user,
    sub,
    v,
    "upload",
    { fileId, name, mime, size: file.size },
    [
      env.DB.prepare("INSERT INTO work_files VALUES(?,?,?,?,?,?,?)").bind(
        fileId,
        id,
        name,
        mime,
        btoa(binary),
        file.size,
        new Date().toISOString(),
      ),
    ],
  );
  return submissionDetail(user, id);
}
export async function downloadWorkFile(user: CurrentUser, id: string) {
  const file = await env.DB.prepare("SELECT * FROM work_files WHERE id=?")
    .bind(id)
    .first<{
      submission_id: string;
      data: string;
      mime: string;
      name: string;
    }>();
  if (!file) throw new ApiError("NOT_FOUND", 404, "Berkas tidak ditemukan.");
  await workSubmission(user, file.submission_id);
  const bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      "content-type": file.mime,
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
