import { getAuthToken } from './authToken'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'

interface ApiErrorPayload {
  message?: string
  errors?: Array<{ path?: string; message?: string }>
}

export class ApiError extends Error {
  public readonly status: number
  public readonly details?: ApiErrorPayload

  constructor(status: number, message: string, details?: ApiErrorPayload) {
    super(message)
    this.status = status
    this.details = details
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(`${API_BASE_URL}${path}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url.toString()
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { query, headers, body, ...rest } = options
  const isFormData = body instanceof FormData
  const token = await getAuthToken()

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  })

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined
    try {
      payload = (await response.json()) as ApiErrorPayload
    } catch {
      payload = undefined
    }

    throw new ApiError(response.status, payload?.message ?? 'Request failed', payload)
  }

  return (await response.json()) as T
}

// Reads the filename the server suggests in Content-Disposition, if any.
function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null
  const match = /filename="?([^"]+)"?/i.exec(header)
  return match ? match[1] : null
}

/**
 * Authenticated fetch for binary/file responses (e.g. a CSV export). Unlike
 * apiRequest it returns the raw Blob plus the server-suggested filename, so the
 * caller can trigger a browser download. The Authorization header is why this
 * can't be a plain <a href> link.
 */
export async function apiDownload(
  path: string,
  options: { query?: RequestOptions['query'] } = {},
): Promise<{ blob: Blob; filename: string | null }> {
  const token = await getAuthToken()

  const response = await fetch(buildUrl(path, options.query), {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined
    try {
      payload = (await response.json()) as ApiErrorPayload
    } catch {
      payload = undefined
    }

    throw new ApiError(response.status, payload?.message ?? 'Request failed', payload)
  }

  const filename = parseContentDispositionFilename(response.headers.get('Content-Disposition'))
  const blob = await response.blob()
  return { blob, filename }
}
