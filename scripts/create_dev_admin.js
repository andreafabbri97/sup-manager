const fetch = require('node-fetch')

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables before running this script.')
    process.exit(1)
  }

  const email = 'admin@local.test'
  const password = 'admin123'
  const username = 'admin'

  console.log(`Creating auth user ${email} ...`)
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apiKey: SERVICE_ROLE_KEY
    },
    body: JSON.stringify({ email, password, user_metadata: { username } })
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('Failed to create user:', data)
    process.exit(1)
  }
  const userId = data?.id
  console.log('Created user id:', userId)

  // upsert into app_user
  console.log('Upserting app_user role admin...')
  const appRes = await fetch(`${SUPABASE_URL}/rest/v1/app_user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apiKey: SERVICE_ROLE_KEY,
      Prefer: 'return=representation'
    },
    body: JSON.stringify({ id: userId, role: 'admin' })
  })

  const appData = await appRes.json()
  if (!appRes.ok) {
    console.error('Failed to upsert app_user:', appData)
    process.exit(1)
  }
  console.log('Created app_user row:', appData)
  console.log('\nDone. You can now login with:', email, '/', password)
}

main().catch((e) => { console.error(e); process.exit(1) })
