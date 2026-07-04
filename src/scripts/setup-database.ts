/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gfyvjogffxgzkjrompdg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmeXZqb2dmZnhnemtqcm9tcGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTU0NzMsImV4cCI6MjA3MDQ5MTQ3M30.1aedDb3Jh1hvkEiNTB01KpmGfC7OSbOPESrOxNrb4kM'

const supabase = createClient(supabaseUrl, supabaseKey)

const createTablesSQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
    category_id UUID REFERENCES categories(id),
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category_id UUID REFERENCES categories(id),
    amount DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_dates ON budgets(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);
`

// Datos iniciales para las categorías
const initialCategories = [
  { name: 'Salario', type: 'income' },
  { name: 'Alquiler', type: 'expense' },
  { name: 'Comida', type: 'expense' },
  { name: 'Transporte', type: 'expense' },
  { name: 'Servicios', type: 'expense' },
  { name: 'Ocio', type: 'expense' },
  { name: 'Inversiones', type: 'income' },
  { name: 'Otros Ingresos', type: 'income' }
]

async function createTables() {
  try {
    // Ejecutar SQL para crear tablas
    const { error } = await supabase.rpc('exec_sql', { sql: createTablesSQL })
    if (error) throw error
    console.log('Tables created successfully!')
    return true
  } catch (error) {
    console.error('Error creating tables:', error)
    return false
  }
}

async function insertInitialCategories() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert(initialCategories)
      .select()

    if (error) throw error
    console.log('Categories inserted successfully:', data)
    return data
  } catch (error) {
    console.error('Error inserting categories:', error)
    return null
  }
}

async function insertSampleTransactions(categories: any[]) {
  try {
    const sampleTransactions = categories.map(category => ({
      description: `Ejemplo de ${category.type === 'income' ? 'ingreso' : 'gasto'} para ${category.name}`,
      amount: category.type === 'income' ? 1000 : 500,
      type: category.type,
      category_id: category.id,
      date: new Date().toISOString().split('T')[0]
    }))

    const { data, error } = await supabase
      .from('transactions')
      .insert(sampleTransactions)
      .select()

    if (error) throw error
    console.log('Sample transactions inserted successfully:', data)
  } catch (error) {
    console.error('Error inserting transactions:', error)
  }
}

async function insertSampleBudgets(categories: any[]) {
  try {
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    const sampleBudgets = categories
      .filter(category => category.type === 'expense')
      .map(category => ({
        category_id: category.id,
        amount: 1000,
        start_date: firstDayOfMonth.toISOString().split('T')[0],
        end_date: lastDayOfMonth.toISOString().split('T')[0]
      }))

    const { data, error } = await supabase
      .from('budgets')
      .insert(sampleBudgets)
      .select()

    if (error) throw error
    console.log('Sample budgets inserted successfully:', data)
  } catch (error) {
    console.error('Error inserting budgets:', error)
  }
}

async function setupDatabase() {
  try {
    // Paso 1: Crear tablas
    const tablesCreated = await createTables()
    if (!tablesCreated) return

    // Paso 2: Insertar categorías
    const categories = await insertInitialCategories()
    if (!categories) return

    // Paso 3: Insertar datos de ejemplo
    await insertSampleTransactions(categories)
    await insertSampleBudgets(categories)

    console.log('¡Base de datos configurada exitosamente!')
  } catch (error) {
    console.error('Error configurando la base de datos:', error)
  }
}

// Ejecutar la configuración
setupDatabase()
