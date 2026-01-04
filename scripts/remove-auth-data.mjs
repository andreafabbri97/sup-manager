/*
  remove-auth-data.mjs
  - Lists all Supabase Auth users via the Admin API and deletes them
  - Deletes all rows from the `user` table via the REST API (if present)

  This script expects these environment variables to be set:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY

  IMPORTANT: this is destructive and non-reversible.
*/

import process from 'node:process'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

function safeUrl(u){ return u.replace(/\/+$/, '') }
const base = safeUrl(SUPABASE_URL)

async function fetchJson(path, opts = {}){
  const res = await fetch(`${base}${path}`, opts)
  const text = await res.text()
  let body
  try { body = text ? JSON.parse(text) : null } catch(e){ body = text }
  return { ok: res.ok, status: res.status, body }
}

async function listAuthUsers(){
  const { ok, status, body } = await fetchJson('/auth/v1/admin/users', {
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY
    }
  })
  if (!ok) throw new Error(`Failed to list auth users (${status}) ${JSON.stringify(body)}`)
  return body
}

async function deleteAuthUser(uid){
  const { ok, status, body } = await fetchJson(`/auth/v1/admin/users/${uid}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY
    }
  })
  if (!ok) throw new Error(`Failed to delete auth user ${uid} (${status}) ${JSON.stringify(body)}`)
  return true
}

async function deleteUserRows(){
  // Attempt to delete all rows in `user` table
  const { ok, status, body } = await fetchJson('/rest/v1/user', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      Prefer: 'return=representation',
      'Content-Type': 'application/json'
    }
  })

  if (status === 404) {
    console.log('Table `user` not found (no rows to delete).')
    return null
  }
  if (!ok) throw new Error(`Failed to delete user rows (${status}) ${JSON.stringify(body)}`)
  return body
}

async function run(){
  console.log('== Remove-auth-data starting (destructive).')

  // 1) list auth users
  let users = []
  try{
    users = await listAuthUsers()
  }catch(e){
    console.error('Error listing auth users:', e.message)
    process.exit(1)
  }

  console.log(`Found ${Array.isArray(users) ? users.length : 0} auth user(s).`)

  // 2) delete auth users one by one
  for (const u of users || []){
    try{
      await deleteAuthUser(u.id)
      console.log(`Deleted auth user: ${u.id}`)
    }catch(e){
      console.error(`Failed to delete auth user ${u.id}:`, e.message)
      // Continue attempting remaining deletions
    }
  }

  // 3) delete rows from `user` DB table
  try{
    const delRes = await deleteUserRows()
    if (delRes === null) {
      console.log('No DB `user` table to delete or it was absent.')
    } else {
      console.log('Deleted DB user rows, response:', JSON.stringify(delRes))
    }
  }catch(e){
    console.error('Failed to delete DB user rows:', e.message)
    process.exit(1)
  }

  console.log('Done — auth users removed and `user` table rows deleted (if present).')
}

run().catch((err) => { console.error(err); process.exit(1) })
