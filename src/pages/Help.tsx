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
                  <div className="text-sm mb-2 font-semibold">Prenotazioni — Operazioni comuni</div>
                  <div className="text-sm">
                    <ol className="list-decimal ml-5 space-y-2">
                      <li><strong>Creare prenotazione:</strong> Vai su "Prenotazioni" → clicca "Nuova Prenotazione" → inserisci cliente (usa la ricerca) → seleziona pacchetto o attrezzatura → scegli data/ora, durata e numero partecipanti → salva.</li>
                      <li><strong>Modificare prenotazione:</strong> Apri la prenotazione → clicca "Modifica" → aggiorna campi e salva (verifica disponibilità attrezzatura e conflitti).</li>
                      <li><strong>Annullare prenotazione:</strong> Apri dettaglio → clicca "Elimina" e conferma. Nota: l'eliminazione rimuove anche la disponibilità occupata.</li>
                      <li><strong>Suggerimenti operativi:</strong> usa la ricerca cliente per trovare rapidamente clienti; se lavori con pacchetti, verifica sempre le impostazioni tariffarie e attrezzature incluse.</li>
                    </ol>
                    <div className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">Permessi: la creazione e la modifica sono disponibili sia per Admin che Staff; alcune azioni (es. eliminazioni massicce, esportazioni globali) possono essere limitate ad Admin.</div>
                  </div>
                </Card>

                <Card>
                  <div className="text-sm mb-2 font-semibold">Attrezzatura — Aggiungere, modificare, controllare disponibilità</div>
                  <div className="text-sm">
                    <ol className="list-decimal ml-5 space-y-2">
                      <li><strong>Aggiungere un elemento:</strong> Vai su "Attrezzatura" → clicca "Aggiungi attrezzatura" → inserisci nome, tipo, quantità, prezzo/ora e salva.</li>
                      <li><strong>Modificare:</strong> Apri l'elemento → clicca "Modifica" → aggiorna stato, quantità o note; se cambi quantità, il sistema sincronizza le unità SUP collegate.</li>
                      <li><strong>Ritirare o mettere in manutenzione:</strong> Imposta lo status su "maintenance" o "retired" per evitare nuove prenotazioni.</li>
                      <li><strong>Controllo disponibilità:</strong> Dal calendario prenotazioni il sistema mostra la disponibilità residua per ogni intervallo; per verifiche dettagliate usa il pannello di dettaglio dell'elemento.</li>
                    </ol>
                    <div className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">Nota: le azioni di gestione attrezzatura sono Admin-friendly ma lo Staff può aggiungere/modificare se il ruolo è abilitato; verifica i permessi in Impostazioni → Utenti.</div>
                  </div>
                </Card>

                <Card>
                  <div className="text-sm mb-2 font-semibold">Pacchetti e prezzi — Creare e gestire</div>
                  <div className="text-sm">
                    <ol className="list-decimal ml-5 space-y-2">
                      <li><strong>Nuovo pacchetto:</strong> Vai su "Pacchetti" → "Nuovo Pacchetto" → assegna nome, prezzo, durata e attrezzatura inclusa → salva.</li>
                      <li><strong>Aggiornare pacchetto:</strong> Modifica voci incluse o prezzo; le future prenotazioni useranno il nuovo prezzo ma le prenotazioni già create non vengono modificate automaticamente.</li>
                      <li><strong>Eliminare pacchetto:</strong> Elimina solo se non associato a prenotazioni attive; il sistema segnala conflitti.</li>
                    </ol>
                    <div className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">Permessi: gestione pacchetti tipicamente riservata ad Admin.</div>
                  </div>
                </Card>

                <Card>
                  <div className="text-sm mb-2 font-semibold">Clienti — Anagrafica e uso operativo</div>
                  <div className="text-sm">
                    <ol className="list-decimal ml-5 space-y-2">
                      <li><strong>Aggiungere cliente all'anagrafica:</strong> Vai su "Clienti" → "Nuovo cliente" → compila dati (nome, contatti, note) → salva. Puoi anche aggiungere cliente direttamente durante la creazione di una prenotazione.</li>
                      <li><strong>Ricerca rapida:</strong> usa la barra di ricerca nelle Prenotazioni per trovare clienti per nome o telefono.</li>
                      <li><strong>Gestione contatti:</strong> aggiorna email/telefono per notifiche automatiche e fatturazione.</li>
                    </ol>
                    <div className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">Nota: lo staff può creare e modificare clienti; per cancellazioni massicce contatta un Admin.</div>
                  </div>
                </Card>

                <Card>
                  <div className="text-sm mb-2 font-semibold">Turni e approvazioni</div>
                  <div className="text-sm">
                    <ol className="list-decimal ml-5 space-y-2">
                      <li><strong>Creare turno:</strong> Vai su "Turni" → "Nuovo turno" → seleziona dipendente, orario e note → salva come "Programmato".</li>
                      <li><strong>Approvazione (Admin):</strong> Admin può approvare o rimuovere approvazioni; l'azione emette evento realtime che aggiorna tutti i client.</li>
                      <li><strong>Comportamento Staff:</strong> lo staff vede badge "Approvato" o il pulsante per richiedere revisione ma non può marcare manualmente come completato se non autorizzato.</li>
                      <li><strong>Consigli:</strong> utilizza il filtro periodo per lavorare per settimane e usa note per giustificare modifiche; colleziona approvazioni prima di chiudere le payroll run.</li>
                    </ol>
                  </div>
                </Card>

                <Card>
                  <div className="text-sm mb-2 font-semibold">Paghe — Calcolo, Run, e trasformazione in spese</div>
                  <div className="text-sm">
                    <ol className="list-decimal ml-5 space-y-2">
                      <li><strong>Calcolare retribuzioni:</strong> Seleziona periodo e clicca "Calcola" per visualizzare voci e subtotali (staff vede solo il proprio conto).</li>
                      <li><strong>Crea payroll run (Admin):</strong> Scegli intervallo e clicca "Crea payroll run" → il sistema genera payroll_items e una payroll_run riepilogativa.</li>
                      <li><strong>Trasforma in spese:</strong> Clicca "Aggiungi alle spese" su una payroll run → il sistema crea una spesa per ciascun dipendente (categoria "Payroll - {'{Nome}'}") con nota "Paga {'{Nome}'}, periodo DD/MM/YYYY - DD/MM/YYYY (N ore)".</li>
                      <li><strong>Verifica:</strong> dopo la creazione viene marcato `expense_created` e la run può essere marcata come pagata o archiviata.</li>
                    </ol>
                    <div className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">Permessi: solo Admin può creare payroll run e trasformarle in spese; lo staff può solo calcolare il proprio prospetto.</div>
                  </div>
                </Card>

                {isAdmin && (
                  <Card>
                    <div className="text-sm mb-2 font-semibold">Gestire utenti — (Admin only)</div>
                    <div className="text-sm">
                      <ol className="list-decimal ml-5 space-y-2">
                        <li><strong>Aggiungere account:</strong> Vai su "Utenti" → "Nuovo utente" → assegna ruolo (admin/staff) e collega a dipendente.</li>
                        <li><strong>Modificare permessi:</strong> Aggiorna ruolo o disabilita account se necessario.</li>
                        <li><strong>Nota sicurezza:</strong> limitare gli account admin e utilizzare password sicure o SSO quando disponibile.</li>
                      </ol>
                    </div>
                  </Card>
                )}

                <Card>
                  <div className="text-sm mb-2 font-semibold">Report & Amministrazione — Operazioni</div>
                  <div className="text-sm">
                    <ol className="list-decimal ml-5 space-y-2">
                      <li><strong>Generare report:</strong> Scegli tipo (giornaliero/mensile), filtra per entità e clicca "Genera".</li>
                      <li><strong>Esportare:</strong> Usa il pulsante "Esporta CSV/PDF" per scaricare dati.</li>
                      <li><strong>Controlli contabili:</strong> verifica IVA e arrotondamenti prima di esportare per contabilità esterna.</li>
                    </ol>
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
                      <div>Le azioni sono limitate in base al ruolo. Se mancano funzioni, verifica di essere loggato con un account admin o contatta l'amministratore; alcune funzioni (es. creare payroll run) sono esclusivamente admin.</div>
                    </div>

                    <div className="mb-3">
                      <div className="font-semibold">Non vedo aggiornamenti realtime</div>
                      <div>Controlla la connessione di rete; il client si riconnette automaticamente in caso di interruzione. Se il problema persiste, verifica la console del browser per eventuali errori e segnala il problema con i log del server (se possibile).</div>
                    </div>

                    <div className="mb-3">
                      <div className="font-semibold">Ho un errore su payroll run</div>
                      <div>Verifica che la payroll run non sia marcata come pagata; controlla le voci associate, gli arrotondamenti e gli importi. Se necessario, esporta in CSV e controlla i dettagli, poi riapri la payroll run per correggere manualmente eventuali voci.</div>
                    </div>

                    <div className="mb-3">
                      <div className="font-semibold">Come esportare i dati?</div>
                      <div>Sì, i report principali supportano esportazione CSV/PDF: seleziona il periodo e usa il pulsante "Esporta"; per integrazioni periodiche usa le API o esporta regolarmente.</div>
                    </div>

                    <div className="mb-3">
                      <div className="font-semibold">Cosa fare se una spesa si crea duplicata?</div>
                      <div>Prima di tutto verifica lo stato `expense_created` su `payroll_items`. Se trovi duplicazioni, contattami e posso aggiungere controlli server-side aggiuntivi (attualmente la funzione evita duplicati marcando `expense_created`).</div>
                    </div>

                    <div className="mb-3">
                      <div className="font-semibold">Come risolvere problemi di sincronizzazione mobile?</div>
                      <div>Se il telefono non riceve eventi realtime, prova a riavviare l'app o ricaricare la pagina; come admin puoi forzare aggiornamenti ricaricando i dati dalla tabella corrispondente. Se il problema persiste, potremmo abilitare logging lato server per tracciare gli eventi.</div>
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