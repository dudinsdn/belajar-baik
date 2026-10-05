import type { ApiEnvelope } from "./types";

async function fetchApi(url: string, options?: RequestInit) {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error(
      "Koneksi terganggu. Periksa jaringan dan muat ulang data sebelum mencoba lagi.",
    );
  }
}

export async function readApi<T>(url: string, signal?: AbortSignal) {
  const response = await fetchApi(url, { signal });
  const body = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || body.error)
    throw new Error(body.error?.message ?? "Data tidak dapat dimuat.");
  return body.data as T;
}

export async function writeApi<T>(url: string, method: string, body?: unknown) {
  const response = await fetchApi(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || payload.error)
    throw new Error(payload.error?.message ?? "Data gagal disimpan.");
  return payload.data as T;
}
