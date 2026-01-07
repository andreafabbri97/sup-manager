import React, { useEffect, useState } from 'react'
import PageTitle from '../components/ui/PageTitle'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { getCurrentUserRole } from '../lib/auth'

export default function HelpPage() {
  const [role, setRole] = useState<string | null>(null)
  const [tab, setTab] = useState<'descrittiva' | 'operativa' | 'faq'>('descrittiva')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const r = await getCurrentUserRole()
      if (!mounted) return
      setRole(r)
    })()
    return () => { mounted = false }
  }, [])

  const isAdmin = role === 'admin'
  const isStaff = role === 'staff'

  useEffect(() => {
    // ensure tab text contrasts in dark mode
    document.documentElement.style.setProperty('--help-text', '#374151')
    document.documentElement.style.setProperty('--help-text-dark', '#E5E7EB')
  }, [])

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <PageTitle>Guida & FAQ</PageTitle>

      <div className="bg-white dark:bg-neutral-850 rounded shadow-sm">
        <div className="border-b dark:border-neutral-800">
          <nav className="flex space-x-2 px-4" aria-label="Tabs">
            <button
              className={`py-3 px-4 text-sm font-medium rounded-t ${tab === 'descrittiva' ? 'bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border-b-2 border-b-neutral-200 dark:border-b-neutral-700' : 'text-neutral-600 dark:text-neutral-400'}`}
              onClick={() => setTab('descrittiva')}
            >Guida descrittiva</button>

            <button
              className={`py-3 px-4 text-sm font-medium rounded-t ${tab === 'operativa' ? 'bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border-b-2 border-b-neutral-200 dark:border-b-neutral-700' : 'text-neutral-600 dark:text-neutral-400'}`}
              onClick={() => setTab('operativa')}
            >Guida operativa</button>

            <button
              className={`py-3 px-4 text-sm font-medium rounded-t ${tab === 'faq' ? 'bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border-b-2 border-b-neutral-200 dark:border-b-neutral-700' : 'text-neutral-600 dark:text-neutral-400'}`}
              onClick={() => setTab('faq')}
            >FAQ</button>
          </nav>

          <div className="p-6">
            {tab === 'descrittiva' && (
              <div className="space-y-6">
                <Card>
                  <div className="text-sm mb-2 font-semibold">Prenotazioni</div>
                  <div className="text-sm text-neutral-700 dark:text-neutral-300">Viste e strumenti per cercare, creare e gestire le prenotazioni. Puoi filtrare per data e stato, aprire i dettagli di una prenotazione e modificare le informazioni.

                    <ul className="list-disc ml-5 mt-3 text-sm text-neutral-700 dark:text-neutral-300">
                      <li>Ricerca veloce per nome cliente o telefono</li>
                      <li>Filtri avanzati: data, stato, pacchetto</li>
                      <li>Calendario visivo per viste mensili</li>
                    </ul>
                  </div>
                </Card>

                <Card>
                  <div className="text-sm mb-2 font-semibold">Attrezzatura</div>
                  <div className="text-sm text-neutral-700 dark:text-neutral-300">Elenco dell'attrezzatura disponibile, stato e impostazioni. Puoi aggiungere nuovi elementi e modificare la disponibilità.

                    <ul className="list-disc ml-5 mt-3 text-sm text-neutral-700 dark:text-neutral-300">
                      <li>Stato: disponibile, in manutenzione, prenotato</li>
                      <li>Scorte e limiti di prenotazione</li>
                      <li>Note e foto per ogni articolo</li>
                    </ul>
                  </div>
                </Card>

                <Card>
                  <div className="text-sm mb-2 font-semibold">Dipendenti, Turni e Paghe</div>
                  <div className="text-sm text-neutral-700 dark:text-neutral-300">Gestione anagrafica dipendenti, programmazione e approvazione turni, e calcolo paghe.

                    <ul className="list-disc ml-5 mt-3 text-sm text-neutral-700 dark:text-neutral-300">
                      <li>Creare e modificare profili dipendenti</li>
                      <li>Programmare turni, con approvazione da admin</li>
                      <li>Calcolare paghe per periodi personalizzati</li>
                      <li>Esportare payroll run come spese</li>
                    </ul>
                  </div>
                </Card>

                {isAdmin && (
                  <Card>
                    <div className="text-sm mb-2 font-semibold">Report & Amministrazione</div>
                    <div className="text-sm text-neutral-700 dark:text-neutral-300">Strumenti di reporting, esportazioni e gestione amministrativa del sistema.

                      <ul className="list-disc ml-5 mt-3 text-sm text-neutral-700 dark:text-neutral-300">
                        <li>Report giornalieri e mensili</li>
                        <li>Esportazione CSV e PDF</li>
                        <li>Configurazioni globali e permessi</li>
                      </ul>
                    </div>
                  </Card>
                )}

                {isAdmin && (
                  <Card>
                    <div className="text-sm mb-2 font-semibold">Utenti</div>
                    <div className="text-sm text-neutral-700 dark:text-neutral-300">Gestione degli account interni, ruoli e permessi.

                      <ul className="list-disc ml-5 mt-3 text-sm text-neutral-700 dark:text-neutral-300">
                        <li>Associare account auth a dipendenti</li>
                        <li>Assegnare ruoli e permessi</li>
                      </ul>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {tab === 'operativa' && (
              <div className="space-y-6">
                <Card>
                  <div className="text-sm mb-2 font-semibold">Creare una prenotazione - Guida passo-passo</div>
                  <div className="text-sm text-neutral-700 dark:text-neutral-300">
                    <ol className="list-decimal ml-5 space-y-2">
                      <li>Vai su "Prenotazioni" e clicca su "Nuova prenotazione"</li>
                      <li>Seleziona cliente, pacchetto, date e ora</li>
                      <li>Aggiungi eventuali extra o note</li>
                      <li>Verifica che l'attrezzatura sia disponibile nel periodo</li>
                      <li>Salva e invia conferma al cliente (opzione email se configurata)</li>
                    </ol>

                    <div className="mt-4 text-xs text-neutral-600">Suggerimento: usa i filtri avanzati per trovare slot liberi più velocemente.</div>
                  </div>
                </Card>

                <Card>
                  <div className="text-sm mb-2 font-semibold">Gestire i turni - esempio operativo</div>
                  <div className="text-sm text-neutral-700 dark:text-neutral-300">
                    <ol className="list-decimal ml-5 space-y-2">
                      <li>Vai su "Turni" e clicca su "Nuovo turno"</li>
                      <li>Compila il form: dipendente, inizio, fine, note</li>
                      <li>Lo staff può solo impostare lo stato come "Programmato"</li>
                      <li>L'admin può approvare o rifiutare: cliccare Approva/ Rifiuta</li>
                      <li>Una volta approvato il badge apparirà vicino alle ore e verrà inviato l'aggiornamento realtime</li>
                    </ol>

                    <div className="mt-4 text-xs text-neutral-600">Suggerimento: l'admin può cambiare idea cliccando nuovamente sul badge per tornare indietro.</div>
                  </div>
                </Card>

                <Card>
                  <div className="text-sm mb-2 font-semibold">Calcolare e gestire le paghe</div>
                  <div className="text-sm text-neutral-700 dark:text-neutral-300">
                    <ol className="list-decimal ml-5 space-y-2">
                      <li>Vai su "Paghe"</li>
                      <li>Se sei staff: seleziona il periodo e clicca "Calcola" per vedere solo la tua paga</li>
                      <li>Se sei admin: puoi creare una payroll run, rivedere le voci e creare spese</li>
                      <li>Le payroll run non pagate restano visibili finché non le trasformi in spese</li>
                    </ol>

                    <div className="mt-4 text-xs text-neutral-600">Suggerimento: verifica gli arrotondamenti e la tassazione nelle impostazioni se necessario.</div>
                  </div>
                </Card>

                <Card>
                  <div className="text-sm mb-2 font-semibold">Reportistica e esportazioni</div>
                  <div className="text-sm text-neutral-700 dark:text-neutral-300">
                    <ol className="list-decimal ml-5 space-y-2">
                      <li>Vai su "Report" e scegli il periodo</li>
                      <li>Utilizza i report giornalieri o mensili per analizzare ricavi e costi</li>
                      <li>Esporta CSV per integrazione con contabilità</li>
                    </ol>
                  </div>
                </Card>
              </div>
            )}

            {tab === 'faq' && (
              <div className="space-y-6">
                <Card>
                  <div className="text-sm mb-2 font-semibold">Domande frequenti</div>
                  <div className="text-sm text-neutral-700 dark:text-neutral-300">
                    <div className="mb-3">
                      <div className="font-semibold">Perché non vedo certi pulsanti?</div>
                      <div>Alcune azioni sono riservate agli amministratori (ruolo "admin"). Se sei staff vedrai solo le azioni pertinenti al tuo ruolo.</div>
                    </div>

                    <div className="mb-3">
                      <div className="font-semibold">Come posso fare in modo che le modifiche si vedano su tutti i dispositivi?</div>
                      <div>Il sistema usa aggiornamenti realtime: quando un admin approva un turno o qualcuno modifica dati rilevanti, gli altri dispositivi ricevono l'aggiornamento automaticamente. Se l'aggiornamento non appare subito, controlla la connessione o ricarica la pagina.</div>
                    </div>

                    <div className="mb-3">
                      <div className="font-semibold">Come riportare un errore o chiedere aiuto?</div>
                      <div>Invia un messaggio al team di supporto (o apri un ticket). Se vuoi, puoi anche lasciare una nota nella pagina "Impostazioni" con i dettagli del problema.</div>
                    </div>

                    <div className="mb-3">
                      <div className="font-semibold">Posso esportare i dati?</div>
                      <div>Sì, alcuni report consentono l'esportazione CSV e PDF.</div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">Hai bisogno di più dettagli?</div>
                      <div className="text-sm text-neutral-700 dark:text-neutral-300">Se vuoi posso aggiungere esempi passo-passo, video o immagini per ciascuna operazione.</div>
                    </div>
                    <div>
                      <Button onClick={() => window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Grazie! Dimmi cosa aggiungere nella Guida.', type: 'info' } }))}>Suggerisci modifica</Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}