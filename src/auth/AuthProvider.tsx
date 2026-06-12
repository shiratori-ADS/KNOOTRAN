import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isCloudConfigured, signInWithPassword, signOutCloud, signUpWithPassword } from '../lib/cloudAutoSync'
import { supabase } from '../lib/supabaseClient'
import { AuthContext } from './authContext'
import type { AuthContextValue } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(() => isCloudConfigured())
  const [session, setSession] = useState<Session | null>(null)
  const cloudAuthEnabled = isCloudConfigured()

  useEffect(() => {
    if (!supabase) return

    let mounted = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithPassword(email, password)
    const { data } = await supabase!.auth.getSession()
    setSession(data.session)
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    await signUpWithPassword(email, password)
    const { data } = await supabase!.auth.getSession()
    setSession(data.session)
  }, [])

  const signOut = useCallback(async () => {
    await signOutCloud()
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      email: session?.user?.email ?? null,
      cloudAuthEnabled,
      isAuthenticated: !cloudAuthEnabled || !!session,
      signIn,
      signUp,
      signOut,
    }),
    [loading, session, cloudAuthEnabled, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
