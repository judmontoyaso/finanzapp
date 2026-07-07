-- =====================================================================
-- Configuración de reportes automáticos por IA (por espacio de trabajo).
-- Ejecutar DESPUÉS de sharing.sql, en el SQL Editor de Supabase.
-- =====================================================================
CREATE TABLE IF NOT EXISTS finanzas.report_settings (
    workspace_id UUID PRIMARY KEY REFERENCES finanzas.workspaces(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    period_days INT NOT NULL DEFAULT 15,
    next_run DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE finanzas.report_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members access report_settings" ON finanzas.report_settings;
CREATE POLICY "members access report_settings" ON finanzas.report_settings
    FOR ALL TO authenticated
    USING (finanzas.has_workspace_access(workspace_id))
    WITH CHECK (finanzas.has_workspace_access(workspace_id));

GRANT ALL ON finanzas.report_settings TO anon, authenticated, service_role;
