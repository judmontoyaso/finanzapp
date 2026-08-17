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
  color: string
  bgClass: string
  textClass: string
}

export const CATEGORY_ICON_LIST: CategoryIconItem[] = [
  // --- ALIMENTACIÓN Y BEBIDAS ---
  {
    key: 'utensils',
    label: 'Restaurante / Comida',
    group: 'Alimentación',
    icon: FaUtensils,
    keywords: ['restaurante', 'comida', 'cenas', 'almuerzo', 'desayuno', 'chef', 'plato', 'gastronomia'],
    color: 'orange',
    bgClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    textClass: 'text-orange-400'
  },
  {
    key: 'basket-shopping',
    label: 'Supermercado / Mercado',
    group: 'Alimentación',
    icon: FaBasketShopping,
    keywords: ['mercado', 'supermercado', 'viveres', 'tienda', 'despensa', 'mercaderia', 'exito', 'jumbo', 'carulla', 'd1', 'ara'],
    color: 'amber',
    bgClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    textClass: 'text-amber-400'
  },
  {
    key: 'mug-hot',
    label: 'Café / Panadería',
    group: 'Alimentación',
    icon: FaMugHot,
    keywords: ['cafe', 'cafeteria', 'starbucks', 'juan valdez', 'panaderia', 'desayuno', 'coffee', 'te'],
    color: 'amber',
    bgClass: 'bg-amber-600/15 text-amber-300 border-amber-600/30',
    textClass: 'text-amber-300'
  },
  {
    key: 'burger',
    label: 'Comida Rápida',
    group: 'Alimentación',
    icon: FaBurger,
    keywords: ['hamburguesa', 'comida rapida', 'mcdonalds', 'burger', 'domicilio', 'rappi'],
    color: 'yellow',
    bgClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    textClass: 'text-yellow-400'
  },
  {
    key: 'pizza-slice',
    label: 'Pizzería',
    group: 'Alimentación',
    icon: FaPizzaSlice,
    keywords: ['pizza', 'pizzeria', 'italiana'],
    color: 'orange',
    bgClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    textClass: 'text-orange-400'
  },
  {
    key: 'apple-whole',
    label: 'Frutas y Salud',
    group: 'Alimentación',
    icon: FaAppleWhole,
    keywords: ['fruta', 'verdura', 'saludable', 'organico', 'nutricion', 'dieta'],
    color: 'emerald',
    bgClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    textClass: 'text-emerald-400'
  },
  {
    key: 'beer-mug-empty',
    label: 'Bares / Cerveza',
    group: 'Alimentación',
    icon: FaBeerMugEmpty,
    keywords: ['bar', 'cerveza', 'trago', 'pub', 'licor', 'discoteca', 'fiesta', 'beers'],
    color: 'amber',
    bgClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    textClass: 'text-amber-400'
  },
  {
    key: 'wine-glass',
    label: 'Vinos / Licores',
    group: 'Alimentación',
    icon: FaWineGlass,
    keywords: ['vino', 'licores', 'champagne', 'copa', 'coctel'],
    color: 'rose',
    bgClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    textClass: 'text-rose-400'
  },
  {
    key: 'ice-cream',
    label: 'Postres / Helados',
    group: 'Alimentación',
    icon: FaIceCream,
    keywords: ['postre', 'helado', 'dulce', 'golosinas', 'snack'],
    color: 'pink',
    bgClass: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    textClass: 'text-pink-400'
  },

  // --- TRANSPORTE Y VEHÍCULOS ---
  {
    key: 'car',
    label: 'Carro / Vehículo',
    group: 'Transporte',
    icon: FaCar,
    keywords: ['carro', 'auto', 'vehiculo', 'coche', 'automovil', 'transporte'],
    color: 'sky',
    bgClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    textClass: 'text-sky-400'
  },
  {
    key: 'gas-pump',
    label: 'Gasolina / Combustible',
    group: 'Transporte',
    icon: FaGasPump,
    keywords: ['gasolina', 'combustible', 'tanquear', 'estacion', 'terpel', 'primax', 'esso'],
    color: 'amber',
    bgClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    textClass: 'text-amber-400'
  },
  {
    key: 'taxi',
    label: 'Taxi / Uber / Didi',
    group: 'Transporte',
    icon: FaTaxi,
    keywords: ['taxi', 'uber', 'didi', 'cabify', 'inDrive', 'conductor', 'viaje urbano'],
    color: 'yellow',
    bgClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    textClass: 'text-yellow-400'
  },
  {
    key: 'bus',
    label: 'Bus / Transporte Público',
    group: 'Transporte',
    icon: FaBus,
    keywords: ['bus', 'transmilenio', 'sitp', 'colectivo', 'pasaje', 'transporte publico'],
    color: 'blue',
    bgClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    textClass: 'text-blue-400'
  },
  {
    key: 'train',
    label: 'Metro / Tren',
    group: 'Transporte',
    icon: FaTrain,
    keywords: ['metro', 'tren', 'ferrocarril', 'tranvia', 'estacion de metro'],
    color: 'cyan',
    bgClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    textClass: 'text-cyan-400'
  },
  {
    key: 'plane',
    label: 'Vuelos / Avión',
    group: 'Transporte',
    icon: FaPlane,
    keywords: ['avion', 'vuelo', 'aeropuerto', 'tiquetes', 'avianca', 'latam', 'viaje'],
    color: 'indigo',
    bgClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    textClass: 'text-indigo-400'
  },
  {
    key: 'motorcycle',
    label: 'Moto',
    group: 'Transporte',
    icon: FaMotorcycle,
    keywords: ['moto', 'motocicleta', 'soat', 'peaje moto'],
    color: 'orange',
    bgClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    textClass: 'text-orange-400'
  },
  {
    key: 'bicycle',
    label: 'Bicicleta',
    group: 'Transporte',
    icon: FaBicycle,
    keywords: ['bici', 'bicicleta', 'cicloruta', 'repuestos bici'],
    color: 'emerald',
    bgClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    textClass: 'text-emerald-400'
  },
  {
    key: 'parking',
    label: 'Parqueadero',
    group: 'Transporte',
    icon: FaSquareParking,
    keywords: ['parqueadero', 'estacionamiento', 'valet', 'parking'],
    color: 'blue',
    bgClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    textClass: 'text-blue-400'
  },
  {
    key: 'wrench',
    label: 'Taller / Mantenimiento',
    group: 'Transporte',
    icon: FaWrench,
    keywords: ['taller', 'mantenimiento', 'mecanico', 'repuestos', 'lavado', 'revision', 'tecnomecanica'],
    color: 'slate',
    bgClass: 'bg-slate-800 text-slate-300 border-slate-700',
    textClass: 'text-slate-300'
  },

  // --- VIVIENDA Y SERVICIOS ---
  {
    key: 'house',
    label: 'Casa / Vivienda',
    group: 'Vivienda',
    icon: FaHouse,
    keywords: ['casa', 'hogar', 'vivienda', 'arriendo', 'alquiler', 'hipoteca', 'cuota casa', 'residencia'],
    color: 'indigo',
    bgClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    textClass: 'text-indigo-400'
  },
  {
    key: 'building',
    label: 'Apartamento / Edificio',
    group: 'Vivienda',
    icon: FaBuilding,
    keywords: ['apto', 'apartamento', 'administracion', 'edificio', 'condominio', 'conjunto'],
    color: 'cyan',
    bgClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    textClass: 'text-cyan-400'
  },
  {
    key: 'bolt',
    label: 'Electricidad / Luz',
    group: 'Vivienda',
    icon: FaBolt,
    keywords: ['luz', 'electricidad', 'energia', 'enel', 'epm', 'servicio publico'],
    color: 'yellow',
    bgClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    textClass: 'text-yellow-400'
  },
  {
    key: 'droplet',
    label: 'Agua / Alcantarillado',
    group: 'Vivienda',
    icon: FaDroplet,
    keywords: ['agua', 'acueducto', 'alcantarillado'],
    color: 'sky',
    bgClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    textClass: 'text-sky-400'
  },
  {
    key: 'fire',
    label: 'Gas Natural',
    group: 'Vivienda',
    icon: FaFire,
    keywords: ['gas', 'gas natural', 'gasodomesticos'],
    color: 'orange',
    bgClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    textClass: 'text-orange-400'
  },
  {
    key: 'wifi',
    label: 'Internet / WiFi',
    group: 'Vivienda',
    icon: FaWifi,
    keywords: ['internet', 'wifi', 'claro', 'tigo', 'movistar', 'fibra', 'red'],
    color: 'teal',
    bgClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    textClass: 'text-teal-400'
  },
  {
    key: 'tv',
    label: 'Televisión / Streaming',
    group: 'Vivienda',
    icon: FaTv,
    keywords: ['tv', 'television', 'cable', 'directv', 'pantalla', 'netflix', 'disney'],
    color: 'red',
    bgClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    textClass: 'text-red-400'
  },
  {
    key: 'couch',
    label: 'Muebles / Hogar',
    group: 'Vivienda',
    icon: FaCouch,
    keywords: ['muebles', 'decoracion', 'sala', 'cama', 'ikea', 'homecenter'],
    color: 'amber',
    bgClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    textClass: 'text-amber-400'
  },
  {
    key: 'broom',
    label: 'Aseo / Limpieza',
    group: 'Vivienda',
    icon: FaBroom,
    keywords: ['aseo', 'limpieza', 'detergente', 'empleada', 'servicio domestico'],
    color: 'teal',
    bgClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    textClass: 'text-teal-400'
  },
  {
    key: 'key',
    label: 'Alquiler / Llaves',
    group: 'Vivienda',
    icon: FaKey,
    keywords: ['arriendo', 'inquilino', 'llaves', 'deposito', 'alquiler'],
    color: 'yellow',
    bgClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    textClass: 'text-yellow-400'
  },

  // --- FINANZAS, DINERO E INGRESOS ---
  {
    key: 'money-bill-wave',
    label: 'Efectivo / Dinero',
    group: 'Finanzas',
    icon: FaMoneyBillWave,
    keywords: ['efectivo', 'dinero', 'plata', 'cash', 'retiro', 'cajero', 'moneda'],
    color: 'emerald',
    bgClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    textClass: 'text-emerald-400'
  },
  {
    key: 'wallet',
    label: 'Salario / Billetera',
    group: 'Finanzas',
    icon: FaWallet,
    keywords: ['salario', 'sueldo', 'nomina', 'quincena', 'pago', 'honorarios', 'billetera'],
    color: 'emerald',
    bgClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    textClass: 'text-emerald-400'
  },
  {
    key: 'coins',
    label: 'Monedas / Pagos',
    group: 'Finanzas',
    icon: FaCoins,
    keywords: ['monedas', 'cambio', 'propinas', 'ingresos varios'],
    color: 'yellow',
    bgClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    textClass: 'text-yellow-400'
  },
  {
    key: 'credit-card',
    label: 'Tarjeta de Crédito',
    group: 'Finanzas',
    icon: FaCreditCard,
    keywords: ['tarjeta', 'credito', 'debito', 'visa', 'mastercard', 'amex', 'cuotas'],
    color: 'purple',
    bgClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    textClass: 'text-purple-400'
  },
  {
    key: 'building-columns',
    label: 'Banco / Transferencia',
    group: 'Finanzas',
    icon: FaBuildingColumns,
    keywords: ['banco', 'transferencia', 'bancolombia', 'davivienda', 'bbva', 'nequi', 'daviplata'],
    color: 'blue',
    bgClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    textClass: 'text-blue-400'
  },
  {
    key: 'piggy-bank',
    label: 'Ahorro / Alcancía',
    group: 'Finanzas',
    icon: FaPiggyBank,
    keywords: ['ahorro', 'alcancia', 'fondo', 'reserva', 'guardadito', 'ahorros'],
    color: 'pink',
    bgClass: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    textClass: 'text-pink-400'
  },
  {
    key: 'arrow-trend-up',
    label: 'Inversiones / Rendimientos',
    group: 'Finanzas',
    icon: FaArrowTrendUp,
    keywords: ['inversion', 'inversiones', 'rendimientos', 'acciones', 'bolsa', 'fiducia', 'cdts', 'dividendos', 'crypto', 'bitcoin'],
    color: 'emerald',
    bgClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    textClass: 'text-emerald-400'
  },
  {
    key: 'receipt',
    label: 'Facturas / Recibos',
    group: 'Finanzas',
    icon: FaReceipt,
    keywords: ['factura', 'recibo', 'cuenta', 'comprobante'],
    color: 'slate',
    bgClass: 'bg-slate-800 text-slate-300 border-slate-700',
    textClass: 'text-slate-300'
  },
  {
    key: 'percent',
    label: 'Impuestos / DIAN',
    group: 'Finanzas',
    icon: FaPercent,
    keywords: ['impuestos', 'dian', 'retencion', 'iva', 'predial', 'renta', 'gravamen'],
    color: 'rose',
    bgClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    textClass: 'text-rose-400'
  },
  {
    key: 'hand-holding-dollar',
    label: 'Préstamos / Deudas',
    group: 'Finanzas',
    icon: FaHandHoldingDollar,
    keywords: ['prestamo', 'deuda', 'intereses', 'hipoteca', 'credito personal', 'cuota'],
    color: 'amber',
    bgClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    textClass: 'text-amber-400'
  },
  {
    key: 'briefcase',
    label: 'Trabajo / Empleo',
    group: 'Finanzas',
    icon: FaBriefcase,
    keywords: ['trabajo', 'empleo', 'empresa', 'oficina', 'cliente', 'consultoria'],
    color: 'blue',
    bgClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    textClass: 'text-blue-400'
  },
  {
    key: 'shop',
    label: 'Ventas / Negocio',
    group: 'Finanzas',
    icon: FaShop,
    keywords: ['ventas', 'negocio', 'comercio', 'local', 'facturacion', 'tienda propia'],
    color: 'teal',
    bgClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    textClass: 'text-teal-400'
  },

  // --- SALUD Y BIENESTAR ---
  {
    key: 'heart-pulse',
    label: 'Salud / Médico',
    group: 'Salud',
    icon: FaHeartPulse,
    keywords: ['salud', 'medico', 'consulta', 'eps', 'medicina prepagada', 'bienestar', 'clinica'],
    color: 'rose',
    bgClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    textClass: 'text-rose-400'
  },
  {
    key: 'pills',
    label: 'Farmacia / Medicamentos',
    group: 'Salud',
    icon: FaPills,
    keywords: ['farmacia', 'drogueria', 'medicamentos', 'pastillas', 'receta', 'remedios'],
    color: 'cyan',
    bgClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    textClass: 'text-cyan-400'
  },
  {
    key: 'hospital',
    label: 'Hospital / Urgencias',
    group: 'Salud',
    icon: FaHospital,
    keywords: ['hospital', 'urgencias', 'cirugia', 'laboratorio', 'examenes'],
    color: 'red',
    bgClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    textClass: 'text-red-400'
  },
  {
    key: 'tooth',
    label: 'Odontología / Dental',
    group: 'Salud',
    icon: FaTooth,
    keywords: ['odontologia', 'dentista', 'dientes', 'ortodoncia', 'limpieza dental'],
    color: 'sky',
    bgClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    textClass: 'text-sky-400'
  },
  {
    key: 'glasses',
    label: 'Óptica / Lentes',
    group: 'Salud',
    icon: FaGlasses,
    keywords: ['optica', 'gafas', 'lentes', 'oftalmologia', 'ojos'],
    color: 'indigo',
    bgClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    textClass: 'text-indigo-400'
  },
  {
    key: 'dumbbell',
    label: 'Gimnasio / Fitness',
    group: 'Salud',
    icon: FaDumbbell,
    keywords: ['gimnasio', 'gym', 'smartfit', 'fitness', 'entrenamiento', 'pesas', 'suplementos'],
    color: 'orange',
    bgClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    textClass: 'text-orange-400'
  },
  {
    key: 'person-running',
    label: 'Deporte / Ejercicio',
    group: 'Salud',
    icon: FaPersonRunning,
    keywords: ['deporte', 'ejercicio', 'running', 'futbol', 'ciclismo', 'tenis', 'natacion'],
    color: 'amber',
    bgClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    textClass: 'text-amber-400'
  },
  {
    key: 'spa',
    label: 'Spa / Cuidado Personal',
    group: 'Salud',
    icon: FaSpa,
    keywords: ['spa', 'masaje', 'cuidado personal', 'skincare', 'estetica', 'relax'],
    color: 'purple',
    bgClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    textClass: 'text-purple-400'
  },
  {
    key: 'scissors',
    label: 'Peluquería / Barbería',
    group: 'Salud',
    icon: FaScissors,
    keywords: ['peluqueria', 'barberia', 'corte', 'cabello', 'unas', 'manicure'],
    color: 'pink',
    bgClass: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    textClass: 'text-pink-400'
  },

  // --- ENTRETENIMIENTO Y ESTILO DE VIDA ---
  {
    key: 'gamepad',
    label: 'Videojuegos / Gaming',
    group: 'Entretenimiento',
    icon: FaGamepad,
    keywords: ['videojuegos', 'gaming', 'playstation', 'xbox', 'nintendo', 'steam', 'juegos'],
    color: 'violet',
    bgClass: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    textClass: 'text-violet-400'
  },
  {
    key: 'film',
    label: 'Cine / Películas',
    group: 'Entretenimiento',
    icon: FaFilm,
    keywords: ['cine', 'peliculas', 'cinecolombia', 'cinemark', 'estreno'],
    color: 'red',
    bgClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    textClass: 'text-red-400'
  },
  {
    key: 'music',
    label: 'Música / Conciertos',
    group: 'Entretenimiento',
    icon: FaMusic,
    keywords: ['musica', 'spotify', 'apple music', 'concierto', 'festival', 'boletas'],
    color: 'emerald',
    bgClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    textClass: 'text-emerald-400'
  },
  {
    key: 'ticket',
    label: 'Eventos / Boletas',
    group: 'Entretenimiento',
    icon: FaTicket,
    keywords: ['eventos', 'boletas', 'entradas', 'teatro', 'show', 'tuboleta'],
    color: 'amber',
    bgClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    textClass: 'text-amber-400'
  },
  {
    key: 'gift',
    label: 'Regalos / Fechas Especiales',
    group: 'Entretenimiento',
    icon: FaGift,
    keywords: ['regalo', 'cumpleanos', 'navidad', 'aniversario', 'donacion', 'detalle'],
    color: 'pink',
    bgClass: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    textClass: 'text-pink-400'
  },
  {
    key: 'shirt',
    label: 'Ropa / Vestuario',
    group: 'Entretenimiento',
    icon: FaShirt,
    keywords: ['ropa', 'vestuario', 'moda', 'zapatos', 'calzado', 'zara', 'h&m'],
    color: 'purple',
    bgClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    textClass: 'text-purple-400'
  },
  {
    key: 'bag-shopping',
    label: 'Compras / Shopping',
    group: 'Entretenimiento',
    icon: FaBagShopping,
    keywords: ['compras', 'shopping', 'centro comercial', 'amazon', 'aliexpress', 'mercadolibre'],
    color: 'fuchsia',
    bgClass: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
    textClass: 'text-fuchsia-400'
  },
  {
    key: 'camera',
    label: 'Fotografía / Arte',
    group: 'Entretenimiento',
    icon: FaCamera,
    keywords: ['fotografia', 'foto', 'camara', 'arte', 'diseno'],
    color: 'cyan',
    bgClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    textClass: 'text-cyan-400'
  },

  // --- EDUCACIÓN Y TECNOLOGÍA ---
  {
    key: 'graduation-cap',
    label: 'Educación / Universidad',
    group: 'Educación',
    icon: FaGraduationCap,
    keywords: ['educacion', 'universidad', 'colegio', 'matricula', 'semestre', 'diplomado'],
    color: 'blue',
    bgClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    textClass: 'text-blue-400'
  },
  {
    key: 'book',
    label: 'Libros / Cursos',
    group: 'Educación',
    icon: FaBook,
    keywords: ['libros', 'cursos', 'platzi', 'udemy', 'capacitacion', 'lectura', 'estudio'],
    color: 'amber',
    bgClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    textClass: 'text-amber-400'
  },
  {
    key: 'laptop',
    label: 'Computador / Tecnología',
    group: 'Educación',
    icon: FaLaptop,
    keywords: ['computador', 'tecnologia', 'software', 'hardware', 'apple', 'laptop', 'programas'],
    color: 'cyan',
    bgClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    textClass: 'text-cyan-400'
  },
  {
    key: 'mobile-screen',
    label: 'Celular / Plan Móvil',
    group: 'Educación',
    icon: FaMobileScreen,
    keywords: ['celular', 'telefono', 'plan movil', 'recargas', 'smartphone', 'datos'],
    color: 'sky',
    bgClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    textClass: 'text-sky-400'
  },
  {
    key: 'pen-nib',
    label: 'Papelería / Útiles',
    group: 'Educación',
    icon: FaPenNib,
    keywords: ['papeleria', 'utiles', 'cuadernos', 'fotocopias', 'impresion'],
    color: 'teal',
    bgClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    textClass: 'text-teal-400'
  },

  // --- FAMILIA, MASCOTAS Y OTROS ---
  {
    key: 'paw',
    label: 'Mascotas / Veterinaria',
    group: 'Familia y Otros',
    icon: FaPaw,
    keywords: ['mascotas', 'perro', 'gato', 'veterinaria', 'cleo', 'pet', 'purina', 'concentrado'],
    color: 'amber',
    bgClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    textClass: 'text-amber-400'
  },
  {
    key: 'baby',
    label: 'Bebé / Hijos',
    group: 'Familia y Otros',
    icon: FaBaby,
    keywords: ['bebe', 'hijos', 'panales', 'guarderia', 'pediatra', 'juguetes'],
    color: 'pink',
    bgClass: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    textClass: 'text-pink-400'
  },
  {
    key: 'people-roof',
    label: 'Familia',
    group: 'Familia y Otros',
    icon: FaPeopleRoof,
    keywords: ['familia', 'padres', 'hermanos', 'apoyo familiar', 'casa familiar'],
    color: 'indigo',
    bgClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    textClass: 'text-indigo-400'
  },
  {
    key: 'heart',
    label: 'Donaciones / Pareja',
    group: 'Familia y Otros',
    icon: FaHeart,
    keywords: ['donacion', 'caridad', 'pareja', 'novios', 'amor'],
    color: 'rose',
    bgClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    textClass: 'text-rose-400'
  },
  {
    key: 'umbrella',
    label: 'Seguros / Pólizas',
    group: 'Familia y Otros',
    icon: FaUmbrella,
    keywords: ['seguro', 'seguros', 'poliza', 'sura', 'seguro de vida', 'seguro hogar'],
    color: 'sky',
    bgClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    textClass: 'text-sky-400'
  },
  {
    key: 'shield-halved',
    label: 'Seguridad',
    group: 'Familia y Otros',
    icon: FaShieldHalved,
    keywords: ['seguridad', 'vigilancia', 'alarma', 'proteccion'],
    color: 'blue',
    bgClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    textClass: 'text-blue-400'
  },
  {
    key: 'star',
    label: 'Destacado / Favorito',
    group: 'Familia y Otros',
    icon: FaStar,
    keywords: ['favorito', 'destacado', 'especial', 'importante'],
    color: 'yellow',
    bgClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    textClass: 'text-yellow-400'
  },
  {
    key: 'tag',
    label: 'Etiqueta General',
    group: 'Familia y Otros',
    icon: FaTag,
    keywords: ['etiqueta', 'otros', 'varios', 'miscelaneos', 'general'],
    color: 'slate',
    bgClass: 'bg-slate-800 text-slate-300 border-slate-700',
    textClass: 'text-slate-300'
  },
  {
    key: 'folder',
    label: 'Carpeta / General',
    group: 'Familia y Otros',
    icon: FaFolder,
    keywords: ['carpeta', 'categoria', 'archivo', 'modulo'],
    color: 'slate',
    bgClass: 'bg-slate-800 text-slate-300 border-slate-700',
    textClass: 'text-slate-300'
  },
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
 * Resuelve el icono definitivo con sus colores temáticos originales
 */
export function resolveCategoryIcon(category?: { name?: string; icon?: string | null; type?: 'income' | 'expense' } | null): CategoryIconItem {
  const defaultFallback: CategoryIconItem = {
    key: 'folder',
    label: 'General',
    group: 'General',
    icon: FaFolder,
    keywords: [],
    color: 'slate',
    bgClass: 'bg-slate-800 text-slate-300 border-slate-700',
    textClass: 'text-slate-300'
  }

  if (!category) {
    return defaultFallback
  }

  // Si tiene un icono explícito y válido
  if (category.icon && ICON_MAP.has(category.icon)) {
    return ICON_MAP.get(category.icon)!
  }

  // Auto-detectar
  const detectedKey = detectCategoryIcon(category.name || '', category.type)
  return ICON_MAP.get(detectedKey) || defaultFallback
}
