import { createClient } from '@base44/sdk'
import { mockBase44 } from './mockBase44Client'

const FALLBACK_APP_ID = '68ea91a66a9614db4a82043d'

const getEnvVar = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
    return import.meta.env[key]
  }

  const nodeEnv = globalThis?.process?.env?.[key]
  if (nodeEnv) {
    return nodeEnv
  }

  return undefined
}

const toBool = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

const useMock = toBool(getEnvVar('VITE_MOCK_MODE'), true)

const openAuth = () => {
  const user = {
    id: 'demo-user',
    name: 'Usuário Demo',
    email: 'demo@example.com',
    settings: {}
  }

  return {
    async me() {
      return user
    },
    async updateMe(payload = {}) {
      Object.assign(user, payload)
      return user
    },
    async logout() {
      return { ok: true }
    }
  }
}

let base44Client = mockBase44

if (!useMock) {
  const appId = getEnvVar('VITE_BASE44_APP_ID') ?? FALLBACK_APP_ID

  if (appId === FALLBACK_APP_ID) {
    console.warn(
      'VITE_BASE44_APP_ID was not provided. Falling back to the default app id. Configure this env variable in Netlify for production deployments.'
    )
  }

  base44Client = createClient({
    appId,
    requiresAuth: false
  })
}

if (!base44Client.auth) {
  base44Client.auth = openAuth()
}

export const base44 = base44Client
export const isMockedBase44 = useMock
