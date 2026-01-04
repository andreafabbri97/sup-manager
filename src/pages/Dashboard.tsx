import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    let mounted: boolean = true
    async function load(): Promise<void> {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user || !mounted) return
      setUser(user)

      // Upsert a profile row if it does not exist (default role: staff)
      const { data: profileData } = await supabase
        .from('user')
        .upsert({ id: user.id, email: user.email, name: user.user_metadata?.full_name || null }, { onConflict: 'id' })
        .select()
        .limit(1)
      if (profileData && profileData.length) setProfile(profileData[0])
      else {
        const { data } = await supabase.from('user').select('*').eq('id', user.id).single()
        setProfile(data)
      }
    }
    load()
    const { subscription } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      if (!session?.user) setUser(null)
    })
    return () => {
      mounted = false
      // @ts-ignore
      subscription?.unsubscribe()
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <p className="text-sm text-slate-600">Benvenuto{profile?.name ? `, ${profile.name}` : ''}.</p>
          <p className="text-sm mt-1">Ruolo: <strong>{profile?.role || 'staff (default)'}</strong></p>
        </div>
        <div>
          <button className="px-3 py-1 rounded bg-red-500 text-white" onClick={signOut}>
            Esci
          </button>
        </div>
      </div>

      <section className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="font-medium">Prossimi passi</h3>
        <ul className="mt-2 list-disc list-inside text-sm text-slate-600">
          <li>Creare SUP e pacchetti</li>
          <li>Provare a creare una prenotazione</li>
          <li>Controllare nel pannello Supabase il record `user` creato e impostare `role='owner'` per te</li>
        </ul>
      </section>
    </div>
  )
}
