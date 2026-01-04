# Sup Manager

Progetto per gestire prenotazioni e contabilità di noleggio SUP.

Per avviare in locale:

1. Installa dipendenze:

   npm install

   Nota: assicurati di eseguire questo comando prima di aprire il progetto in VS Code o prima di eseguire il server di sviluppo, altrimenti il TypeScript language server mostrerà errori (es. "Cannot find module 'react'").

2. Avvia in sviluppo:

   npm run dev

3. Build per produzione:

   npm run build

NOTE:
- Ho incluso Tailwind CSS per UI responsive e veloce.
- Il prossimo passo è configurare Supabase (autenticazione + tabelle). Vedi `supabase-schema.sql` e `supabase-policies.sql`.

## Configurare Supabase (passo-passo)
1. Crea un progetto su https://app.supabase.com e prendi il **Project URL** e la **anon (public) key** (Settings -> API). Assicurati di copiare il **Project API URL** (es. https://<project-ref>.supabase.co) — non la URL della dashboard che **non** è corretta per le chiamate client.
2. Nella sezione **SQL Editor**, esegui i file `supabase-schema.sql` e poi `supabase-policies.sql` per creare tabelle e policy (notare: in questa versione l'app è configurata senza autenticazione — tutte le risorse sono pubbliche).
3. Copia `.env.example` in `.env.local` e sostituisci i valori con il tuo `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Avvia l'app in locale:
   - npm install
   - npm run dev

**Nota:** l'app è stata configurata per funzionare senza autenticazione (accesso pubblico). Se in futuro vuoi ripristinare l'autenticazione, dovremo reintrodurre la tabella `user` e ripristinare policy RLS adeguate.

### Nuove sezioni aggiunte
- **Attrezzatura** — puoi aggiungere elementi generici come SUP, Barche, Remi, Salvagenti, ecc. (tabella `equipment` in DB).
- **Prenotazioni** — gestione booking (già esistente).
- **Amministrazione** — spese e contabilità (component `Expenses`).
- **Menu laterale** — nuova `Sidebar` per navigare tra le sezioni.
- **Tema chiaro/scuro** — supporto tema con toggle (persistenza in localStorage) e supporto Tailwind `dark`.

### Resettare completamente il database (DISTRUTTIVO)
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