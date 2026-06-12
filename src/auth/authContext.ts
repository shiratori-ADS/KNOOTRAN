import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type AuthContextValue = {
  loading: boolean
  session: Session | null
  email: string | null
  /** Supabase が設定されていればログイン必須 */
  cloudAuthEnabled: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
