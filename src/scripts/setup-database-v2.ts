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
  try {
    // Primero intentamos obtener las categorías existentes
    const { data: existingCategories, error: fetchError } = await supabase
      .from('categories')
      .select('name')

    if (fetchError) {
      console.log('La tabla categories aún no existe, procediendo con la inserción...')
    } else if (existingCategories && existingCategories.length > 0) {
      console.log('Las categorías ya existen, omitiendo inserción.')
      return
    }

    const { data, error } = await supabase
      .from('categories')
      .insert(initialCategories)
      .select()

    if (error) {
      console.error('Error insertando categorías:', error)
      return null
    }

    console.log('¡Categorías insertadas exitosamente!')
    return data
  } catch (error) {
    console.error('Error en la operación de categorías:', error)
    return null
  }
}

async function insertSampleData() {
  try {
    // Obtener las categorías
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')

    if (categoriesError) {
      throw categoriesError
    }

    if (!categories || categories.length === 0) {
      console.log('No hay categorías disponibles')
      return
    }

    // Crear algunas transacciones de ejemplo
    const sampleTransactions = categories.map(category => ({
      description: `Ejemplo de ${category.type === 'income' ? 'ingreso' : 'gasto'} para ${category.name}`,
      amount: category.type === 'income' ? 1000 : 500,
      type: category.type,
      category_id: category.id,
      date: new Date().toISOString().split('T')[0]
    }))

    const { error: transactionsError } = await supabase
      .from('transactions')
      .insert(sampleTransactions)

    if (transactionsError) {
      console.error('Error insertando transacciones:', transactionsError)
    } else {
      console.log('¡Transacciones de ejemplo insertadas!')
    }

    // Crear presupuestos de ejemplo
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

    const { error: budgetsError } = await supabase
      .from('budgets')
      .insert(sampleBudgets)

    if (budgetsError) {
      console.error('Error insertando presupuestos:', budgetsError)
    } else {
      console.log('¡Presupuestos de ejemplo insertados!')
    }

  } catch (error) {
    console.error('Error insertando datos de ejemplo:', error)
  }
}

async function setupDatabase() {
  console.log('Iniciando configuración de la base de datos...')
  
  // Paso 1: Insertar categorías iniciales
  await insertInitialCategories()
  
  // Paso 2: Insertar datos de ejemplo
  await insertSampleData()
  
  console.log('¡Proceso de configuración completado!')
}

// Ejecutar la configuración
setupDatabase()
