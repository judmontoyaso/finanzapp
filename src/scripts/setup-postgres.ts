import { Client } from 'pg'

const connectionString = 'postgresql://postgres:cleopatra123@db.gfyvjogffxgzkjrompdg.supabase.co:5432/postgres'

async function setupDatabase() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    await client.connect()
    console.log('Conectado a PostgreSQL')

    // Crear tablas
    await client.query(`
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
    `)
    console.log('Tablas creadas exitosamente')

    // Insertar categorías iniciales
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

    for (const category of initialCategories) {
      await client.query(
        'INSERT INTO categories (name, type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [category.name, category.type]
      )
    }
    console.log('Categorías insertadas exitosamente')

    // Obtener las categorías para usar sus IDs
    const { rows: categories } = await client.query('SELECT * FROM categories')
    
    // Insertar transacciones de ejemplo
    for (const category of categories) {
      await client.query(`
        INSERT INTO transactions (description, amount, type, category_id, date)
        VALUES ($1, $2, $3, $4, CURRENT_DATE)
      `, [
        `Ejemplo de ${category.type === 'income' ? 'ingreso' : 'gasto'} para ${category.name}`,
        category.type === 'income' ? 1000 : 500,
        category.type,
        category.id
      ])
    }
    console.log('Transacciones de ejemplo insertadas exitosamente')

    // Insertar presupuestos de ejemplo
    const expenseCategories = categories.filter(c => c.type === 'expense')
    for (const category of expenseCategories) {
      await client.query(`
        INSERT INTO budgets (category_id, amount, start_date, end_date)
        VALUES ($1, $2, DATE_TRUNC('month', CURRENT_DATE), 
                (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))
      `, [category.id, 1000])
    }
    console.log('Presupuestos de ejemplo insertados exitosamente')

    console.log('¡Base de datos configurada exitosamente!')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await client.end()
  }
}

setupDatabase()