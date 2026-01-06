import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Button from './ui/Button'
import Modal from './ui/Modal'
import Card from './ui/Card'
import PageTitle from './ui/PageTitle'

type Customer = {
  id: string
  name: string
  email?: string
  phone?: string
  notes?: string
  created_at: string
  bookings_count?: number
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [bookingsCounts, setBookingsCounts] = useState<Record<string, number>>({})

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  // Sort option: name-asc | name-desc | bookings-desc | bookings-asc
  const [sortOption, setSortOption] = useState<'name-asc'|'name-desc'|'bookings-desc'|'bookings-asc'>('name-asc')

  useEffect(() => {
    const s = typeof window !== 'undefined' ? localStorage.getItem('customers:sort') : null
    if (s) setSortOption(s as any)
  }, [])

  useEffect(() => {
    try { localStorage.setItem('customers:sort', sortOption) } catch (e) {}
  }, [sortOption])

  // Helper: convert stored phone to international digits-only format suitable for wa.me links
  // Rules: strip non-digit chars; if starts with '00' drop the leading zeros; if starts with single '0' assume Italian country code '39'
  function formatPhoneForWhatsApp(p?: string): string | null {
    if (!p) return null
    let s = p.replace(/\D+/g, '')
    if (!s) return null
    if (s.startsWith('00')) s = s.replace(/^00/, '')
    if (s.startsWith('0')) s = '39' + s.replace(/^0+/, '')
    // basic sanity check
    if (s.length < 7) return null
    return s
  }

  useEffect(() => {
    loadCustomers()
    loadBookingsCounts()
  }, [])

  async function loadCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error(error)
      return
    }
    setCustomers(data || [])
  }

  async function loadBookingsCounts() {
    // Query booking counts per customer_id
    const { data, error } = await supabase
      .from('booking')
      .select('customer_id')
    
    if (error) {
      console.error('Error loading bookings counts:', error)
      return
    }
    
    // Count bookings per customer
    const counts: Record<string, number> = {}
    if (data) {
      for (const booking of data) {
        if (booking.customer_id) {
          counts[booking.customer_id] = (counts[booking.customer_id] || 0) + 1
        }
      }
    }
    setBookingsCounts(counts)
  }

  function resetForm() {
    setName('')
    setEmail('')
    setPhone('')
    setNotes('')
    setEditingCustomer(null)
  }

  function openCreateModal() {
    resetForm()
    setShowModal(true)
  }

  function openEditModal(customer: Customer) {
    setEditingCustomer(customer)
    setName(customer.name)
    setEmail(customer.email || '')
    setPhone(customer.phone || '')
    setNotes(customer.notes || '')
    setShowModal(true)
  }

  async function saveCustomer() {
    if (!name.trim()) {
      alert('Il nome è obbligatorio')
      return
    }

    const customerData = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    }

    if (editingCustomer) {
      // Update
      const { error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', editingCustomer.id)
      if (error) {
        alert('Errore durante l\'aggiornamento: ' + error.message)
        return
      }
    } else {
      // Create
      const { error } = await supabase.from('customers').insert(customerData)
      if (error) {
        alert('Errore durante la creazione: ' + error.message)
        return
      }
    }

    resetForm()
    setShowModal(false)
    loadCustomers()
    loadBookingsCounts()
  }

  async function deleteCustomer(id: string) {
    if (!confirm('Eliminare questo cliente? Le prenotazioni collegate non verranno eliminate.')) return

    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) {
      alert('Errore durante l\'eliminazione: ' + error.message)
      return
    }
    loadCustomers()
    loadBookingsCounts()
  }

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    )
  })

  const sortedCustomers = React.useMemo(() => {
    const arr = [...filteredCustomers]
    switch (sortOption) {
      case 'name-asc':
        arr.sort((a,b) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        arr.sort((a,b) => b.name.localeCompare(a.name))
        break
      case 'bookings-desc':
        arr.sort((a,b) => ( (bookingsCounts[b.id]||0) - (bookingsCounts[a.id]||0) ) || a.name.localeCompare(b.name))
        break
      case 'bookings-asc':
        arr.sort((a,b) => ( (bookingsCounts[a.id]||0) - (bookingsCounts[b.id]||0) ) || a.name.localeCompare(b.name))
        break
    }
    return arr
  }, [filteredCustomers, bookingsCounts, sortOption])

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <PageTitle className="m-0">Anagrafica Clienti</PageTitle>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Gestisci i dati dei tuoi clienti</p>
        </div>
        <Button onClick={openCreateModal}>+ Nuovo Cliente</Button>
      </div>

      <div className="mt-2">
        {/* Search + Sort */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per nome, email o telefono..."
            className="flex-1 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-slate-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="w-full sm:w-auto border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-slate-700 px-3 py-2 rounded"
          >
            <option value="name-asc">Ordina: Nome A→Z</option>
            <option value="name-desc">Ordina: Nome Z→A</option>
            <option value="bookings-desc">Ordina: Prenotazioni (più → meno)</option>
            <option value="bookings-asc">Ordina: Prenotazioni (meno → più)</option>
          </select>
        </div>

        {/* Customers list */}
        <div className="space-y-2">
          {filteredCustomers.length === 0 && (
            <div className="text-neutral-500 text-center py-8">
              {searchQuery ? 'Nessun cliente trovato' : 'Nessun cliente registrato'}
            </div>
          )}

          {sortedCustomers.map((customer) => (
            <Card key={customer.id} className="flex items-start justify-between interactive bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">
                    {customer.name}
                  </div>
                  {bookingsCounts[customer.id] !== undefined && bookingsCounts[customer.id] > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-xs font-semibold">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{bookingsCounts[customer.id]} {bookingsCounts[customer.id] === 1 ? 'prenotazione' : 'prenotazioni'}</span>
                    </div>
                  )}
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1 mt-1">
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{customer.phone}</span>
                      {formatPhoneForWhatsApp(customer.phone) && (
                        <a
                          href={`https://wa.me/${formatPhoneForWhatsApp(customer.phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Apri chat WhatsApp"
                          className="ml-2 inline-flex items-center justify-center"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 175.216 175.552" aria-hidden="true">
                            <circle fill="#25D366" cx="87.608" cy="87.776" r="87.608"/>
                            <path fill="#FFFFFF" d="M126.88 48.572c-9.304-9.304-21.664-14.432-34.848-14.432-27.136 0-49.216 22.08-49.216 49.216 0 8.672 2.272 17.152 6.56 24.608l-6.976 25.472 26.048-6.816c7.232 3.936 15.36 6.016 23.584 6.016h.032c27.136 0 49.216-22.08 49.216-49.216 0-13.152-5.12-25.504-14.4-34.848zm-34.848 75.776h-.032c-7.328 0-14.528-1.952-20.8-5.632l-1.504-.896-15.488 4.064 4.128-15.104-.992-1.568c-4.032-6.4-6.176-13.792-6.176-21.408 0-22.176 18.048-40.224 40.256-40.224 10.752 0 20.864 4.192 28.448 11.808 7.584 7.584 11.776 17.664 11.776 28.416-.032 22.208-18.08 40.256-40.256 40.256zm22.08-30.144c-1.216-.608-7.136-3.52-8.224-3.904-1.088-.416-1.888-.608-2.688.608-.8 1.216-3.104 3.904-3.808 4.704-.704.8-1.408 .928-2.624.32-1.216-.608-5.12-1.888-9.76-6.016-3.616-3.2-6.048-7.168-6.752-8.384-.704-1.216-.064-1.888.544-2.496.544-.544 1.216-1.408 1.824-2.112.608-.704.8-1.216 1.216-2.016.416-.8.192-1.504-.096-2.112-.32-.608-2.688-6.464-3.68-8.864-.96-2.304-1.984-2.016-2.688-2.048-.704-.032-1.504-.032-2.304-.032s-2.112.32-3.2 1.504c-1.088 1.216-4.16 4.064-4.16 9.92s4.256 11.52 4.864 12.32c.608.8 8.672 13.216 21.024 18.528 2.944 1.28 5.248 2.048 7.04 2.624 2.944.96 5.632.832 7.744.512 2.368-.352 7.136-2.912 8.128-5.728.992-2.816.992-5.248.672-5.76-.288-.544-1.088-.864-2.304-1.472z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  )}
                  {customer.notes && (
                    <div className="text-xs italic text-neutral-500 mt-2">
                      {customer.notes}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => openEditModal(customer)}
                  className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                >
                  Modifica
                </button>
                <button
                  onClick={() => deleteCustomer(customer.id)}
                  className="text-red-600 dark:text-red-400 text-sm hover:underline"
                >
                  Elimina
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal Create/Edit */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          resetForm()
        }}
        title={editingCustomer ? 'Modifica Cliente' : 'Nuovo Cliente'}
        autoFocus={false}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-slate-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@esempio.com"
              className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-slate-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Telefono</label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+39 123 456 7890"
                className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-slate-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {formatPhoneForWhatsApp(phone) && (
                <a
                  href={`https://wa.me/${formatPhoneForWhatsApp(phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Apri chat WhatsApp"
                  className="absolute right-2 top-2 inline-flex items-center justify-center"
                >
                  <svg className="w-5 h-5" viewBox="0 0 175.216 175.552" aria-hidden="true">
                    <circle fill="#25D366" cx="87.608" cy="87.776" r="87.608"/>
                    <path fill="#FFFFFF" d="M126.88 48.572c-9.304-9.304-21.664-14.432-34.848-14.432-27.136 0-49.216 22.08-49.216 49.216 0 8.672 2.272 17.152 6.56 24.608l-6.976 25.472 26.048-6.816c7.232 3.936 15.36 6.016 23.584 6.016h.032c27.136 0 49.216-22.08 49.216-49.216 0-13.152-5.12-25.504-14.4-34.848zm-34.848 75.776h-.032c-7.328 0-14.528-1.952-20.8-5.632l-1.504-.896-15.488 4.064 4.128-15.104-.992-1.568c-4.032-6.4-6.176-13.792-6.176-21.408 0-22.176 18.048-40.224 40.256-40.224 10.752 0 20.864 4.192 28.448 11.808 7.584 7.584 11.776 17.664 11.776 28.416-.032 22.208-18.08 40.256-40.256 40.256zm22.08-30.144c-1.216-.608-7.136-3.52-8.224-3.904-1.088-.416-1.888-.608-2.688.608-.8 1.216-3.104 3.904-3.808 4.704-.704.8-1.408 .928-2.624.32-1.216-.608-5.12-1.888-9.76-6.016-3.616-3.2-6.048-7.168-6.752-8.384-.704-1.216-.064-1.888.544-2.496.544-.544 1.216-1.408 1.824-2.112.608-.704.8-1.216 1.216-2.016.416-.8.192-1.504-.096-2.112-.32-.608-2.688-6.464-3.68-8.864-.96-2.304-1.984-2.016-2.688-2.048-.704-.032-1.504-.032-2.304-.032s-2.112.32-3.2 1.504c-1.088 1.216-4.16 4.064-4.16 9.92s4.256 11.52 4.864 12.32c.608.8 8.672 13.216 21.024 18.528 2.944 1.28 5.248 2.048 7.04 2.624 2.944.96 5.632.832 7.744.512 2.368-.352 7.136-2.912 8.128-5.728.992-2.816.992-5.248.672-5.76-.288-.544-1.088-.864-2.304-1.472z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Note</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note aggiuntive..."
              rows={3}
              className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-slate-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => {
                setShowModal(false)
                resetForm()
              }}
              className="px-4 py-2 rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              Annulla
            </button>
            <Button onClick={saveCustomer}>
              {editingCustomer ? 'Salva Modifiche' : 'Crea Cliente'}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
