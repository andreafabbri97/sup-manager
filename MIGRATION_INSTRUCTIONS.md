# Migrazioni Database - Istruzioni

Per applicare le nuove funzionalità alla tua istanza Supabase, devi eseguire i seguenti script SQL nella **SQL Editor** del tuo progetto Supabase.

## Come eseguire le migration

1. Vai su https://app.supabase.com
2. Seleziona il tuo progetto
3. Nel menu laterale, vai su **SQL Editor**
4. Clicca su **New query**
5. Copia e incolla il contenuto di uno dei file qui sotto
6. Clicca su **Run** (o usa Ctrl+Enter)

## Migration necessarie (in ordine)

### 1. Aggiungere campi ai Pacchetti
**File**: `supabase-migrations/add-package-fields.sql`

Aggiunge i campi `duration` (durata in minuti) e `equipment_items` (array JSONB di attrezzature) alla tabella `package`.

```sql
-- Add duration and equipment_items to package table
ALTER TABLE package ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60;
ALTER TABLE package ADD COLUMN IF NOT EXISTS equipment_items JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN package.duration IS 'Duration in minutes';
COMMENT ON COLUMN package.equipment_items IS 'Array of {id: equipment_id, quantity: number}';
```

### 2. Aggiungere equipment_items alle Prenotazioni
**File**: `supabase-migrations/add-booking-equipment-items.sql`

Aggiunge il campo `equipment_items` (array JSONB di attrezzature) alla tabella `booking` per supportare prenotazioni con attrezzatura multipla.

```sql
-- Add equipment_items to booking table
ALTER TABLE booking ADD COLUMN IF NOT EXISTS equipment_items JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN booking.equipment_items IS 'Array of {id: equipment_id, quantity: number}';
```

## Verifica

Dopo aver eseguito le migration, verifica che le colonne siano state create correttamente:

```sql
-- Verifica struttura tabella package
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'package' 
AND column_name IN ('duration', 'equipment_items');

-- Verifica struttura tabella booking
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'booking' 
AND column_name = 'equipment_items';
```

Dovresti vedere:
- `package.duration` (integer, default 60)
- `package.equipment_items` (jsonb, default '[]'::jsonb)
- `booking.equipment_items` (jsonb, default '[]'::jsonb)

Se compare questo errore quando provi a creare una prenotazione:

```
Could not find the 'equipment_items' column of 'booking' in the schema cache
```

prova questi passaggi (in ordine):
1. Nella **SQL Editor** esegui una query di controllo per forzare l'aggiornamento della cache REST del server:
   ```sql
   SELECT * FROM booking LIMIT 1;
   ```
2. Attendi qualche secondo, ricarica la pagina dell'app (F5) e riprova a creare la prenotazione.
3. Se l'errore persiste, riavvia il progetto Supabase (Dashboard -> Settings -> Database -> Restart) e riprova dopo che il progetto è tornato online.

Questi passaggi risolvono il problema relativo alla cache del metadata usata da PostgREST che a volte non vede immediatamente le nuove colonne dopo una migrazione.

## Note importanti

- Queste migration sono **non distruttive**: aggiungono solo nuove colonne senza modificare o eliminare dati esistenti
- Se una colonna esiste già, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` non farà nulla (nessun errore)
- I dati esistenti non verranno modificati
- Le nuove colonne avranno valori di default (60 minuti per duration, array vuoto per equipment_items)

## Rollback (in caso di problemi)

Se vuoi rimuovere le modifiche:

```sql
-- Rimuovi colonne da package
ALTER TABLE package DROP COLUMN IF EXISTS duration;
ALTER TABLE package DROP COLUMN IF EXISTS equipment_items;

-- Rimuovi colonna da booking
ALTER TABLE booking DROP COLUMN IF EXISTS equipment_items;
```

**ATTENZIONE**: questo eliminerà i dati in queste colonne se ne hai già inseriti.
