import { supabase } from './supabaseClient'

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string

async function getAuthHeader(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return `Bearer ${session.access_token}`
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authorization = await getAuthHeader()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      authorization,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}
