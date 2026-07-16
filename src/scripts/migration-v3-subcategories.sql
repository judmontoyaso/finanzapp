-- Migración: Soporte de subcategorías (Relación Jerárquica)
-- Ejecuta este script en la consola SQL de Supabase.

-- Agregar columna parent_id que apunta a la misma tabla categories
ALTER TABLE finanzas.categories 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES finanzas.categories(id) ON DELETE SET NULL;

-- Crear un índice para optimizar consultas de subcategorías
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON finanzas.categories(parent_id);

-- Comentario explicativo
COMMENT ON COLUMN finanzas.categories.parent_id IS 'ID de la categoría padre (null para categorías principales)';
