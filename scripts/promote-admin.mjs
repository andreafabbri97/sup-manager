import fetch from 'node-fetch'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

async function upsertAdmin() {
  const admin = { username: 'admin', email: 'admin@example.com', role: 'owner' }

  const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/user?on_conflict=username`

  console.log('Sending upsert to', url)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      Prefer: 'return=representation, resolution=merge-duplicates'
    },
    body: JSON.stringify([admin])
  })

  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch (e) { body = text }

  if (!res.ok) {
    console.error('Failed to upsert admin. Status:', res.status, body)
    process.exit(1)
  }

  console.log('Upsert admin response:', body)
}

upsertAdmin().catch((err) => { console.error(err); process.exit(1) })
