-- =====================================================================
-- SCRIPT DE MIGRACIÓN: ESQUEMA DE FINANZAS AISLADO
-- Ejecuta este script en el SQL Editor de tu Dashboard de Supabase.
-- =====================================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. CREAR ESQUEMA PERSONALIZADO PARA ESTE PROYECTO
CREATE SCHEMA IF NOT EXISTS finanzas;

-- 1. Tabla de Espacios de Trabajo (Negocios o Proyectos)
CREATE TABLE IF NOT EXISTS finanzas.workspaces (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Tabla de Categorías
CREATE TABLE IF NOT EXISTS finanzas.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES finanzas.workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Tabla de Transacciones
CREATE TABLE IF NOT EXISTS finanzas.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
    category_id UUID REFERENCES finanzas.categories(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES finanzas.workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 4. Tabla de Presupuestos
CREATE TABLE IF NOT EXISTS finanzas.budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category_id UUID REFERENCES finanzas.categories(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    workspace_id UUID REFERENCES finanzas.workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 5. Tabla de Metas de Ahorro
CREATE TABLE IF NOT EXISTS finanzas.savings_goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    target_amount DECIMAL(10,2) NOT NULL,
    current_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    target_date DATE,
    workspace_id UUID REFERENCES finanzas.workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- HABILITAR ROW LEVEL SECURITY (RLS) EN EL NUEVO ESQUEMA
ALTER TABLE finanzas.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE finanzas.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE finanzas.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finanzas.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE finanzas.savings_goals ENABLE ROW LEVEL SECURITY;

-- CREAR POLÍTICAS RLS (Solo el creador puede interactuar con sus datos)
CREATE POLICY "Users can manage their workspaces" ON finanzas.workspaces
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their categories" ON finanzas.categories
    FOR ALL TO authenticated USING (user_id IS NULL OR auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their transactions" ON finanzas.transactions
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their budgets" ON finanzas.budgets
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their savings goals" ON finanzas.savings_goals
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
