/**
 * Same-origin fetch helper. /api/* is proxied to the NestJS backend by
 * next.config rewrites; the session lives in an httpOnly cookie, so no
 * Authorization header is needed in the browser.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(typeof init.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
    },
    credentials: "same-origin",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const b = body as { error?: string; message?: string | string[] };
    // Nest ValidationPipe menaruh detail di message (bisa array); "error"
    // cuma label generik ("Bad Request") — tampilkan yang informatif.
    const msg = Array.isArray(b.message) ? b.message[0] : b.message;
    throw new Error(msg ?? b.error ?? `Request gagal (${res.status})`);
  }
  return body as T;
}
