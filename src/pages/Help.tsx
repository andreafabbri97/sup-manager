import React, { useEffect, useState } from 'react'
import PageTitle from '../components/ui/PageTitle'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { getCurrentUserRole } from '../lib/auth'

export default function HelpPage() {
  const [role, setRole] = useState<string | null>(null)

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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      <PageTitle>Guida & FAQ</PageTitle>

      <Card>
        <div className="text-sm mb-2 font-semibold">Guida descrittiva delle sezioni</div>
        <div className="space-y-3">
          <div>
            <div className="font-semibold">Prenotazioni</div>
            <div className="text-sm text-neutral-600">Viste e strumenti per cercare, creare e gestire le prenotazioni. Puoi filtrare per data e stato, aprire i dettagli di una prenotazione e modificare le informazioni.</div>
          </div>

          <div>
            <div className="font-semibold">Attrezzatura</div>
            <div className="text-sm text-neutral-600">Elenco dell'attrezzatura disponibile, stato e impostazioni. Puoi aggiungere nuovi elementi e modificare la disponibilità.</div>
          </div>

          <div>
            <div className="font-semibold">Dipendenti, Turni e Paghe</div>
            <div className="text-sm text-neutral-600">Gestione anagrafica dipendenti, programmazione e approvazione turni, e calcolo paghe. Gli admin hanno accesso completo; lo staff vede solo i propri turni e può calcolare la propria paga.</div>
          </div>

          {isAdmin && (
            <div>
              <div className="font-semibold">Report & Amministrazione</div>
              <div className="text-sm text-neutral-600">Strumenti di reporting, esportazioni e gestione amministrativa del sistema.</div>
            </div>
          )}

          {isAdmin && (
            <div>
              <div className="font-semibold">Utenti</div>
              <div className="text-sm text-neutral-600">Gestione degli account interni, ruoli e permessi.</div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="text-sm mb-2 font-semibold">Guida operativa - Esempi pratici</div>
        <div className="space-y-3">
          <div>
            <div className="font-semibold">Creare una prenotazione</div>
            <ol className="text-sm list-decimal list-inside text-neutral-600">
              <li>Vai su "Prenotazioni"</li>
              <li>Clicca su "Nuova prenotazione"</li>
              <li>Compila i dettagli (data, cliente, pacchetto) e salva</li>
            </ol>
          </div>

          <div>
            <div className="font-semibold">Programmare un turno (staff)</div>
            <ol className="text-sm list-decimal list-inside text-neutral-600">
              <li>Vai su "Turni" e clicca su "Nuovo turno"</li>
              <li>Imposta inizio/fine; lo stato sarà "Programmato"</li>
              <li>Salva: il turno comparirà nella lista e l'admin potrà approvarlo</li>
            </ol>
          </div>

          <div>
            <div className="font-semibold">Approvare o rifiutare un turno (admin)</div>
            <ol className="text-sm list-decimal list-inside text-neutral-600">
              <li>Vai su "Turni"</li>
              <li>Scegli il turno e clicca "Approva" o "Rifiuta"</li>
              <li>Il badge di stato si aggiornerà e lo staff lo vedrà in tempo reale</li>
            </ol>
          </div>

          <div>
            <div className="font-semibold">Calcolare la paga</div>
            <ol className="text-sm list-decimal list-inside text-neutral-600">
              <li>Vai su "Paghe"</li>
              <li>Se sei staff: imposta il periodo e clicca "Calcola" per vedere il riepilogo (solo per te)</li>
              <li>Se sei admin: puoi creare una payroll run completa e trasformarla in spese</li>
            </ol>
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-sm mb-2 font-semibold">FAQ - Domande frequenti</div>
        <div className="space-y-3 text-sm text-neutral-600">
          <div>
            <div className="font-semibold">Perché non vedo certi pulsanti?</div>
            <div>Alcune azioni sono riservate agli amministratori (ruolo "admin"). Se sei staff vedrai solo le azioni pertinenti al tuo ruolo.</div>
          </div>

          <div>
            <div className="font-semibold">Come posso fare in modo che le modifiche si vedano su tutti i dispositivi?</div>
            <div>Il sistema usa aggiornamenti realtime: quando un admin approva un turno o qualcuno modifica dati rilevanti, gli altri dispositivi ricevono l'aggiornamento automaticamente. Se l'aggiornamento non appare subito, controlla la connessione o ricarica la pagina.</div>
          </div>

          <div>
            <div className="font-semibold">Come riportare un errore o chiedere aiuto?</div>
            <div>Invia un messaggio al team di supporto (o apri un ticket). Se vuoi, puoi anche lasciare una nota nella pagina "Impostazioni" con i dettagli del problema.</div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Hai bisogno di più dettagli?</div>
            <div className="text-sm text-neutral-600">Se vuoi posso aggiungere esempi passo-passo, video o immagini per ciascuna operazione.</div>
          </div>
          <div>
            <Button onClick={() => window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Grazie! Dimmi cosa aggiungere nella Guida.', type: 'info' } }))}>Suggerisci modifica</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}