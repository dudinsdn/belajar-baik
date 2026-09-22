import { env } from "cloudflare:workers";
import { ApiError } from "../api/error.ts";
import type { CurrentUser } from "../auth/types.ts";

export async function updateMaterialProgress(
  user: CurrentUser,
  materialId: string,
  progress: { percent: number; lastPosition: string | null },
) {
  const material = await env.DB.prepare(
    `SELECT m.id FROM class_memberships cm
    JOIN class_subjects cs ON cs.class_id = cm.class_id JOIN materials m ON m.class_subject_id = cs.id
    WHERE cm.student_id = ? AND cm.status = 'active' AND m.id = ? AND m.status = 'published' LIMIT 1`,
  )
    .bind(user.id, materialId)
    .first();
  if (!material)
    throw new ApiError("NOT_FOUND", 404, "Materi tidak ditemukan.");
  const now = new Date().toISOString();
  const completedAt = progress.percent === 100 ? now : null;
  await env.DB.prepare(
    `INSERT INTO material_progress (material_id, student_id, percent, last_position, completed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(material_id, student_id) DO UPDATE SET
    percent = excluded.percent, last_position = excluded.last_position, completed_at = excluded.completed_at, updated_at = excluded.updated_at`,
  )
    .bind(
      materialId,
      user.id,
      progress.percent,
      progress.lastPosition,
      completedAt,
      now,
    )
    .run();
  return {
    materialId,
    studentId: user.id,
    ...progress,
    completedAt,
    updatedAt: now,
  };
}

export async function updateLibraryProgress(
  user: CurrentUser,
  itemId: string,
  progress: {
    percent: number;
    lastPosition: string | null;
    bookmarked: boolean;
  },
) {
  const item = await env.DB.prepare(
    `SELECT id FROM library_items WHERE id = ? AND status = 'published' LIMIT 1`,
  )
    .bind(itemId)
    .first();
  if (!item) throw new ApiError("NOT_FOUND", 404, "Buku tidak ditemukan.");
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO library_progress (library_item_id, student_id, percent, last_position, bookmarked, updated_at)
    VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(library_item_id, student_id) DO UPDATE SET
    percent = excluded.percent, last_position = excluded.last_position, bookmarked = excluded.bookmarked, updated_at = excluded.updated_at`,
  )
    .bind(
      itemId,
      user.id,
      progress.percent,
      progress.lastPosition,
      progress.bookmarked ? 1 : 0,
      now,
    )
    .run();
  return { itemId, studentId: user.id, ...progress, updatedAt: now };
}
