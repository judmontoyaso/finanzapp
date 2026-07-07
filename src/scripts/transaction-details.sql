-- =====================================================================
-- Detalle de transacción (ítems/sub-líneas del recibo). No son
-- transacciones; solo detalle para más control. Se guarda como JSON.
-- Ejecutar en Supabase → SQL Editor.
-- =====================================================================
ALTER TABLE finanzas.transactions
  ADD COLUMN IF NOT EXISTS details jsonb;
