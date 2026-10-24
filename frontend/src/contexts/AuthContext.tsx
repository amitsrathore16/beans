import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { migrateFromLocalStorage } from '../utils/migration'
import { fetchOwnProfile } from '../hooks/useProfile'
import type { Profile } from '../hooks/useProfile'

// 'error' is distinct from 'missing' so a failed fetch (network, migration not
// yet applied) never traps users on the setup page.
export type ProfileStatus = 'loading' | 'missing' | 'ready' | 'error'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  profile: Profile | null
  profileStatus: ProfileStatus
  refreshProfile: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('loading')
  const userId = user?.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session) migrateFromLocalStorage().catch(() => {})
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!userId) { setProfile(null); setProfileStatus('loading'); return }
    try {
      const p = await fetchOwnProfile(userId)
      setProfile(p)
      setProfileStatus(p ? 'ready' : 'missing')
    } catch {
      setProfileStatus('error')
    }
  }, [userId])

  useEffect(() => {
    setProfileStatus('loading')
    refreshProfile()
  }, [refreshProfile])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, profile, profileStatus, refreshProfile, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
