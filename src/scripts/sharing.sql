-- =====================================================================
-- COMPARTIR ESPACIOS DE TRABAJO (vincular personas por email)
-- Rol único: editor total (ve y edita todo dentro del espacio).
-- Ejecuta este script en el SQL Editor de Supabase.
-- =====================================================================

-- 1. Tabla de miembros invitados (por email)
CREATE TABLE IF NOT EXISTS finanzas.workspace_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID REFERENCES finanzas.workspaces(id) ON DELETE CASCADE NOT NULL,
    invited_email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE (workspace_id, invited_email)
);

-- 2. Función de acceso: el usuario actual es dueño O su email fue invitado.
--    SECURITY DEFINER evita recursion de RLS y permite leer las tablas base.
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

-- 3. RLS de la tabla de miembros
ALTER TABLE finanzas.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manage members" ON finanzas.workspace_members;
CREATE POLICY "owner manage members" ON finanzas.workspace_members
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM finanzas.workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM finanzas.workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid()));

DROP POLICY IF EXISTS "member sees own membership" ON finanzas.workspace_members;
CREATE POLICY "member sees own membership" ON finanzas.workspace_members
    FOR SELECT TO authenticated
    USING (lower(invited_email) = lower(auth.jwt() ->> 'email'));

-- 4. Reescribir RLS de workspaces: leer si dueño o miembro; escribir solo dueño
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

-- 5. Reescribir RLS de las tablas de datos: acceso por membresía (editor total)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories','transactions','budgets','savings_goals']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %L ON finanzas.%I', 'Users can manage their '||replace(t,'_',' '), t);
    EXECUTE format('DROP POLICY IF EXISTS %L ON finanzas.%I', 'members access '||t, t);
    EXECUTE format(
      'CREATE POLICY %L ON finanzas.%I FOR ALL TO authenticated '
      || 'USING (finanzas.has_workspace_access(workspace_id)) '
      || 'WITH CHECK (finanzas.has_workspace_access(workspace_id))',
      'members access '||t, t);
  END LOOP;
END $$;

-- 6. Permisos para el rol de la API
GRANT ALL ON finanzas.workspace_members TO anon, authenticated;
GRANT EXECUTE ON FUNCTION finanzas.has_workspace_access(UUID) TO anon, authenticated;
