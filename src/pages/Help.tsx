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

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <PageTitle>Guida & FAQ</PageTitle>

      <div className="bg-white dark:bg-neutral-900 rounded shadow-sm text-neutral-700 dark:text-neutral-100">
        <div className="border-b dark:border-neutral-800">
          <nav className="flex space-x-2 px-4" aria-label="Tabs">
            <button
              className={`py-3 px-4 text-sm font-medium rounded-t ${tab === 'descrittiva' ? 'bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-b-2 border-b-neutral-200 dark:border-b-neutral-700' : 'text-neutral-600 dark:text-neutral-400'}`}
              onClick={() => setTab('descrittiva')}
            >Guida descrittiva</button>

            <button
              className={`py-3 px-4 text-sm font-medium rounded-t ${tab === 'operativa' ? 'bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-b-2 border-b-neutral-200 dark:border-b-neutral-700' : 'text-neutral-600 dark:text-neutral-400'}`}
              onClick={() => setTab('operativa')}
            >Guida operativa</button>

            <button
              className={`py-3 px-4 text-sm font-medium rounded-t ${tab === 'faq' ? 'bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-b-2 border-b-neutral-200 dark:border-b-neutral-700' : 'text-neutral-600 dark:text-neutral-400'}`}
              onClick={() => setTab('faq')}
            >FAQ</button>
          </nav>

          <div className="p-6">
            {tab === 'descrittiva' && (
              <div className="space-y-6">
                <Card>
                  <div className="text-sm mb-2 font-semibold">Panoramica rapida (Quick start)</div>
                  <div className="text-sm">Questa sezione ti guida attraverso un flusso di lavoro tipico per usare Sup Manager dalla prima configurazione fino alla gestione quotidiana: impostazione attività, prenotazioni, gestione attrezzatura, turni e paghe.

                    <ul className="list-disc ml-5 mt-3 text-sm">
                      <li><strong>Step 1 — Configurazione iniziale:</strong> crea i tuoi pacchetti e aggiungi attrezzatura (foto e note consigliate).</li>
                      <li><strong>Step 2 — Clienti e prenotazioni:</strong> aggiungi clienti, poi crea prenotazioni con pacchetto e range date/ora.</li>
                      <li><strong>Step 3 — Team e turni:</strong> crea profili dipendenti, programma turni e istruisci lo staff su approvazione e badge.</li>
                      <li><strong>Step 4 — Paghe e report:</strong> calcola paghe per periodi, rivedi le payroll run e, se necessario, trasforma in spese/esporta CSV.</li>
                    </ul>

                    <div className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">Suggerimento: prima di iniziare, verifica le impostazioni generali (format monetario, percentuali di tasse e regole di arrotondamento).</div>
                  </div>
                </Card>

                <Card>
                  <div className="text-sm mb-2 font-semibold">Sezioni del prodotto</div>
                  <div className="text-sm">
                    <ul className="list-disc ml-5 mt-3 text-sm">
                      <li><strong>Prenotazioni:</strong> gestione e modifica puntuale, calendario e filtri avanzati.</li>
                      <li><strong>Attrezzatura:</strong> aggiungi elementi, gestisci disponibilità e manutenzioni.</li>
                      <li><strong>Dipendenti:</strong> ruoli, collegamento account, tariffari orari.</li>
                      <li><strong>Turni:</strong> creazione, approvazione/revisione e notifiche realtime.</li>
                      <li><strong>Paghe:</strong> calcolo su periodi, payroll run non pagate restano visibili.</li>
                      <li><strong>Report:</strong> esportazioni e reportistica predefinita per contabilità.</li>
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
                  <div className="text-sm">
                    <ol className="list-decimal ml-5 space-y-2">
                      <li>Vai su "Prenotazioni" e clicca su "Nuova prenotazione"</li>
                      <li>Seleziona cliente, pacchetto, data/ora e conferma numero partecipanti</li>
                      <li>Controlla la disponibilità dell'attrezzatura collegata al pacchetto</li>
                      <li>Aggiungi note su richieste speciali e assegna un operatore se necessario</li>
                      <li>Salva: il cliente comparirà in lista e riceverà la conferma se l'invio email è attivato</li>
                    </ol>

                    <div className="mt-4 text-xs text-neutral-600 dark:text-neutral-400">Suggerimento: usa ricerca cliente per velocizzare il processo; compila sempre i campi opzionali per later analytics.</div>
                  </div>
                </Card>

                <Card>
                  <div className="text-sm mb-2 font-semibold">Gestire i turni - Esempio operativo completo</div>
                  <div className="text-sm">
                    <ol className="list-decimal ml-5 space-y-2">
                      <li>Crea il turno: seleziona dipendente, data/ora di inizio e fine, durata e note operative</li>
                      <li>Salva come "Programmato" (lo staff non può marcare come completato)</li>
                      <li>Admin: rivedi il turno, clicca "Approva" se tutto è corretto o "Rifiuta" con nota</li>
                      <li>Dopo l'approvazione lo staff vedrà il badge "Approvato" vicino alle ore</li>
                      <li>Se errore: l'admin può togliere l'approvazione cliccando di nuovo sul badge</li>
                    </ol>

                    <div className="mt-4 text-xs text-neutral-600 dark:text-neutral-400">Nota: quando approvi, il server emette un evento realtime che aggiorna tutti i dispositivi connessi.</div>
                  </div>
                </Card>

                <Card>
                  <div className="text-sm mb-2 font-semibold">Calcolare e gestire le paghe - Workflow dettagliato</div>
                  <div className="text-sm">
                    <ol className="list-decimal ml-5 space-y-2">
                      <li>Se sei staff: seleziona il periodo e clicca "Calcola" per la tua retribuzione (solo visibile a te)</li>
                      <li>Se sei admin: scegli l'intervallo per tutti i dipendenti, clicca "Crea payroll run"</li>
                      <li>Rivedi le voci generate (ore, straordinari, franchigia, trattenute)</li>
                      <li>Se tutto OK: puoi creare le spese corrispondenti per contabilizzare i pagamenti</li>
                      <li>Le payroll run non pagate rimangono visibili finché non le trasformi in spese</li>
                    </ol>

                    <div className="mt-4 text-xs text-neutral-600 dark:text-neutral-400">Suggerimento: verifica le impostazioni di tassazione e i parametri orari prima di creare la payroll run per evitare discrepanze.</div>
                  </div>
                </Card>

                <Card>
                  <div className="text-sm mb-2 font-semibold">Reportistica e esportazioni - Consigli pratici</div>
                  <div className="text-sm">
                    <ol className="list-decimal ml-5 space-y-2">
                      <li>Seleziona il report (giornaliero/mensile) e il periodo di riferimento</li>
                      <li>Filtra per dipendente, cliente o tipo di spesa per analisi più granulari</li>
                      <li>Esporta in CSV/PDF per integrazione con il tuo gestionale</li>
                    </ol>
                  </div>
                </Card>

                <Card>
                  <div className="text-sm mb-2 font-semibold">Esempi pratici e scenari</div>
                  <div className="text-sm">
                    <ul className="list-disc ml-5 mt-3 text-sm space-y-1">
                      <li><strong>Scenario 1:</strong> Cliente modifica data — aggiorna la prenotazione e controlla disponibilità attrezzatura</li>
                      <li><strong>Scenario 2:</strong> Staff segnala un'ora extra — admin approva e la voce viene inclusa nella prossima payroll run</li>
                      <li><strong>Scenario 3:</strong> Errore su importo — rivedi le impostazioni di arrotondamento e correggi manualmente la voce</li>
                    </ul>
                  </div>
                </Card>
              </div>
            )}

            {tab === 'faq' && (
              <div className="space-y-6">
                <Card>
                  <div className="text-sm mb-2 font-semibold">FAQ estesa e Troubleshooting</div>
                  <div className="text-sm">
                    <div className="mb-3">
                      <div className="font-semibold">Perché non vedo certi pulsanti?</div>
                      <div>Le azioni sono limitate in base al ruolo. Se mancano funzioni, verifica di essere loggato con un account admin o contatta l'amministratore.</div>
                    </div>

                    <div className="mb-3">
                      <div className="font-semibold">Non vedo aggiornamenti realtime</div>
                      <div>Controlla la connessione di rete; il client si riconnette automaticamente in caso di interruzione. In caso di problemi persistenti, apri un ticket e controlla i log del server.</div>
                    </div>

                    <div className="mb-3">
                      <div className="font-semibold">Ho un errore su payroll run</div>
                      <div>Verifica che la payroll run non sia marcata come pagata; controlla le voci associate e gli arrotondamenti. Se necessario, esporta e verifica i dati in CSV.</div>
                    </div>

                    <div className="mb-3">
                      <div className="font-semibold">Come esportare i dati?</div>
                      <div>Sì, alcuni report consentono l'esportazione CSV e PDF: scegli il periodo e usa il pulsante "Esporta" in alto.</div>
                    </div>
                  </div>
                </Card>



                <Card>
                  <div className="text-sm mb-2 font-semibold">Glossario rapido</div>
                  <div className="text-sm list-disc ml-5">
                    <div><strong>Payroll run:</strong> raggruppamento di voci paghe per un periodo, convertibile in spese.</div>
                    <div><strong>Shift:</strong> singolo turno di lavoro assegnato ad un dipendente.</div>
                    <div><strong>Realtime:</strong> aggiornamenti push che sincronizzano i client con le modifiche sul server.</div>
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