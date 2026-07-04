import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gfyvjogffxgzkjrompdg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmeXZqb2dmZnhnemtqcm9tcGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTU0NzMsImV4cCI6MjA3MDQ5MTQ3M30.1aedDb3Jh1hvkEiNTB01KpmGfC7OSbOPESrOxNrb4kM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectDatabase() {
  try {
    // Get all tables from the public schema
    const { data: tables, error: directError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
    
    if (directError) throw directError
    console.log('Tables found:', tables)
    
    // Get sample data from each table
    for (const table of tables || []) {
      const { data: sampleData, error: sampleError } = await supabase
        .from(table.tablename)
        .select('*')
        .limit(5)
      
      if (sampleError) {
        console.error(`Error getting data from ${table.tablename}:`, sampleError)
        continue
      }
      
      console.log(`\nSample data from ${table.tablename}:`, sampleData)
    }
  } catch (error) {
    console.error('Error inspecting database:', error)
  }
}

inspectDatabase()