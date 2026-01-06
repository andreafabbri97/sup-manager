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
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

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
  }

  async function deleteCustomer(id: string) {
    if (!confirm('Eliminare questo cliente? Le prenotazioni collegate non verranno eliminate.')) return

    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) {
      alert('Errore durante l\'eliminazione: ' + error.message)
      return
    }
    loadCustomers()
  }

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    )
  })

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <PageTitle className="m-0">Anagrafica Clienti</PageTitle>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Gestisci i dati dei tuoi clienti</p>
        </div>
        <Button onClick={openCreateModal}>+ Nuovo Cliente</Button>
      </div>

      <Card className="mt-2">
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per nome, email o telefono..."
            className="w-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-slate-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Customers list */}
        <div className="space-y-2">
          {filteredCustomers.length === 0 && (
            <div className="text-neutral-500 text-center py-8">
              {searchQuery ? 'Nessun cliente trovato' : 'Nessun cliente registrato'}
            </div>
          )}

          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="flex items-start justify-between interactive">
              <div className="flex-1">
                <div className="font-medium text-neutral-900 dark:text-neutral-100">
                  {customer.name}
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
                          className="ml-2 text-green-600 hover:text-green-700"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M20.52 3.48A11.77 11.77 0 0012 .04 11.61 11.61 0 003.48 3.52 11 11 0 000 12.01c0 2.12.55 4.2 1.6 6.04L.24 23l4.99-1.31A11 11 0 0012 24c6.08 0 11-4.92 11-11 0-3.01-1.17-5.8-3.48-7.51zM16.51 14.83c-.26-.13-1.54-.76-1.78-.84-.24-.08-.41-.13-.58.13-.17.26-.65.84-.8 1.01-.15.17-.3.19-.56.06-.26-.13-1.08-.4-2.06-1.27-.76-.69-1.27-1.55-1.42-1.81-.15-.26-.02-.4.12-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.06-.13-.58-1.4-.8-1.92-.21-.5-.43-.43-.59-.44-.15-.01-.33-.01-.5-.01s-.45.06-.69.32c-.24.26-.92.9-.92 2.2s.94 2.55 1.07 2.73c.13.17 1.86 2.86 4.5 3.9 3 .12 3.33-2 3.7-2.1.37-.12 1.2-.48 1.37-.95.17-.47.17-.87.12-.95-.05-.08-.23-.13-.49-.26z" />
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
      </Card>

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
                  className="absolute right-2 top-2 text-green-600 hover:text-green-700"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20.52 3.48A11.77 11.77 0 0012 .04 11.61 11.61 0 003.48 3.52 11 11 0 000 12.01c0 2.12.55 4.2 1.6 6.04L.24 23l4.99-1.31A11 11 0 0012 24c6.08 0 11-4.92 11-11 0-3.01-1.17-5.8-3.48-7.51zM16.51 14.83c-.26-.13-1.54-.76-1.78-.84-.24-.08-.41-.13-.58.13-.17.26-.65.84-.8 1.01-.15.17-.3.19-.56.06-.26-.13-1.08-.4-2.06-1.27-.76-.69-1.27-1.55-1.42-1.81-.15-.26-.02-.4.12-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.06-.13-.58-1.4-.8-1.92-.21-.5-.43-.43-.59-.44-.15-.01-.33-.01-.5-.01s-.45.06-.69.32c-.24.26-.92.9-.92 2.2s.94 2.55 1.07 2.73c.13.17 1.86 2.86 4.5 3.9 3 .12 3.33-2 3.7-2.1.37-.12 1.2-.48 1.37-.95.17-.47.17-.87.12-.95-.05-.08-.23-.13-.49-.26z" />
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
