/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gfyvjogffxgzkjrompdg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmeXZqb2dmZnhnemtqcm9tcGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTU0NzMsImV4cCI6MjA3MDQ5MTQ3M30.1aedDb3Jh1hvkEiNTB01KpmGfC7OSbOPESrOxNrb4kM'

const supabase = createClient(supabaseUrl, supabaseKey)

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

async function insertInitialCategories() {
  const { data, error } = await supabase
    .from('categories')
    .insert(initialCategories)
    .select()

  if (error) {
    console.error('Error inserting categories:', error)
  } else {
    console.log('Categories inserted successfully:', data)
  }
}

// Insertar datos de ejemplo para transacciones
async function insertSampleTransactions(categories: any[]) {
  const sampleTransactions = categories.map(category => ({
    description: `Sample ${category.type === 'income' ? 'Income' : 'Expense'} for ${category.name}`,
    amount: category.type === 'income' ? 1000 : 500,
    type: category.type,
    category_id: category.id,
    date: new Date().toISOString().split('T')[0]
  }))

  const { data, error } = await supabase
    .from('transactions')
    .insert(sampleTransactions)
    .select()

  if (error) {
    console.error('Error inserting transactions:', error)
  } else {
    console.log('Sample transactions inserted successfully:', data)
  }
}

// Insertar presupuestos de ejemplo
async function insertSampleBudgets(categories: any[]) {
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

  if (error) {
    console.error('Error inserting budgets:', error)
  } else {
    console.log('Sample budgets inserted successfully:', data)
  }
}

async function setupDatabase() {
  try {
    // Insertar categorías
    await insertInitialCategories()
    
    // Obtener las categorías insertadas
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
    
    if (categoriesError) throw categoriesError
    
    if (categories && categories.length > 0) {
      // Insertar transacciones de ejemplo
      await insertSampleTransactions(categories)
      
      // Insertar presupuestos de ejemplo
      await insertSampleBudgets(categories)
    }

    console.log('Database setup completed successfully!')
  } catch (error) {
    console.error('Error setting up database:', error)
  }
}

setupDatabase()