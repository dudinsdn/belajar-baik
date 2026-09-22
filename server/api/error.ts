export class ApiError extends Error {
  readonly code: "NOT_FOUND" | "CONFLICT" | "VALIDATION_ERROR";
  readonly status: 404 | 409 | 422;
  readonly fields?: Record<string, string>;

  constructor(
    code: "NOT_FOUND" | "CONFLICT" | "VALIDATION_ERROR",
    status: 404 | 409 | 422,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}
