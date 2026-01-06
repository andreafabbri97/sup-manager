import { supabase } from './supabaseClient'

let cachedRole: string | null = null

export async function getCurrentUserRole() {
  if (cachedRole) return cachedRole
  try {
    const userRes = await supabase.auth.getUser()
    const user = (userRes as any)?.data?.user
    if (!user) return null
    const { data, error } = await supabase.from('app_user').select('role').eq('id', user.id).single()
    if (error) {
      // if no app_user row, default to 'staff'
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
