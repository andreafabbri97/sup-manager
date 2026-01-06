import { supabase } from './supabaseClient'

let cachedRole: string | null = null

export async function getCurrentUserRole() {
  if (cachedRole) return cachedRole
  try {
    const userRes = await supabase.auth.getUser()
    const user = (userRes as any)?.data?.user
    if (!user) return null

    // Fallback strategy: check if any app_user rows exist; if none, assume first user is admin (fresh install convenience)
    const { data: anyUser, error: anyErr } = await supabase.from('app_user').select('id').limit(1).maybeSingle()
    if (!anyErr && !anyUser) {
      cachedRole = 'admin'
      return cachedRole
    }

    const { data, error } = await supabase.from('app_user').select('role').eq('id', user.id).single()
    if (error) {
      // if no app_user row for this user, default to 'staff'
      cachedRole = 'staff'
      return cachedRole
    }
    cachedRole = data?.role ?? 'staff'
    return cachedRole
  } catch (e) {
    return null
  }
}

export function clearCachedRole() {
  cachedRole = null
}
