import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

let _supabase: any
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase env variables. Copy .env.example to .env.local and fill values.')
  // Provide a minimal stub so imports don't throw during tests or in environments
  // where env vars are not set (e.g. CI without secrets).
  _supabase = {
    from: () => ({ select: async () => ({ data: null, error: null }) }),
    auth: {
      signIn: async () => null,
      signInWithPassword: async () => ({ data: null, error: null }),
      signUp: async () => ({ data: null, error: null }),
      signOut: async () => ({ error: null }),
      getUser: async () => ({ data: { user: null } })
    },
    rpc: async () => ({ data: null, error: null })
  }
} else {
  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true }
  })
}

export const supabase: any = _supabase

