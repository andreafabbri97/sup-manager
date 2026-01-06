# Sup Manager

Progetto per gestire prenotazioni e contabilità di noleggio SUP.

Per avviare in locale:

1. Installa dipendenze:

   npm install

   Nota: assicurati di eseguire questo comando prima di aprire il progetto in VS Code o prima di eseguire il server di sviluppo, altrimenti il TypeScript language server mostrerà errori (es. "Cannot find module 'react'").

> CI: trigger build after sidebar fix (no-op change to re-run workflow)


2. Avvia in sviluppo:

   npm run dev

3. Build per produzione:

   npm run build

NOTE:
- Ho incluso Tailwind CSS per UI responsive e veloce.
- Il prossimo passo è configurare Supabase (autenticazione + tabelle). Vedi `supabase-schema.sql` e `supabase-policies.sql`.

## Configurare Supabase (passo-passo)
1. Crea un progetto su https://app.supabase.com e prendi il **Project URL** e la **anon (public) key** (Settings -> API). Assicurati di copiare il **Project API URL** (es. https://<project-ref>.supabase.co) — non la URL della dashboard che **non** è corretta per le chiamate client.
2. Nella sezione **SQL Editor**, esegui i file `supabase-schema.sql` e poi `supabase-policies.sql` per creare tabelle e policy (notare: in questa versione l'app è configurata senza autenticazione — tutte le risorse sono pubbliche). Se preferisci un reset completo, esegui il file `supabase-reset.sql` (vedi sotto).
3. Copia `.env.example` in `.env.local` e sostituisci i valori con il tuo `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

**Nota importante**: lo script `supabase-reset.sql` ora include anche i `GRANT` sullo schema public per i ruoli `anon` e `authenticated` in modo da evitare l'errore `permission denied for schema public`. Se dopo il reset riscontri ancora problemi, prova da SQL Editor a eseguire:

```sql
SELECT current_user, has_table_privilege(current_user, 'public.sup', 'select');
```

Se la query restituisce `false`, contattami e verifico il progetto Supabase (posso anche applicare io lo script se mi fornisci la service role key, oppure lo puoi eseguire tu dalla dashboard).
4. Avvia l'app in locale:
   - npm install
   - npm run dev

**Nota:** l'app è stata configurata per funzionare senza autenticazione (accesso pubblico). Se in futuro vuoi ripristinare l'autenticazione, dovremo reintrodurre la tabella `user` e ripristinare policy RLS adeguate.

## Nuove funzionalità e aggiornamenti

### Modifiche recenti (Gen 2026)
- UI/notifiche: il pannello notifiche ora si chiude cliccando o toccando **fuori** dal pannello (desktop e mobile) e supporta anche la chiusura con `Escape`. Il comportamento touch è stato reso robusto evitando chiusure accidentali durante l'interazione interna.
- Modal: fix per evitare la chiusura immediata al primo tocco (gestione pointer/touch migliorata) e backdrop più affidabile su mobile.
- Calendario (vista Giorno): rimosso il numero fattura inline accanto all'attrezzatura nelle card per evitare confusione; il dettaglio fattura rimane disponibile nell'Archivio e nel dettaglio prenotazione.
- Sidebar: voce aggiornata a **"Report & Amministrazione"** con icona grafico a colonne per maggiore chiarezza.
- Reports: titolo della pagina aggiornato in **"Report & Amministrazione"**.

### Sistema di Pacchetti
La sezione **Pacchetti** ora supporta:
- Creazione pacchetti con modal "Nuovo Pacchetto"
- Selezione multipla di attrezzatura (es. 1 barca + 2 SUP)
- Durata personalizzabile (in minuti)
- Prezzo fisso per pacchetto

**Migrazione DB necessaria**: Esegui il file `supabase-migrations/add-package-fields.sql` per aggiungere i campi `duration` e `equipment_items` alla tabella `package`.

### Vista Calendario per Prenotazioni
La sezione **Prenotazioni** è stata completamente rinnovata con:
- Vista giorno/settimana/mese stile calendario
- Navigazione tra periodi con frecce avanti/indietro
- Pulsante "Nuova Prenotazione" in alto a destra
- Modal per creare prenotazioni con selezione multipla di attrezzatura
- Supporto per pacchetti opzionali nelle prenotazioni

**Migrazione DB necessaria**: Esegui il file `supabase-migrations/add-booking-equipment-items.sql` per aggiungere il campo `equipment_items` alla tabella `booking`.

### Aggiungere prezzo orario all'attrezzatura
**File**: `supabase-migrations/add-equipment-price.sql`

Aggiunge il campo `price_per_hour` (numeric) alla tabella `equipment` per memorizzare il prezzo di noleggio standard orario. Serve per calcolare automaticamente i ricavi delle prenotazioni quando si seleziona l'attrezzatura invece di un pacchetto.

```sql
-- Add hourly price to equipment table
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS price_per_hour numeric DEFAULT 0;

COMMENT ON COLUMN equipment.price_per_hour IS 'Standard hourly rental price';
```

### Progressive Web App (PWA)
L'app è ora installabile come Progressive Web App:
- Manifest.json configurato
- Service Worker per caching offline
- Icone app (192x192 e 512x512)
- Funziona anche offline (risorse in cache)

Gli utenti possono installare l'app direttamente dal browser (Chrome/Edge: menu → Installa app).

### Miglioramenti UI
- Titoli corretti per ogni sezione (Dashboard, Attrezzatura, Prenotazioni, ecc.)
- Rimossa sezione "Spese" dalla sidebar (già inclusa in Amministrazione)
- Modal componente riutilizzabile per dialoghi
- Design responsive ottimizzato per mobile
- Sidebar mobile ora è un overlay: pulsante "hamburger" fisso in alto a sinistra apre/chiude la sidebar, supporta backdrop, chiusura con ESC e focus-trap per accessibilità
- Dark mode completo supportato

## Configurare Supabase (passo-passo)
Se vuoi cancellare TUTTO e ripartire da zero (OK perché il progetto è vuoto), esegui il file `supabase-reset.sql` nel SQL Editor del progetto Supabase:

1. Apri il progetto su https://app.supabase.com → SQL Editor → New query
2. Incolla il contenuto di `supabase-reset.sql` e premi **Run**. Questo eseguirà `DROP SCHEMA public CASCADE` e ricreerà tutte le tabelle e policy definite nel progetto (nota: la versione corrente non prevede la tabella `user`).

ATTENZIONE: questa operazione è distruttiva e cancella tutti i dati. Assicurati di volerlo prima di eseguire lo script.

Per sicurezza: non condividere la `service_role` key; la `anon` key è sufficiente per l'app client.
## Impostare i segreti GitHub per il deploy (necessario)
1. Vai nella repository su GitHub → Settings → Secrets and variables → Actions → New repository secret.
2. Crea questi due segreti (valori dal tuo progetto Supabase - Settings → API):
   - `SUPABASE_URL` = (Project URL, es. https://xyz.supabase.co)
   - `SUPABASE_ANON_KEY` = (anon/public key)
3. La GitHub Action `deploy.yml` usa questi segreti per costruire l'app con le variabili d'ambiente e poi pubblicare su GitHub Pages.

Nota: Ti serve eseguire i comandi git locali per mandare il codice a GitHub (vedi sezione seguente).