export class AuthError extends Error {
  readonly code: "UNAUTHENTICATED" | "FORBIDDEN";
  readonly status: 401 | 403;

  constructor(
    code: "UNAUTHENTICATED" | "FORBIDDEN",
    status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}
