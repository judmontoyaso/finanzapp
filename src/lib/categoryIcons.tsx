import {
  FaUtensils,
  FaBasketShopping,
  FaMugHot,
  FaBurger,
  FaPizzaSlice,
  FaBeerMugEmpty,
  FaWineGlass,
  FaAppleWhole,
  FaIceCream,
  FaCar,
  FaGasPump,
  FaBus,
  FaTaxi,
  FaTrain,
  FaPlane,
  FaMotorcycle,
  FaBicycle,
  FaSquareParking,
  FaWrench,
  FaHouse,
  FaBuilding,
  FaBolt,
  FaDroplet,
  FaFire,
  FaWifi,
  FaTv,
  FaCouch,
  FaBroom,
  FaKey,
  FaMoneyBillWave,
  FaWallet,
  FaCoins,
  FaCreditCard,
  FaBuildingColumns,
  FaPiggyBank,
  FaArrowTrendUp,
  FaReceipt,
  FaPercent,
  FaHandHoldingDollar,
  FaBriefcase,
  FaShop,
  FaHeartPulse,
  FaPills,
  FaHospital,
  FaTooth,
  FaGlasses,
  FaDumbbell,
  FaPersonRunning,
  FaSpa,
  FaScissors,
  FaGamepad,
  FaFilm,
  FaMusic,
  FaTicket,
  FaGift,
  FaShirt,
  FaBagShopping,
  FaCamera,
  FaGraduationCap,
  FaBook,
  FaLaptop,
  FaMobileScreen,
  FaPenNib,
  FaPaw,
  FaBaby,
  FaPeopleRoof,
  FaUmbrella,
  FaShieldHalved,
  FaStar,
  FaTag,
  FaFolder,
  FaHeart
} from 'react-icons/fa6'
import { IconType } from 'react-icons'

export interface CategoryIconItem {
  key: string
  label: string
  group: string
  icon: IconType
  keywords: string[]
}

