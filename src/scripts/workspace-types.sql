-- =====================================================================
-- TIPOS DE ESPACIO DE TRABAJO + FINANZAS PERSONALES NO COMPARTIBLES
-- Ejecutar DESPUÉS de sharing.sql, en el SQL Editor de Supabase.
-- =====================================================================

-- 1. Columna de tipo: personal | home | business | other
ALTER TABLE finanzas.workspaces
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'other';

-- Marcar el espacio personal auto-creado (por nombre) como 'personal'
UPDATE finanzas.workspaces
  SET type = 'personal'
  WHERE name = 'Finanzas Personales' AND type = 'other';

-- 2. Bloquear invitaciones en espacios personales (defensa en el servidor).
--    El dueño solo gestiona miembros si el espacio NO es personal.
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
