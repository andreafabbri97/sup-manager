import { supabase } from './supabaseClient'

// Central realtime wiring: subscribes to Postgres changes and dispatches
// CustomEvents on window so components can react.

const TABLES = ['booking', 'equipment', 'package', 'expense', 'sup', 'app_setting']

type RealtimePayload = { schema: string; table: string; commit_timestamp: string; eventType: string; record: any; old_record?: any }

function dispatchEvent(table: string, action: string, payload: any) {
  try {
    const ev = new CustomEvent(`realtime:${table}`, { detail: { action, payload } })
    window.dispatchEvent(ev)
  } catch (e) {
    // safe noop in non-browser env
    // eslint-disable-next-line no-console
    console.warn('Failed to dispatch realtime event', e)
  }
}

// Subscribe to changes for a given table
function subscribeTable(table: string) {
  // supabase.realtime uses "postgres_changes" channel
  const channel = supabase.channel(`public:${table}`)

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table },
    (payload: any) => {
      // payload has: eventType (INSERT/UPDATE/DELETE), new, old, etc
      const action = payload.eventType?.toLowerCase() || 'unknown'
      dispatchEvent(table, action, payload)
    }
  )

  channel.subscribe((status: any) => {
    // optional: emit status events
    const ev = new CustomEvent('realtime:status', { detail: { table, status } })
    window.dispatchEvent(ev)
  })

  return channel
}

let channels: any[] = []

export function startRealtime() {
  // avoid double-start
  if (channels.length) return
  for (const t of TABLES) {
    try {
      const c = subscribeTable(t)
      channels.push(c)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Realtime subscribe error', t, err)
    }
  }
}

export function stopRealtime() {
  for (const c of channels) {
    try { supabase.removeChannel(c) } catch (e) {}
  }
  channels = []
}

// start automatically if window is present
if (typeof window !== 'undefined') {
  // small timeout to let app initialize
  setTimeout(() => startRealtime(), 200)
}

export default { startRealtime, stopRealtime }
