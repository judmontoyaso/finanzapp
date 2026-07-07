-- =====================================================================
-- FIX: crear espacio fallaba con "violates row-level security policy".
-- Causa: .insert().select() hace INSERT ... RETURNING, que exige que la
-- fila nueva pase la política SELECT. Esa política usaba solo
-- has_workspace_access(id) (función STABLE) que NO ve la fila recién
-- insertada en el mismo statement. Se agrega el chequeo directo por dueño.
-- Ejecutar en Supabase → SQL Editor.
-- =====================================================================
ALTER TABLE finanzas.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read shared workspaces" ON finanzas.workspaces;
CREATE POLICY "read shared workspaces" ON finanzas.workspaces
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR finanzas.has_workspace_access(id));

DROP POLICY IF EXISTS "owner writes workspace" ON finanzas.workspaces;
CREATE POLICY "owner writes workspace" ON finanzas.workspaces
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner updates workspace" ON finanzas.workspaces;
CREATE POLICY "owner updates workspace" ON finanzas.workspaces
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner deletes workspace" ON finanzas.workspaces;
CREATE POLICY "owner deletes workspace" ON finanzas.workspaces
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON finanzas.workspaces TO authenticated;
