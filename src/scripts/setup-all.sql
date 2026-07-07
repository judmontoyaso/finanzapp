-- =====================================================================
-- SETUP COMPLETO (compartir + tipos + recurrentes)
-- Pega TODO esto en Supabase → SQL Editor → Run. Es seguro re-ejecutarlo.
-- Requiere que el esquema base (schema.sql) ya exista.
-- =====================================================================

-- ---------- 1. COMPARTIR ESPACIOS (sharing) ----------
CREATE TABLE IF NOT EXISTS finanzas.workspace_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID REFERENCES finanzas.workspaces(id) ON DELETE CASCADE NOT NULL,
    invited_email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE (workspace_id, invited_email)
);

CREATE OR REPLACE FUNCTION finanzas.has_workspace_access(ws UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = finanzas, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM finanzas.workspaces w
    WHERE w.id = ws AND w.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM finanzas.workspace_members m
    WHERE m.workspace_id = ws
      AND lower(m.invited_email) = lower(auth.jwt() ->> 'email')
  );
$$;

ALTER TABLE finanzas.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member sees own membership" ON finanzas.workspace_members;
CREATE POLICY "member sees own membership" ON finanzas.workspace_members
    FOR SELECT TO authenticated
    USING (lower(invited_email) = lower(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Users can manage their workspaces" ON finanzas.workspaces;
DROP POLICY IF EXISTS "read shared workspaces" ON finanzas.workspaces;
DROP POLICY IF EXISTS "owner writes workspace" ON finanzas.workspaces;
DROP POLICY IF EXISTS "owner updates workspace" ON finanzas.workspaces;
DROP POLICY IF EXISTS "owner deletes workspace" ON finanzas.workspaces;

CREATE POLICY "read shared workspaces" ON finanzas.workspaces
    FOR SELECT TO authenticated USING (finanzas.has_workspace_access(id));
CREATE POLICY "owner writes workspace" ON finanzas.workspaces
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner updates workspace" ON finanzas.workspaces
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner deletes workspace" ON finanzas.workspaces
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories','transactions','budgets','savings_goals']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON finanzas.%I', 'Users can manage their '||replace(t,'_',' '), t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON finanzas.%I', 'members access '||t, t);
    EXECUTE format(
      'CREATE POLICY %I ON finanzas.%I FOR ALL TO authenticated '
      || 'USING (finanzas.has_workspace_access(workspace_id)) '
      || 'WITH CHECK (finanzas.has_workspace_access(workspace_id))',
      'members access '||t, t);
  END LOOP;
END $$;

GRANT ALL ON finanzas.workspace_members TO anon, authenticated;
GRANT EXECUTE ON FUNCTION finanzas.has_workspace_access(UUID) TO anon, authenticated;

-- ---------- 2. TIPOS DE ESPACIO + PERSONAL NO COMPARTIBLE ----------
ALTER TABLE finanzas.workspaces
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'other';

UPDATE finanzas.workspaces
  SET type = 'personal'
  WHERE name = 'Finanzas Personales' AND type = 'other';

DROP POLICY IF EXISTS "owner manage members" ON finanzas.workspace_members;
CREATE POLICY "owner manage members" ON finanzas.workspace_members
    FOR ALL TO authenticated
    USING (EXISTS (
      SELECT 1 FROM finanzas.workspaces w
      WHERE w.id = workspace_id AND w.user_id = auth.uid() AND w.type <> 'personal'
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM finanzas.workspaces w
      WHERE w.id = workspace_id AND w.user_id = auth.uid() AND w.type <> 'personal'
    ));

-- ---------- 3. TRANSACCIONES RECURRENTES ----------
CREATE TABLE IF NOT EXISTS finanzas.recurring_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID REFERENCES finanzas.workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
    category_id UUID REFERENCES finanzas.categories(id) ON DELETE SET NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
    next_date DATE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Asegurar frecuencias ampliadas también en tablas ya creadas
ALTER TABLE finanzas.recurring_transactions DROP CONSTRAINT IF EXISTS recurring_transactions_frequency_check;
ALTER TABLE finanzas.recurring_transactions ADD CONSTRAINT recurring_transactions_frequency_check
    CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'));

ALTER TABLE finanzas.recurring_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members access recurring_transactions" ON finanzas.recurring_transactions;
CREATE POLICY "members access recurring_transactions" ON finanzas.recurring_transactions
    FOR ALL TO authenticated
    USING (finanzas.has_workspace_access(workspace_id))
    WITH CHECK (finanzas.has_workspace_access(workspace_id));

GRANT ALL ON finanzas.recurring_transactions TO anon, authenticated;

-- ---------- 4. PERMISOS service_role (para los crons) ----------
GRANT USAGE ON SCHEMA finanzas TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA finanzas TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA finanzas TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA finanzas TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA finanzas GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA finanzas GRANT ALL ON SEQUENCES TO service_role;