export const CATEGORY_ICON_LIST: CategoryIconItem[] = [
  // --- ALIMENTACIÓN Y BEBIDAS ---
  { key: 'utensils', label: 'Restaurante / Comida', group: 'Alimentación', icon: FaUtensils, keywords: ['restaurante', 'comida', 'cenas', 'almuerzo', 'desayuno', 'chef', 'plato', 'gastronomia'] },
  { key: 'basket-shopping', label: 'Supermercado / Mercado', group: 'Alimentación', icon: FaBasketShopping, keywords: ['mercado', 'supermercado', 'viveres', 'tienda', 'despensa', 'mercaderia', 'exito', 'jumbo', 'carulla', 'd1', 'ara'] },
  { key: 'mug-hot', label: 'Café / Panadería', group: 'Alimentación', icon: FaMugHot, keywords: ['cafe', 'cafeteria', 'starbucks', 'juan valdez', 'panaderia', 'desayuno', 'coffee', 'te'] },
  { key: 'burger', label: 'Comida Rápida', group: 'Alimentación', icon: FaBurger, keywords: ['hamburguesa', 'comida rapida', 'mcdonalds', 'burger', 'domicilio', 'rappi'] },
  { key: 'pizza-slice', label: 'Pizzería', group: 'Alimentación', icon: FaPizzaSlice, keywords: ['pizza', 'pizzeria', 'italiana'] },
  { key: 'apple-whole', label: 'Frutas y Salud', group: 'Alimentación', icon: FaAppleWhole, keywords: ['fruta', 'verdura', 'saludable', 'organico', 'nutricion', 'dieta'] },
  { key: 'beer-mug-empty', label: 'Bares / Cerveza', group: 'Alimentación', icon: FaBeerMugEmpty, keywords: ['bar', 'cerveza', 'trago', 'pub', 'licor', 'discoteca', 'fiesta', 'beers'] },
  { key: 'wine-glass', label: 'Vinos / Licores', group: 'Alimentación', icon: FaWineGlass, keywords: ['vino', 'licores', 'champagne', 'copa', 'coctel'] },
  { key: 'ice-cream', label: 'Postres / Helados', group: 'Alimentación', icon: FaIceCream, keywords: ['postre', 'helado', 'dulce', 'golosinas', 'snack'] },

  // --- TRANSPORTE Y VEHÍCULOS ---
  { key: 'car', label: 'Carro / Vehículo', group: 'Transporte', icon: FaCar, keywords: ['carro', 'auto', 'vehiculo', 'coche', 'automovil', 'transporte'] },
  { key: 'gas-pump', label: 'Gasolina / Combustible', group: 'Transporte', icon: FaGasPump, keywords: ['gasolina', 'combustible', 'tanquear', 'estacion', 'terpel', 'primax', 'esso'] },
  { key: 'taxi', label: 'Taxi / Uber / Didi', group: 'Transporte', icon: FaTaxi, keywords: ['taxi', 'uber', 'didi', 'cabify', 'inDrive', 'conductor', 'viaje urbano'] },
  { key: 'bus', label: 'Bus / Transporte Público', group: 'Transporte', icon: FaBus, keywords: ['bus', 'transmilenio', 'sitp', 'colectivo', 'pasaje', 'transporte publico'] },
  { key: 'train', label: 'Metro / Tren', group: 'Transporte', icon: FaTrain, keywords: ['metro', 'tren', 'ferrocarril', 'tranvia', 'estacion de metro'] },
  { key: 'plane', label: 'Vuelos / Avión', group: 'Transporte', icon: FaPlane, keywords: ['avion', 'vuelo', 'aeropuerto', 'tiquetes', 'avianca', 'latam', 'viaje'] },
  { key: 'motorcycle', label: 'Moto', group: 'Transporte', icon: FaMotorcycle, keywords: ['moto', 'motocicleta', 'soat', 'peaje moto'] },
  { key: 'bicycle', label: 'Bicicleta', group: 'Transporte', icon: FaBicycle, keywords: ['bici', 'bicicleta', 'cicloruta', 'repuestos bici'] },
  { key: 'parking', label: 'Parqueadero', group: 'Transporte', icon: FaSquareParking, keywords: ['parqueadero', 'estacionamiento', 'valet', 'parking'] },
  { key: 'wrench', label: 'Taller / Mantenimiento', group: 'Transporte', icon: FaWrench, keywords: ['taller', 'mantenimiento', 'mecanico', 'repuestos', 'lavado', 'revision', 'tecnomecanica'] },

  // --- VIVIENDA Y SERVICIOS ---
  { key: 'house', label: 'Casa / Vivienda', group: 'Vivienda', icon: FaHouse, keywords: ['casa', 'hogar', 'vivienda', 'arriendo', 'alquiler', 'hipoteca', 'cuota casa', 'residencia'] },
  { key: 'building', label: 'Apartamento / Edificio', group: 'Vivienda', icon: FaBuilding, keywords: ['apto', 'apartamento', 'administracion', 'edificio', 'condominio', 'conjunto'] },
  { key: 'bolt', label: 'Electricidad / Luz', group: 'Vivienda', icon: FaBolt, keywords: ['luz', 'electricidad', 'energia', 'enel', 'epm', 'servicio publico'] },
  { key: 'droplet', label: 'Agua / Alcantarillado', group: 'Vivienda', icon: FaDroplet, keywords: ['agua', 'acueducto', 'alcantarillado'] },
  { key: 'fire', label: 'Gas Natural', group: 'Vivienda', icon: FaFire, keywords: ['gas', 'gas natural', 'gasodomesticos'] },
  { key: 'wifi', label: 'Internet / WiFi', group: 'Vivienda', icon: FaWifi, keywords: ['internet', 'wifi', 'claro', 'tigo', 'movistar', 'fibra', 'red'] },
  { key: 'tv', label: 'Televisión / Streaming', group: 'Vivienda', icon: FaTv, keywords: ['tv', 'television', 'cable', 'directv', 'pantalla'] },
  { key: 'couch', label: 'Muebles / Hogar', group: 'Vivienda', icon: FaCouch, keywords: ['muebles', 'decoracion', 'sala', 'cama', 'ikea', 'homecenter'] },
  { key: 'broom', label: 'Aseo / Limpieza', group: 'Vivienda', icon: FaBroom, keywords: ['aseo', 'limpieza', 'detergente', 'empleada', 'servicio domestico'] },
  { key: 'key', label: 'Alquiler / Llaves', group: 'Vivienda', icon: FaKey, keywords: ['arriendo', 'inquilino', 'llaves', 'deposito', 'alquiler'] },

  // --- FINANZAS, DINERO E INGRESOS ---
  { key: 'money-bill-wave', label: 'Efectivo / Dinero', group: 'Finanzas', icon: FaMoneyBillWave, keywords: ['efectivo', 'dinero', 'plata', 'cash', 'retiro', 'cajero', 'moneda'] },
  { key: 'wallet', label: 'Salario / Billetera', group: 'Finanzas', icon: FaWallet, keywords: ['salario', 'sueldo', 'nomina', 'quincena', 'pago', 'honorarios', 'billetera'] },
  { key: 'coins', label: 'Monedas / Pagos', group: 'Finanzas', icon: FaCoins, keywords: ['monedas', 'cambio', 'propinas', 'ingresos varios'] },
  { key: 'credit-card', label: 'Tarjeta de Crédito', group: 'Finanzas', icon: FaCreditCard, keywords: ['tarjeta', 'credito', 'debito', 'visa', 'mastercard', 'amex', 'cuotas'] },
  { key: 'building-columns', label: 'Banco / Transferencia', group: 'Finanzas', icon: FaBuildingColumns, keywords: ['banco', 'transferencia', 'bancolombia', 'davivienda', 'bbva', 'nequi', 'daviplata'] },
  { key: 'piggy-bank', label: 'Ahorro / Alcancía', group: 'Finanzas', icon: FaPiggyBank, keywords: ['ahorro', 'alcancia', 'fondo', 'reserva', 'guardadito', 'ahorros'] },
  { key: 'arrow-trend-up', label: 'Inversiones / Rendimientos', group: 'Finanzas', icon: FaArrowTrendUp, keywords: ['inversion', 'inversiones', 'rendimientos', 'acciones', 'bolsa', 'fiducia', 'cdts', 'dividendos', 'crypto', 'bitcoin'] },
  { key: 'receipt', label: 'Facturas / Recibos', group: 'Finanzas', icon: FaReceipt, keywords: ['factura', 'recibo', 'cuenta', 'comprobante'] },
  { key: 'percent', label: 'Impuestos / DIAN', group: 'Finanzas', icon: FaPercent, keywords: ['impuestos', 'dian', 'retencion', 'iva', 'predial', 'renta', 'gravamen'] },
  { key: 'hand-holding-dollar', label: 'Préstamos / Deudas', group: 'Finanzas', icon: FaHandHoldingDollar, keywords: ['prestamo', 'deuda', 'intereses', 'hipoteca', 'credito personal', 'cuota'] },
  { key: 'briefcase', label: 'Trabajo / Empleo', group: 'Finanzas', icon: FaBriefcase, keywords: ['trabajo', 'empleo', 'empresa', 'oficina', 'cliente', 'consultoria'] },
  { key: 'shop', label: 'Ventas / Negocio', group: 'Finanzas', icon: FaShop, keywords: ['ventas', 'negocio', 'comercio', 'local', 'facturacion', 'tienda propia'] },

  // --- SALUD Y BIENESTAR ---
  { key: 'heart-pulse', label: 'Salud / Médico', group: 'Salud', icon: FaHeartPulse, keywords: ['salud', 'medico', 'consulta', 'eps', 'medicina prepagada', 'bienestar', 'clinica'] },
  { key: 'pills', label: 'Farmacia / Medicamentos', group: 'Salud', icon: FaPills, keywords: ['farmacia', 'drogueria', 'medicamentos', 'pastillas', 'receta', 'remedios'] },
  { key: 'hospital', label: 'Hospital / Urgencias', group: 'Salud', icon: FaHospital, keywords: ['hospital', 'urgencias', 'cirugia', 'laboratorio', 'examenes'] },
  { key: 'tooth', label: 'Odontología / Dental', group: 'Salud', icon: FaTooth, keywords: ['odontologia', 'dentista', 'dientes', 'ortodoncia', 'limpieza dental'] },
  { key: 'glasses', label: 'Óptica / Lentes', group: 'Salud', icon: FaGlasses, keywords: ['optica', 'gafas', 'lentes', 'oftalmologia', 'ojos'] },
  { key: 'dumbbell', label: 'Gimnasio / Fitness', group: 'Salud', icon: FaDumbbell, keywords: ['gimnasio', 'gym', 'smartfit', 'fitness', 'entrenamiento', 'pesas', 'suplementos'] },
  { key: 'person-running', label: 'Deporte / Ejercicio', group: 'Salud', icon: FaPersonRunning, keywords: ['deporte', 'ejercicio', 'running', 'futbol', 'ciclismo', 'tenis', 'natacion'] },
  { key: 'spa', label: 'Spa / Cuidado Personal', group: 'Salud', icon: FaSpa, keywords: ['spa', 'masaje', 'cuidado personal', 'skincare', 'estetica', 'relax'] },
  { key: 'scissors', label: 'Peluquería / Barbería', group: 'Salud', icon: FaScissors, keywords: ['peluqueria', 'barberia', 'corte', 'cabello', 'unas', 'manicure'] },

  // --- ENTRETENIMIENTO Y ESTILO DE VIDA ---
  { key: 'gamepad', label: 'Videojuegos / Gaming', group: 'Entretenimiento', icon: FaGamepad, keywords: ['videojuegos', 'gaming', 'playstation', 'xbox', 'nintendo', 'steam', 'juegos'] },
  { key: 'film', label: 'Cine / Películas', group: 'Entretenimiento', icon: FaFilm, keywords: ['cine', 'peliculas', 'cinecolombia', 'cinemark', 'estreno'] },
  { key: 'music', label: 'Música / Conciertos', group: 'Entretenimiento', icon: FaMusic, keywords: ['musica', 'spotify', 'apple music', 'concierto', 'festival', 'boletas'] },
  { key: 'ticket', label: 'Eventos / Boletas', group: 'Entretenimiento', icon: FaTicket, keywords: ['eventos', 'boletas', 'entradas', 'teatro', 'show', 'tuboleta'] },
  { key: 'gift', label: 'Regalos / Fechas Especiales', group: 'Entretenimiento', icon: FaGift, keywords: ['regalo', 'cumpleanos', 'navidad', 'aniversario', 'donacion', 'detalle'] },
  { key: 'shirt', label: 'Ropa / Vestuario', group: 'Entretenimiento', icon: FaShirt, keywords: ['ropa', 'vestuario', 'moda', 'zapatos', 'calzado', 'zara', 'h&m'] },
  { key: 'bag-shopping', label: 'Compras / Shopping', group: 'Entretenimiento', icon: FaBagShopping, keywords: ['compras', 'shopping', 'centro comercial', 'amazon', 'aliexpress', 'mercadolibre'] },
  { key: 'camera', label: 'Fotografía / Arte', group: 'Entretenimiento', icon: FaCamera, keywords: ['fotografia', 'foto', 'camara', 'arte', 'diseno'] },

  // --- EDUCACIÓN Y TECNOLOGÍA ---
  { key: 'graduation-cap', label: 'Educación / Universidad', group: 'Educación', icon: FaGraduationCap, keywords: ['educacion', 'universidad', 'colegio', 'matricula', 'semestre', 'diplomado'] },
  { key: 'book', label: 'Libros / Cursos', group: 'Educación', icon: FaBook, keywords: ['libros', 'cursos', 'platzi', 'udemy', 'capacitacion', 'lectura', 'estudio'] },
  { key: 'laptop', label: 'Computador / Tecnología', group: 'Educación', icon: FaLaptop, keywords: ['computador', 'tecnologia', 'software', 'hardware', 'apple', 'laptop', 'programas'] },
  { key: 'mobile-screen', label: 'Celular / Plan Móvil', group: 'Educación', icon: FaMobileScreen, keywords: ['celular', 'telefono', 'plan movil', 'recargas', 'smartphone', 'datos'] },
  { key: 'pen-nib', label: 'Papelería / Útiles', group: 'Educación', icon: FaPenNib, keywords: ['papeleria', 'utiles', 'cuadernos', 'fotocopias', 'impresion'] },

  // --- FAMILIA, MASCOTAS Y OTROS ---
  { key: 'paw', label: 'Mascotas / Veterinaria', group: 'Familia y Otros', icon: FaPaw, keywords: ['mascotas', 'perro', 'gato', 'veterinaria', 'cleo', 'pet', 'purina', 'concentrado'] },
  { key: 'baby', label: 'Bebé / Hijos', group: 'Familia y Otros', icon: FaBaby, keywords: ['bebe', 'hijos', 'panales', 'guarderia', 'pediatra', 'juguetes'] },
  { key: 'people-roof', label: 'Familia', group: 'Familia y Otros', icon: FaPeopleRoof, keywords: ['familia', 'padres', 'hermanos', 'apoyo familiar', 'casa familiar'] },
  { key: 'heart', label: 'Donaciones / Pareja', group: 'Familia y Otros', icon: FaHeart, keywords: ['donacion', 'caridad', 'pareja', 'novios', 'amor'] },
  { key: 'umbrella', label: 'Seguros / Pólizas', group: 'Familia y Otros', icon: FaUmbrella, keywords: ['seguro', 'seguros', 'poliza', 'sura', 'seguro de vida', 'seguro hogar'] },
  { key: 'shield-halved', label: 'Seguridad', group: 'Familia y Otros', icon: FaShieldHalved, keywords: ['seguridad', 'vigilancia', 'alarma', 'proteccion'] },
  { key: 'star', label: 'Destacado / Favorito', group: 'Familia y Otros', icon: FaStar, keywords: ['favorito', 'destacado', 'especial', 'importante'] },
  { key: 'tag', label: 'Etiqueta General', group: 'Familia y Otros', icon: FaTag, keywords: ['etiqueta', 'otros', 'varios', 'miscelaneos', 'general'] },
  { key: 'folder', label: 'Carpeta / General', group: 'Familia y Otros', icon: FaFolder, keywords: ['carpeta', 'categoria', 'archivo', 'modulo'] },
]

