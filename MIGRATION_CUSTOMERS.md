# Migrazione Database - Gestione Clienti

## Istruzioni per Supabase

Esegui queste query SQL nel pannello SQL Editor di Supabase:

### 1. Creare tabella customers

```sql
-- Tabella per gestione anagrafica clienti
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per ricerche veloci
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- RLS policies (Row Level Security)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON customers
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON customers
  FOR DELETE USING (auth.role() = 'authenticated');
```

### 2. Aggiungere customer_id alla tabella booking

```sql
-- Aggiungi riferimento al cliente nella prenotazione
ALTER TABLE booking ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Indice per migliorare performance
CREATE INDEX IF NOT EXISTS idx_booking_customer_id ON booking(customer_id);
```

### 3. Aggiungere campi manutenzione a equipment

```sql
-- Aggiungi campi per gestione manutenzione
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS last_maintenance TIMESTAMPTZ;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS next_maintenance TIMESTAMPTZ;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS maintenance_notes TEXT;
```

### 4. Creare tabella maintenance_log

```sql
-- Tabella per storico manutenzioni
CREATE TABLE IF NOT EXISTS maintenance_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  maintenance_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT NOT NULL,
  cost NUMERIC(10, 2),
  technician TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_log_equipment ON maintenance_log(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_log_date ON maintenance_log(maintenance_date);

-- RLS policies
ALTER TABLE maintenance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON maintenance_log
  FOR ALL USING (auth.role() = 'authenticated');
```

## Verifica

Dopo aver eseguito le migrazioni, verifica che le tabelle siano state create:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('customers', 'maintenance_log');
```

## Note

- Le policy RLS permettono accesso completo agli utenti autenticati
- I campi sono opzionali per retrocompatibilità
- Gli indici migliorano le performance di ricerca
- La cancellazione di un cliente NON cancella le prenotazioni (SET NULL)
