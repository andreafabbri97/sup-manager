import { supabase } from './supabaseClient'

// Central realtime wiring: subscribes to Postgres changes and dispatches
// CustomEvents on window so components can react.

const TABLES = ['booking', 'equipment', 'package', 'expense', 'sup', 'app_setting']

// Coalescing & backoff configuration
const COALESCE_MS = 500 // window to batch rapid events per table
const BACKOFF_BASE = 1000 // ms
const BACKOFF_FACTOR = 2
const BACKOFF_MAX = 30000 // ms

type RealtimePayload = { schema: string; table: string; commit_timestamp: string; eventType: string; record: any; old_record?: any }

function safeDispatch(evName: string, detail: any) {
  try {
    const ev = new CustomEvent(evName, { detail })
    window.dispatchEvent(ev)
  } catch (e) {
    // safe noop in non-browser env
    // eslint-disable-next-line no-console
    console.warn('Failed to dispatch realtime event', e)
  }
}

// Internal state per table for coalescing and backoff
const tableState: Record<string, {
  channel?: any
  queue: any[]
  flushTimer?: number | null
  retries: number
  backoffTimer?: number | null
}> = {}

for (const t of TABLES) tableState[t] = { queue: [], flushTimer: null, retries: 0, backoffTimer: null }

function scheduleFlush(table: string) {
  const st = tableState[table]
  if (st.flushTimer) return

  st.flushTimer = window.setTimeout(() => {
    const events = st.queue.slice()
    st.queue.length = 0
    st.flushTimer = null

    // dispatch a single merged event per table with the collected events
    safeDispatch(`realtime:${table}`, { action: 'merged', events })
  }, COALESCE_MS)
}

function onPostgresPayload(table: string, payload: any) {
  const st = tableState[table]
  st.queue.push(payload)
  scheduleFlush(table)
}

function createChannelForTable(table: string) {
  // clean up any existing channel state
  try {
    if (tableState[table].channel) {
      supabase.removeChannel(tableState[table].channel)
    }
  } catch (e) {
    // ignore
  }

  const channel = supabase.channel(`public:${table}`)
  tableState[table].channel = channel

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table },
    (payload: any) => {
      // payload has: eventType (INSERT/UPDATE/DELETE), new, old, etc
      onPostgresPayload(table, payload)
    }
  )

  channel.subscribe((status: any) => {
    // emit status events so UI can react
    safeDispatch('realtime:status', { table, status, attempt: tableState[table].retries })

    // normalize status strings that indicate failure and attempt reconnect
    const isSubscribed = status === 'SUBSCRIBED'

    if (isSubscribed) {
      // reset retries/backoff
      tableState[table].retries = 0
      if (tableState[table].backoffTimer) {
        clearTimeout(tableState[table].backoffTimer!)
        tableState[table].backoffTimer = null
      }
    } else {
      // schedule reconnect with exponential backoff
      scheduleReconnect(table)
    }
  })

  return channel
}

function scheduleReconnect(table: string) {
  const st = tableState[table]
  if (st.backoffTimer) return // already scheduled

  st.retries = (st.retries || 0) + 1
  const base = BACKOFF_BASE * Math.pow(BACKOFF_FACTOR, Math.max(0, st.retries - 1))
  const jitter = Math.floor(Math.random() * 500) - 250 // +/-250ms
  const delay = Math.min(base + jitter, BACKOFF_MAX)

  safeDispatch('realtime:status', { table, status: 'RECONNECT_SCHEDULED', attempt: st.retries, nextRetryInMs: delay })

  st.backoffTimer = window.setTimeout(() => {
    st.backoffTimer = null
    try {
      // attempt to recreate / resubscribe channel
      createChannelForTable(table)
      safeDispatch('realtime:status', { table, status: 'RECONNECT_ATTEMPT', attempt: st.retries })
    } catch (e) {
      // schedule another reconnect
      scheduleReconnect(table)
    }
  }, delay)
}

export function startRealtime() {
  // avoid double-start
  const already = Object.values(tableState).some(s => !!s.channel)
  if (already) return

  for (const t of TABLES) {
    try {
      createChannelForTable(t)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Realtime subscribe error', t, err)
      scheduleReconnect(t)
    }
  }
}

export function stopRealtime() {
  for (const t of TABLES) {
    const st = tableState[t]
    try {
      if (st.channel) {
        supabase.removeChannel(st.channel)
      }
    } catch (e) {
      // ignore
    }
    if (st.flushTimer) clearTimeout(st.flushTimer)
    if (st.backoffTimer) clearTimeout(st.backoffTimer)

    st.channel = undefined
    st.flushTimer = null
    st.backoffTimer = null
    st.retries = 0
    st.queue.length = 0
  }
}

// start automatically if window is present
if (typeof window !== 'undefined') {
  // small timeout to let app initialize
  setTimeout(() => startRealtime(), 200)
}

export default { startRealtime, stopRealtime }
