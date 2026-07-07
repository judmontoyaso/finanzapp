-- =====================================================================
-- PERMISOS PARA service_role EN EL ESQUEMA finanzas
-- Necesario para los crons (leen todos los datos con la service role key).
-- Ejecutar en Supabase → SQL Editor.
-- =====================================================================
GRANT USAGE ON SCHEMA finanzas TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA finanzas TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA finanzas TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA finanzas TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA finanzas GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA finanzas GRANT ALL ON SEQUENCES TO service_role;
