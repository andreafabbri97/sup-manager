import { supabase } from './supabaseClient'

export async function approveShift(shiftId: string, action: 'approved' | 'rejected', note?: string) {
  const { error } = await supabase.rpc('approve_shift', { p_shift_id: shiftId, p_action: action, p_note: note || null })
  if (error) throw error
  return true
}
