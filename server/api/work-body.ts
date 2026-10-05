import { ApiError } from "./error.ts";
export async function boundedBody(request: Request, max = 32000) {
  const reader = request.body?.getReader();
  if (!reader)
    throw new ApiError("VALIDATION_ERROR", 422, "Formulir wajib diisi.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new ApiError(
        "VALIDATION_ERROR",
        422,
        "Berkas atau formulir terlalu besar.",
      );
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return bytes;
}
export async function workBody(request: Request) {
  const bytes = await boundedBody(request);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError("VALIDATION_ERROR", 422, "JSON tidak valid.");
  }
}
