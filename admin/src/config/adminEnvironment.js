const STORAGE_KEY = 'admin_api_environment'

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

export const ADMIN_ENVIRONMENTS = [
  {
    key: 'local',
    label: 'Local',
    shortLabel: 'Local',
    tagType: 'info',
    origin: '',
    description: 'Use the current origin or Vite dev proxy'
  },
  {
    key: 'staging',
    label: 'Staging',
    shortLabel: 'ST',
    tagType: 'warning',
    origin: normalizeOrigin(import.meta.env.VITE_ADMIN_API_STAGING_URL),
    description: 'Connect to the staging backend'
  },
  {
    key: 'production',
    label: 'Production',
    shortLabel: 'Prod',
    tagType: 'danger',
    origin: normalizeOrigin(import.meta.env.VITE_ADMIN_API_PROD_URL),
    description: 'Connect to the production backend'
  }
]

export function isAdminEnvironmentConfigured(env) {
  return env.key === 'local' || Boolean(env.origin)
}

export function getAdminEnvironmentByKey(key) {
  return ADMIN_ENVIRONMENTS.find((env) => env.key === key)
}

export function getCurrentAdminEnvironment() {
  const preferredKey = localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_ADMIN_API_DEFAULT_ENV || 'local'
  const preferred = getAdminEnvironmentByKey(preferredKey)

  if (preferred && isAdminEnvironmentConfigured(preferred)) {
    return preferred
  }

  return getAdminEnvironmentByKey('local')
}

export function setCurrentAdminEnvironment(key) {
  const env = getAdminEnvironmentByKey(key)

  if (!env) {
    throw new Error(`Unknown admin environment: ${key}`)
  }

  if (!isAdminEnvironmentConfigured(env)) {
    throw new Error(`${env.label} API URL is not configured`)
  }

  localStorage.setItem(STORAGE_KEY, env.key)
  window.dispatchEvent(new CustomEvent('admin-api-environment-changed', { detail: env }))
  return env
}

function joinApiBase(path) {
  const env = getCurrentAdminEnvironment()
  return env.origin ? `${env.origin}${path}` : path
}

export function getAdminApiBaseUrl() {
  return joinApiBase('/api/admin')
}

export function getPublicApiBaseUrl() {
  return joinApiBase('/api')
}
