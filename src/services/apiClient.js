const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export function stringifyApiError(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyApiError(item))
      .filter(Boolean)
      .join(', ')
  }

  if (value && typeof value === 'object') {
    if (typeof value.message === 'string' && value.message.trim()) return value.message
    if (typeof value.msg === 'string' && value.msg.trim()) return value.msg
    if (typeof value.error === 'string' && value.error.trim()) return value.error
    if (typeof value.detail !== 'undefined') return stringifyApiError(value.detail)

    const firstEntry = Object.values(value)[0]
    if (firstEntry) return stringifyApiError(firstEntry)

    return JSON.stringify(value)
  }

  return String(value ?? 'Request failed')
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}


export async function request(path, { method = 'GET', body, headers, ...options } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })

  return readResponse(response)
}

/**
 * Multipart upload. The browser has to set `Content-Type` itself so the
 * multipart boundary matches the body, so no content type is sent here.
 */
export async function requestForm(path, formData, { method = 'POST', headers, ...options } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    body: formData,
  })

  return readResponse(response)
}

async function readResponse(response) {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const detailMessage = stringifyApiError(
      payload?.detail ?? payload?.message ?? payload?.error ?? 'Request failed',
    )
    throw new ApiError(detailMessage, response.status)
  }

  return payload
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
  postForm: (path, formData, options) => requestForm(path, formData, options),
}