// Mapa de búsqueda rápida de iconos por key
const ICON_MAP = new Map<string, CategoryIconItem>(
  CATEGORY_ICON_LIST.map(item => [item.key, item])
)

/**
 * Obtiene el componente de icono según su clave
 */
export function getCategoryIconComponent(key?: string | null): IconType {
  if (!key) return FaFolder
  const found = ICON_MAP.get(key)
  return found ? found.icon : FaFolder
}

/**
 * Detección automática inteligente del mejor icono según el nombre de la categoría
 */
export function detectCategoryIcon(categoryName: string, type?: 'income' | 'expense'): string {
  if (!categoryName) return type === 'income' ? 'wallet' : 'tag'
  
  const clean = categoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

  // Buscar coincidencia en keywords
  for (const item of CATEGORY_ICON_LIST) {
    if (item.keywords.some(kw => clean.includes(kw) || kw.includes(clean))) {
      return item.key
    }
  }

  // Fallback por tipo
  if (type === 'income') return 'wallet'
  return 'tag'
}

/**
 * Resuelve el icono definitivo para una categoría dada
 */
export function resolveCategoryIcon(category?: { name?: string; icon?: string | null; type?: 'income' | 'expense' } | null): {
  key: string
  Icon: IconType
  label: string
} {
  if (!category) {
    return { key: 'folder', Icon: FaFolder, label: 'General' }
  }

  // Si tiene un icono explícito y válido
  if (category.icon && ICON_MAP.has(category.icon)) {
    const item = ICON_MAP.get(category.icon)!
    return { key: item.key, Icon: item.icon, label: item.label }
  }

  // Auto-detectar
  const detectedKey = detectCategoryIcon(category.name || '', category.type)
  const item = ICON_MAP.get(detectedKey) || { key: 'folder', icon: FaFolder, label: 'General' }
  return { key: item.key, Icon: item.icon, label: item.label }
}
