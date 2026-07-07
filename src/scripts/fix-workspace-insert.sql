-- =====================================================================
-- FIX: recrea las políticas RLS de finanzas.workspaces
-- Corrige "new row violates row-level security policy" al crear espacio.
-- Ejecutar en Supabase → SQL Editor.
-- =====================================================================
ALTER TABLE finanzas.workspaces ENABLE ROW LEVEL SECURITY;

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

GRANT ALL ON finanzas.workspaces TO authenticated;
