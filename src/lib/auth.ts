import { supabase } from './supabaseClient'

let cachedRole: string | null = null

export async function getCurrentUserRole() {
  if (cachedRole) return cachedRole
  try {
    const userRes = await supabase.auth.getUser()
    const user = (userRes as any)?.data?.user
    // If there's no authenticated user (or auth not configured), treat as admin so Reports remains accessible
    if (!user) {
      cachedRole = 'admin'
      return cachedRole
    }

    // Fallback strategy: check if any app_user rows exist; if none, assume first user is admin (fresh install convenience)
    const { data: anyUser, error: anyErr } = await supabase.from('app_user').select('id').limit(1).maybeSingle()
    if (!anyErr && !anyUser) {
      cachedRole = 'admin'
      return cachedRole
    }

    const { data, error } = await supabase.from('app_user').select('role').eq('id', user.id).single()
    if (error) {
      // if no app_user row for this user, default to admin to avoid hiding Reports for bootstrap
      cachedRole = 'admin'
      return cachedRole
    }
    cachedRole = data?.role ?? 'admin'
    return cachedRole
  } catch (e) {
    cachedRole = 'admin'
    return cachedRole
  }
}

export function clearCachedRole() {
  cachedRole = null
}
