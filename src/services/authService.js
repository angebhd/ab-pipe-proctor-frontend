import { apiClient } from './apiClient'

function normalizeUser(payload, fallbackUser = null) {
  const firstName = payload?.first_name ?? payload?.user?.first_name ?? null
  const lastName = payload?.last_name ?? payload?.user?.last_name ?? null
  const email = payload?.email_address ?? payload?.email ?? payload?.user?.email_address ?? payload?.user?.email ?? null
  const department = payload?.department_name ?? payload?.department ?? payload?.user?.department_name ?? null

  return payload?.user ?? fallbackUser ?? {
    id: payload?.id ?? payload?.user?.id ?? null,
    email,
    first_name: firstName,
    last_name: lastName,
    department_name: department,
    name: [firstName, lastName].filter(Boolean).join(' ') || payload?.name || payload?.full_name || null,
    role: payload?.role ?? 'User',
  }
}

function normalizeSession(payload, fallbackUser = null) {
  const token = payload?.access_token ?? payload?.token ?? payload?.jwt ?? null
  const user = normalizeUser(payload, fallbackUser)

  if (!token) {
    throw new Error('Authentication response did not include a token.')
  }

  return { token, user }
}

export const authService = {
  login: async (credentials) => {
    const requestBody = {
      email_address: credentials.email_address ?? credentials.email ?? '',
      password: credentials.password,
    }

    const response = await apiClient.post('/api/v1/auth/login', requestBody)
    return normalizeSession(response, {
      email: requestBody.email_address,
      first_name: '',
      last_name: '',
      department_name: '',
      role: 'User',
    })
  },

  register: async (payload) => {
    const requestBody = {
      first_name: payload.first_name ?? payload.firstName ?? '',
      last_name: payload.last_name ?? payload.lastName ?? '',
      email_address: payload.email_address ?? payload.email ?? '',
      department_name: payload.department_name ?? payload.department ?? '',
      password: payload.password,
    }

    const response = await apiClient.post('/api/v1/auth/register', requestBody)
    return normalizeSession(response, {
      email: requestBody.email_address,
      first_name: requestBody.first_name,
      last_name: requestBody.last_name,
      department_name: requestBody.department_name,
      role: 'User',
    })
  },

  me: async (token) => {
    const response = await apiClient.get('/api/v1/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return normalizeUser(response)
  },

  updateProfile: async (token, profile) => {
    if (!token) {
      throw new Error('Your session expired. Please sign in again.')
    }

    const payload = {
      first_name: profile.first_name,
      last_name: profile.last_name,
      email_address: profile.email_address,
      department_name: profile.department_name,
    }

    const response = await apiClient.patch('/api/v1/auth/me', payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return normalizeUser(response)
  },

  logout: async () => {
    return true
  },
}
