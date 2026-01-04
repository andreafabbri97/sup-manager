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
1. Crea un progetto su https://app.supabase.com e prendi il **Project URL** e la **anon (public) key** (Settings -> API). Assicurati di copiare il **Project API URL** (es. https://<project-ref>.supabase.co) — non la URL della dashboard (es. https://supabase.com/dashboard/...) che **non** è corretta per le chiamate client e provoca errori CORS.
2. Nella sezione **SQL Editor**, esegui i file `supabase-schema.sql` e poi `supabase-policies.sql` per creare tabelle e policy RLS di base.
3. Copia `.env.example` in `.env.local` e sostituisci i valori con il tuo `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Avvia l'app in locale:
   - npm install
   - npm run dev
5. Apri l'app, manda il magic link tramite la form di accesso (email). Dopo il primo login verrà creato automaticamente un record nella tabella `user` con `role` vuoto (di default `staff`).
6. (OPZIONALE) Assegna manualmente il ruolo `owner` al tuo account tramite Supabase Studio dopo la registrazione:
   - vai in Table Editor -> `user`, trova la riga con `username = 'admin'` e imposta `role='owner'` (o esegui lo SQL indicato sotto).

### Rimozione autenticazione (impostazione attuale)
Per ora l'app è stata configurata per essere accessibile pubblicamente (nessun login). Questo rende più semplice provare il programma dal link GitHub Pages, ma significa che tutte le operazioni (creare SUP, prenotazioni, spese) sono accessibili pubblicamente.

Se vuoi ripristinare l'autenticazione in futuro, possiamo reintegrare Supabase Auth e ripristinare policy RLS più restrittive.

### Promuovere admin a owner (se vuoi che abbia permessi speciali)
Esegui nel SQL Editor di Supabase:
```sql
UPDATE "user" SET role='owner' WHERE username = 'admin';
```

### Creare login con username + password (flow impostato)
- L'app supporta ora **username + password** (senza email reale); i nomi utenti sono unici e case-insensitive.
- Per creare l'account amministratore `admin` con password `admin123` segui questi passaggi:
  1. Apri l'app (in locale o dopo il deploy) e nella schermata di registrazione crea l'utente **username: admin** e **password: admin123**.
  2. Vai su Supabase Console → SQL Editor e esegui:
     ```sql
     UPDATE "user" SET role='owner' WHERE username = 'admin';
     ```
  3. Ora l'account `admin` ha il ruolo `owner` e può gestire il sistema.

Nota di sicurezza: usare credenziali di default (admin/admin123) è comodo per sviluppo, ma è **fortemente** consigliato cambiare la password dopo il primo accesso e non usare queste credenziali in produzione.

### Resettare completamente il database (DISTRUTTIVO)
Se vuoi cancellare TUTTO e ripartire da zero (OK perché il progetto è vuoto), esegui il file `supabase-reset.sql` nel SQL Editor del progetto Supabase:

1. Apri il progetto su https://app.supabase.com → SQL Editor → New query
2. Incolla il contenuto di `supabase-reset.sql` e premi **Run**. Questo eseguirà `DROP SCHEMA public CASCADE` e ricreerà tutte le tabelle e policy definite nel progetto.
3. Dopo il reset, registra tramite l'app l'utente admin e promuovilo a owner come mostrato sopra.

ATTENZIONE: questa operazione è distruttiva e cancella tutti i dati. Assicurati di volerlo prima di eseguire lo script.

Per sicurezza: non condividere la `service_role` key; la `anon` key è sufficiente per l'app client.
## Impostare i segreti GitHub per il deploy (necessario)
1. Vai nella repository su GitHub → Settings → Secrets and variables → Actions → New repository secret.
2. Crea questi due segreti (valori dal tuo progetto Supabase - Settings → API):
   - `SUPABASE_URL` = (Project URL, es. https://xyz.supabase.co)
   - `SUPABASE_ANON_KEY` = (anon/public key)
3. La GitHub Action `deploy.yml` usa questi segreti per costruire l'app con le variabili d'ambiente e poi pubblicare su GitHub Pages.

Nota: Ti serve eseguire i comandi git locali per mandare il codice a GitHub (vedi sezione seguente).