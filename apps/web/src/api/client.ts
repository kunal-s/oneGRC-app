/**
 * The API client.
 *
 * `credentials: include` matters: the session is an httpOnly cookie, so the
 * browser must be told to send it cross-origin in dev (the API is on :3000,
 * Vite on :5173). Same-origin behind a reverse proxy in production.
 */
const BASE =
  import.meta.env.VITE_API_BASE ??
  `${window.location.protocol}//${window.location.hostname}:3000/api`

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    // A bodyless request must never declare a JSON content type: Fastify's
    // body parser refuses an empty body carrying `Content-Type:
    // application/json` with its own 400.
    headers: init?.body === undefined ? init?.headers : { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { message?: string | string[] }
      if (body.message) message = Array.isArray(body.message) ? body.message.join('; ') : body.message
    } catch {
      /* keep the status text */
    }
    if (res.status === 401) {
      // Say what is actually wrong. A signed-out user shown "no records" would
      // reasonably conclude the register is empty.
      throw new ApiError(401, 'Not signed in. Pick a person in the dev identity bar below.')
    }
    throw new ApiError(res.status, message)
  }
  return (await res.json()) as T
}

async function requestForm<T>(path: string, form: FormData): Promise<T> {
  // No Content-Type header here: the browser sets multipart/form-data with
  // its own boundary, and setting it by hand loses the boundary parameter.
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body: form, credentials: 'include' })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { message?: string | string[] }
      if (body.message) message = Array.isArray(body.message) ? body.message.join('; ') : body.message
    } catch {
      /* keep the status text */
    }
    throw new ApiError(res.status, message)
  }
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  /** A multipart POST, for the one intake (FIL-001). Field order matters: the
   * server reads a file part with `req.file()`, so append every text field to
   * `form` before the file, or they may arrive too late to be read. */
  postForm: <T>(path: string, form: FormData) => requestForm<T>(path, form),
  /** Absolute URL, for links the browser follows itself (a PDF, an export). */
  url: (path: string) => `${BASE}${path}`,
}
