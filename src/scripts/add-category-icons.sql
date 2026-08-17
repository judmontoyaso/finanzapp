-- Migración para añadir soporte de iconos y colores a categorías
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon VARCHAR(100);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color VARCHAR(50);

-- Comentario explicativo
COMMENT ON COLUMN categories.icon IS 'Identificador o nombre del icono para la categoría (ej. utensils, car, house, wallet, etc.)';
COMMENT ON COLUMN categories.color IS 'Color hexadecimal o nombre del color para la categoría';
