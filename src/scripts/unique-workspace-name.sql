-- =====================================================================
-- Nombre de espacio único por dueño (case-insensitive).
-- Ejecutar DESPUÉS de limpiar duplicados existentes, o fallará.
-- =====================================================================
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_user_name_uniq
    ON finanzas.workspaces (user_id, lower(name));
