import { supabase } from './supabaseClient'

let cachedRole: string | null = null
let cachedToken: string | null = null

function getStoredToken() {
  try { return window.localStorage.getItem('app_session_token') } catch (e) { return null }
}

export async function login(username: string, password: string) {
  // some Supabase clients match RPC by parameter order; provide p_password first to be safe
  const { data, error } = await supabase.rpc('authenticate_user', { p_password: password, p_username: username })
  if (error) {
    // surface server error message for UX
    throw new Error(error.message || 'Invalid credentials')
  }
  // Normalize token regardless of RPC return shape
  let token: any = null
  if (Array.isArray(data) && data.length > 0) {
    token = data[0]?.token ?? data[0]?.authenticate_user ?? data[0]?.id ?? Object.values(data[0])[0]
  } else if (data && typeof data === 'object') {
    token = data.token ?? data.authenticate_user ?? Object.values(data)[0]
  } else {
    token = data
  }

  if (!token) throw new Error('Login failed')
  try { window.localStorage.setItem('app_session_token', String(token)) } catch (e) {}
  cachedToken = String(token)
  cachedRole = null
  // small debug log to help trace auth during development
  try { console.debug('login: stored session token', cachedToken) } catch (e) {}
  window.dispatchEvent(new CustomEvent('auth:changed'))
  return cachedToken
}

export async function logout() {
  try {
    const token = cachedToken ?? getStoredToken()
    if (token) await supabase.rpc('logout_session', { p_token: token })
  } catch (_) {}
  try { window.localStorage.removeItem('app_session_token') } catch (e) {}
  cachedToken = null
  cachedRole = null
  window.dispatchEvent(new CustomEvent('auth:changed'))
}

export async function getCurrentUserRole() {
  if (cachedRole) return cachedRole
  try {
    const token = cachedToken ?? getStoredToken()
    if (!token) return null
    const { data, error } = await supabase.rpc('get_current_user_role', { p_token: token })
    if (error) return null
    cachedRole = (data as any) ?? null
    return cachedRole
  } catch (e) {
    return null
  }
}

export function clearCachedRole() {
  cachedRole = null
}

export async function getCurrentUserId() {
  try {
    const token = cachedToken ?? getStoredToken()
    if (!token) return null
    const { data, error } = await supabase.rpc('get_current_user_id', { p_token: token })
    if (error) return null
    return (data as any) ?? null
  } catch (e) {
    return null
  }
}
