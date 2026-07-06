-- =====================================================================
-- TRANSACCIONES RECURRENTES (salario, arriendo, suscripciones...)
-- Se confirman manualmente cada periodo (no se registran solas).
-- Ejecutar DESPUÉS de sharing.sql, en el SQL Editor de Supabase.
-- =====================================================================

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

ALTER TABLE finanzas.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Acceso por membresía del espacio (editor total)
DROP POLICY IF EXISTS "members access recurring_transactions" ON finanzas.recurring_transactions;
CREATE POLICY "members access recurring_transactions" ON finanzas.recurring_transactions
    FOR ALL TO authenticated
    USING (finanzas.has_workspace_access(workspace_id))
    WITH CHECK (finanzas.has_workspace_access(workspace_id));

GRANT ALL ON finanzas.recurring_transactions TO anon, authenticated;
