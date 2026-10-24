import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced', 'professional'] as const
export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number]

export const ORIGINS = [
  'Brazil', 'Burundi', 'Colombia', 'Costa Rica', 'El Salvador', 'Ethiopia', 'Guatemala',
  'Honduras', 'India', 'Indonesia', 'Kenya', 'Mexico', 'Panama', 'Peru', 'Rwanda', 'Yemen',
]

export const INTERESTS = [
  'Espresso', 'Filter', 'Latte art', 'Home roasting', 'Cupping',
  'Specialty cafés', 'Equipment', 'Cold brew',
]

export interface Profile {
  user_id: string
  username: string
  display_name: string
  bio?: string | null
  location?: string | null
  avatar_url?: string | null
  experience_level?: ExperienceLevel | null
  brew_methods: string[]
  origins: string[]
  roast_levels: string[]
  interests: string[]
  primary_brewer?: string | null
  grinder?: string | null
  social_links: string[]
  is_public: boolean
  created_at: string
}

export type ProfilePayload = Omit<Profile, 'user_id' | 'created_at'>

export interface ProfileStats {
  total_brews: number
  cafe_visits: number
  brews_last_30: number
  top_method: string | null
}

export async function fetchOwnProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  return data as Profile | null
}

// Insert on first setup, update afterwards. Not an upsert: ON CONFLICT DO UPDATE
// would need an UPDATE grant on user_id, which the client deliberately lacks.
export async function saveProfile(userId: string, payload: ProfilePayload, exists: boolean): Promise<void> {
  const { error } = exists
    ? await supabase.from('profiles').update(payload).eq('user_id', userId)
    : await supabase.from('profiles').insert({ ...payload, user_id: userId })
  if (error) {
    // 23505 = unique_violation; username is the only unique user-set column.
    throw new Error(error.code === '23505' ? 'That username is taken' : error.message)
  }
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const path = `${userId}/avatar`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw new Error(error.message)
  // Same path every time, so bust caches with a version param.
  return `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
}

// Brewer/grinder names the user has typed in past logs, for <datalist> suggestions.
export function useEquipmentSuggestions() {
  const [suggestions, setSuggestions] = useState<{ brewers: string[]; grinders: string[] }>({ brewers: [], grinders: [] })
  useEffect(() => {
    supabase.from('logs').select('equipment, grinder').is('deleted_at', null).then(({ data }) => {
      const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))]
      setSuggestions({
        brewers:  uniq((data ?? []).map(r => r.equipment)),
        grinders: uniq((data ?? []).map(r => r.grinder)),
      })
    })
  }, [])
  return suggestions
}

export function usePublicProfile(username: string) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      // RLS returns nothing for someone else's private profile — same as not found.
      const { data, error } = await supabase.from('profiles').select('*').eq('username', username.toLowerCase()).maybeSingle()
      if (cancelled) return
      if (error) { setError(error.message); setLoading(false); return }
      setProfile(data as Profile | null)
      if (data) {
        const { data: s } = await supabase.rpc('profile_stats', { p_user_id: data.user_id })
        if (!cancelled) setStats(s as ProfileStats | null)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [username])

  return { profile, stats, loading, error }
}
