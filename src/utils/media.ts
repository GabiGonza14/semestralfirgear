const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'
const apiOrigin = new URL(apiBaseUrl).origin

export function resolveMediaUrl(path: string) {
  if (!path) {
    return path
  }

  if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }

  if (path.startsWith('/')) {
    return `${apiOrigin}${path}`
  }

  return `${apiOrigin}/${path}`
}
