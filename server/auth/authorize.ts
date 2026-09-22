import { AuthError } from "./errors.ts";
import type { CurrentUser, UserRole } from "./types.ts";

export function requireRole(user: CurrentUser, ...allowed: UserRole[]) {
  if (!allowed.includes(user.role))
    throw new AuthError(
      "FORBIDDEN",
      403,
      "You do not have permission for this action.",
    );
}

export function requireOwnUser(user: CurrentUser, targetUserId: string) {
  if (user.role !== "admin" && user.id !== targetUserId)
    throw new AuthError(
      "FORBIDDEN",
      403,
      "You cannot access another user’s record.",
    );
}

export function requireClassAccess(
  user: CurrentUser,
  classAccess: { teacherId: string; studentIds: readonly string[] },
  mode: "read" | "manage",
) {
  if (user.role === "admin") return;
  if (user.role === "teacher" && user.id === classAccess.teacherId) return;
  if (
    mode === "read" &&
    user.role === "student" &&
    classAccess.studentIds.includes(user.id)
  )
    return;
  throw new AuthError(
    "FORBIDDEN",
    403,
    "You do not have access to this class.",
  );
}
