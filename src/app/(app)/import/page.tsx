'use client'

import { useState, useEffect } from 'react'
import { LocalDB, WorkspaceType } from '@/lib/db'
import { Category, Transaction, Workspace } from '@/types'
import { wsTypeMeta } from '@/lib/workspaceMeta'
import { toast } from 'react-hot-toast'
import { 
  FiUpload, 
  FiColumns, 
  FiGrid, 
  FiCheckCircle, 
  FiArrowRight, 
  FiArrowLeft,
  FiX,
  FiInfo,
  FiCheck,
  FiBriefcase,
  FiSearch,
  FiPlus,
  FiZap
} from 'react-icons/fi'

// Parser de CSV robusto con soporte para comillas, saltos de línea y eliminación de UTF-8 BOM
function parseCSV(text: string): string[][] {
  let cleanText = text
  // Remover BOM si está presente
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1)
  }

  const lines: string[][] = []
  let row: string[] = []
  let inQuotes = false
  let curVal = ''

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i]
    const nextChar = cleanText[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Comilla escapada
        curVal += '"'
        i++
      } else {
        // Alternar comillas
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(curVal.trim())
      curVal = ''
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++
      row.push(curVal.trim())
      if (row.some(val => val !== '')) {
        lines.push(row)
      }
      row = []
      curVal = ''
    } else {
      curVal += char
    }
  }
  if (curVal !== '' || row.length > 0) {
    row.push(curVal.trim())
    lines.push(row)
  }
  return lines
}

// Helper para calcular similitud de texto simple para autocompletar mapeos
function findBestCategoryMatch(csvCatName: string, arcaCats: Category[]): string {
  const cleanCSV = csvCatName.toLowerCase().trim()
  if (!cleanCSV) return ''
  
  // 1. Intento de match exacto
  const exact = arcaCats.find(c => c.name.toLowerCase() === cleanCSV)
  if (exact) return exact.id

  // 2. Intento de match por inclusión
  const partial = arcaCats.find(c => c.name.toLowerCase().includes(cleanCSV) || cleanCSV.includes(c.name.toLowerCase()))
  if (partial) return partial.id

  return ''
}

export default function ImportPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWsId, setActiveWsId] = useState<string>('')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1) // 1: Upload, 2: Columns, 3: Categories & Bolsillos, 4: Preview

  // CSV RAW Data
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])

  // Column Mappings
  const [colMapping, setColMapping] = useState<Record<string, number>>({
    date: -1,
    description: -1,
    amount: -1,
    category: -1,
    subcategory: -1,
    account: -1,
    type: -1
  })

  // Cuentas / Bolsillos de Money encontrados y su mapeo a Espacios de Trabajo (Workspaces)
  const [moneyAccounts, setMoneyAccounts] = useState<{ name: string; count: number }[]>([])
  const [accountWorkspaceMapping, setAccountWorkspaceMapping] = useState<Record<string, string>>({}) // Account Name -> Workspace ID (o '' para activo)

  // Categorías de Money encontradas y su mapeo a Arca
  const [csvCategories, setCsvCategories] = useState<{ name: string; count: number; dominantType: 'income' | 'expense' }[]>([])
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({}) // CSV Category Name -> Arca Category ID
  const [newCategoriesToCreate, setNewCategoriesToCreate] = useState<Record<string, { name: string; type: 'income' | 'expense' }>>({})
  const [catSearchTerm, setCatSearchTerm] = useState('')

  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [clearExisting, setClearExisting] = useState(false)

  // Modal para crear nuevo espacio de trabajo rápido desde el paso 3
  const [creatingWsForAccount, setCreatingWsForAccount] = useState<string | null>(null)
  const [newWsType, setNewWsType] = useState<WorkspaceType>('home')

  const loadInitialData = async () => {
    try {
      const [wsList, currentWsId] = await Promise.all([
        LocalDB.getWorkspaces(),
        Promise.resolve(LocalDB.getActiveWorkspaceId())
      ])
      setWorkspaces(wsList)
      setActiveWsId(currentWsId || (wsList[0]?.id ?? ''))

      const catList = await LocalDB.getCategories()
      setCategories(catList)
    } catch {
      toast.error('No se pudieron cargar los datos del espacio')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // Procesar archivo cargado
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      try {
        const parsed = parseCSV(text)
        if (parsed.length < 2) {
          toast.error('El CSV no contiene suficientes filas')
          return
        }

        const headers = parsed[0]
        const rows = parsed.slice(1)

        setCsvHeaders(headers)
        setCsvRows(rows)

        // Auto-detectar columnas comunes (incluyendo MoneyLover: ID, Note, Amount, Category, Account, Currency, Date...)
        const mapping: Record<string, number> = {
          date: -1,
          description: -1,
          amount: -1,
          category: -1,
          subcategory: -1,
          account: -1,
          type: -1
        }

        headers.forEach((h, idx) => {
          const lh = h.toLowerCase().trim()
          if (['fecha', 'date', 'day', 'time'].includes(lh)) mapping.date = idx
          if (['note', 'nota', 'descripcion', 'descripción', 'description', 'concept', 'concepto', 'detalles'].includes(lh)) mapping.description = idx
          if (['monto', 'amount', 'value', 'valor', 'monto total', 'cantidad'].includes(lh)) mapping.amount = idx
          if (['categoria', 'categoría', 'category'].includes(lh)) mapping.category = idx
          if (['subcategoria', 'subcategoría', 'subcategory'].includes(lh)) mapping.subcategory = idx
          if (['cuenta', 'account', 'wallet', 'billetera', 'origen', 'bolsillo'].includes(lh)) mapping.account = idx
          if (['tipo', 'type', 'movimiento'].includes(lh)) mapping.type = idx
        })

        setColMapping(mapping)
        setStep(2)
        toast.success(`CSV cargado con éxito (${rows.length} registros). Revisa las columnas.`)
      } catch (err) {
        console.error(err)
        toast.error('Error al procesar el archivo CSV')
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  // Avanzar a mapeo de categorías y bolsillos
  const handleProcessColumns = () => {
    // Validar columnas obligatorias
    if (colMapping.date === -1 || colMapping.amount === -1) {
      toast.error('Las columnas Fecha y Monto son obligatorias')
      return
    }

    // Extraer valores únicos de categorías y cuentas con sus conteos y tipos dominantes
    const catStats: Record<string, { count: number; incomeCount: number; expenseCount: number }> = {}
    const accountStats: Record<string, number> = {}

    csvRows.forEach(row => {
      const rawCat = colMapping.category !== -1 ? row[colMapping.category]?.trim() : ''
      const rawAcc = colMapping.account !== -1 ? row[colMapping.account]?.trim() : ''
      const rawAmt = colMapping.amount !== -1 ? row[colMapping.amount]?.trim() : ''
      const amtNum = parseFloat((rawAmt || '0').replace(/[^\d.-]/g, ''))

      if (rawCat) {
        if (!catStats[rawCat]) {
          catStats[rawCat] = { count: 0, incomeCount: 0, expenseCount: 0 }
        }
        catStats[rawCat].count++
        if (amtNum >= 0) catStats[rawCat].incomeCount++
        else catStats[rawCat].expenseCount++
      }

      if (rawAcc) {
        accountStats[rawAcc] = (accountStats[rawAcc] || 0) + 1
      }
    })

    const accountsList = Object.entries(accountStats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const categoriesList = Object.entries(catStats)
      .map(([name, stat]) => ({
        name,
        count: stat.count,
        dominantType: stat.incomeCount > stat.expenseCount ? ('income' as const) : ('expense' as const)
      }))
      .sort((a, b) => b.count - a.count)

    setMoneyAccounts(accountsList)
    setCsvCategories(categoriesList)

    // Inicializar mapeos sugeridos para Espacios de trabajo (Bolsillos -> Workspaces)
    const accWsMap: Record<string, string> = {}
    accountsList.forEach(acc => {
      // Buscar si existe algún workspace con nombre similar
      const matchingWs = workspaces.find(w => w.name.toLowerCase().includes(acc.name.toLowerCase()) || acc.name.toLowerCase().includes(w.name.toLowerCase()))
      accWsMap[acc.name] = matchingWs ? matchingWs.id : (activeWsId || '')
    })
    setAccountWorkspaceMapping(accWsMap)

    // Inicializar mapeos sugeridos para Categorías
    const catMap: Record<string, string> = {}
    categoriesList.forEach(c => {
      catMap[c.name] = findBestCategoryMatch(c.name, categories)
    })
    setCategoryMapping(catMap)

    setStep(3)
  }

  // Auto-mapear categorías y crear las restantes como nuevas
  const handleAutoMapAndCreateRemaining = () => {
    const updatedCatMapping = { ...categoryMapping }
    const updatedNewCats = { ...newCategoriesToCreate }
    let mappedCount = 0
    let newCount = 0

    csvCategories.forEach(cat => {
      // Si ya tiene un mapeo existente o una creación manual configurada, respetarla
      if (updatedCatMapping[cat.name] || updatedNewCats[cat.name]) return

      // Intentar buscar match
      const matchedId = findBestCategoryMatch(cat.name, categories)
      if (matchedId) {
        updatedCatMapping[cat.name] = matchedId
        mappedCount++
      } else {
        // Configurar para crear automáticamente según el tipo dominante del CSV
        updatedNewCats[cat.name] = {
          name: cat.name,
          type: cat.dominantType
        }
        newCount++
      }
    })

    setCategoryMapping(updatedCatMapping)
    setNewCategoriesToCreate(updatedNewCats)
    toast.success(`Auto-mapeadas ${mappedCount} existentes y ${newCount} preparadas para crear`)
  }

  // Crear un nuevo espacio de trabajo directamente desde el paso de bolsillos
  const handleCreateWorkspaceForPocket = async (accountName: string) => {
    try {
      const created = await LocalDB.addWorkspace(accountName, newWsType)
      setWorkspaces(prev => [...prev, created])
      setAccountWorkspaceMapping(prev => ({
        ...prev,
        [accountName]: created.id
      }))
      setCreatingWsForAccount(null)
      toast.success(`Espacio "${created.name}" creado con éxito`)
    } catch {
      toast.error('Error al crear el espacio de trabajo')
    }
  }

  const handleCreateNewCategory = (csvName: string, type: 'income' | 'expense') => {
    setNewCategoriesToCreate(prev => ({
      ...prev,
      [csvName]: { name: csvName, type }
    }))
    setCategoryMapping(prev => ({
      ...prev,
      [csvName]: ''
    }))
  }

  const handleMapToExisting = (csvName: string, arcaId: string) => {
    setCategoryMapping(prev => ({
      ...prev,
      [csvName]: arcaId
    }))
    setNewCategoriesToCreate(prev => {
      const copy = { ...prev }
      delete copy[csvName]
      return copy
    })
  }

  // Guardar transacciones e importar
  const handleExecuteImport = async () => {
    setImporting(true)
    setImportProgress(5)

    try {
      const user = await LocalDB.getCurrentUser()
      if (!user) {
        toast.error('Error de autenticación. Por favor inicia sesión.')
        setImporting(false)
        return
      }

      // 1. Identificar todos los espacios de trabajo destino afectados
      const targetWorkspaceIds = new Set<string>()
      csvRows.forEach(row => {
        const rawAcc = colMapping.account !== -1 ? row[colMapping.account]?.trim() : ''
        const targetWs = (rawAcc && accountWorkspaceMapping[rawAcc]) ? accountWorkspaceMapping[rawAcc] : activeWsId
        if (targetWs) targetWorkspaceIds.add(targetWs)
      })

      if (targetWorkspaceIds.size === 0 && activeWsId) {
        targetWorkspaceIds.add(activeWsId)
      }

      // Si se solicita limpiar, borrar movimientos previos en los espacios afectados
      if (clearExisting) {
        for (const wsId of Array.from(targetWorkspaceIds)) {
          await LocalDB.clearWorkspaceTransactions(wsId)
        }
      }

      setImportProgress(15)

      // 2. Crear las nuevas categorías solicitadas en los espacios destino
      const createdCatsMap: Record<string, string> = {} // lowerCase(name) -> category_id
      const newCatsList = Object.entries(newCategoriesToCreate)

      if (newCatsList.length > 0) {
        // Insertar las categorías en los espacios destino
        for (const wsId of Array.from(targetWorkspaceIds)) {
          const added = await LocalDB.bulkAddCategories(
            newCatsList.map(([name, val]) => ({
              name,
              type: val.type,
              workspace_id: wsId
            }))
          )
          added.forEach(c => {
            createdCatsMap[`${wsId}_${c.name.toLowerCase()}`] = c.id
            createdCatsMap[c.name.toLowerCase()] = c.id
          })
        }
      }

      setImportProgress(30)

      // 3. Mapear transacciones
      const transactionsToInsert: Omit<Transaction, 'id' | 'created_at'>[] = []

      csvRows.forEach((row) => {
        const rawDate = colMapping.date !== -1 ? row[colMapping.date]?.trim() : ''
        const rawNote = colMapping.description !== -1 ? row[colMapping.description]?.trim() : ''
        const rawCat = colMapping.category !== -1 ? row[colMapping.category]?.trim() : ''
        const rawAcc = colMapping.account !== -1 ? row[colMapping.account]?.trim() : ''
        const rawAmount = colMapping.amount !== -1 ? row[colMapping.amount]?.trim() : ''
        const rawType = colMapping.type !== -1 ? row[colMapping.type]?.trim() : ''

        if (!rawDate || !rawAmount) return

        // Si la nota está vacía (común en MoneyLover), usar el nombre de la categoría o un concepto claro
        const finalDesc = rawNote || rawCat || 'Movimiento importado'

        // Formatear fecha a YYYY-MM-DD
        let formattedDate = rawDate
        try {
          if (rawDate.includes('/') || rawDate.includes('-')) {
            const separator = rawDate.includes('/') ? '/' : '-'
            const parts = rawDate.split(' ')[0].split(separator) // Quitar horas si existen
            if (parts.length === 3) {
              if (parts[2].length === 4) {
                // DD/MM/YYYY -> YYYY-MM-DD
                formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
              } else if (parts[0].length === 4) {
                // YYYY/MM/DD -> YYYY-MM-DD
                formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
              }
            }
          }
        } catch {}

        // Limpiar monto
        const cleanAmount = parseFloat(rawAmount.replace(/[^\d.-]/g, ''))
        if (isNaN(cleanAmount)) return

        // Determinar tipo (ingreso o gasto)
        let type: 'income' | 'expense' = cleanAmount >= 0 ? 'income' : 'expense'
        if (rawType) {
          const lt = rawType.toLowerCase()
          if (['ingreso', 'income', 'depósito', 'in', '+', 'true'].includes(lt)) type = 'income'
          else if (['gasto', 'expense', 'out', '-', 'false'].includes(lt)) type = 'expense'
        }

        // Espacio destino según el bolsillo mapeado
        const targetWsId = (rawAcc && accountWorkspaceMapping[rawAcc]) 
          ? accountWorkspaceMapping[rawAcc] 
          : (activeWsId || workspaces[0]?.id || '')

        // Obtener ID de la categoría mapeada
        let matchedCatId = ''
        if (rawCat) {
          const mappedId = categoryMapping[rawCat]
          if (mappedId) {
            matchedCatId = mappedId
          } else {
            // Revisar si fue una de las recién creadas
            matchedCatId = createdCatsMap[`${targetWsId}_${rawCat.toLowerCase()}`] || createdCatsMap[rawCat.toLowerCase()] || ''
          }
        }

        // Si aún no tenemos categoría, usar una por defecto disponible
        if (!matchedCatId) {
          const defaultCat = categories.find(c => c.type === type)
          matchedCatId = defaultCat ? defaultCat.id : ''
        }

        // Construir detalle si viene con cuenta/bolsillo original
        const details = rawAcc 
          ? [{ description: `Bolsillo: ${rawAcc}`, amount: Math.abs(cleanAmount) }] 
          : null

        transactionsToInsert.push({
          description: finalDesc,
          amount: Math.abs(cleanAmount),
          type,
          category_id: matchedCatId,
          workspace_id: targetWsId,
          user_id: user.id,
          date: formattedDate,
          details
        })
      })

      setImportProgress(40)

      // 4. Inserción masiva de transacciones con actualización de progreso en tiempo real
      await LocalDB.bulkAddTransactions(transactionsToInsert, (pct) => {
        setImportProgress(40 + Math.round((pct * 0.6)))
      })

      setImportProgress(100)
      toast.success(`¡Importación completada! Se registraron ${transactionsToInsert.length} movimientos.`)
      setStep(1)
      setCsvHeaders([])
      setCsvRows([])
    } catch (err) {
      console.error(err)
      toast.error('Error al realizar la importación masiva')
    } finally {
      setImporting(false)
    }
  }

  // Filtrado de categorías en paso 3
  const filteredCsvCategories = csvCategories.filter(c => 
    c.name.toLowerCase().includes(catSearchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <svg className="animate-spin h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-8 max-w-4xl mx-auto">
      {/* Cabecera */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
          <img src="/icons/invoice.png" alt="" className="w-7 h-7 object-contain" />
          Migrar e Importar Datos
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Carga un archivo CSV exportado desde MoneyLover u otras aplicaciones para cargarlo a tus espacios de trabajo.
        </p>
      </div>

      {/* Indicador de pasos */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-4 flex items-center justify-between shadow-sm">
        {[
          { num: 1, label: 'Subir CSV', icon: FiUpload },
          { num: 2, label: 'Mapear Columnas', icon: FiColumns },
          { num: 3, label: 'Bolsillos y Categorías', icon: FiGrid },
          { num: 4, label: 'Confirmar e Importar', icon: FiCheckCircle },
        ].map((s) => {
          const Icon = s.icon
          const isActive = step === s.num
          const isDone = step > s.num
          return (
            <div key={s.num} className="flex items-center gap-2 flex-1 justify-center last:flex-initial">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isActive ? 'bg-emerald-500 text-slate-950 font-black' : 
                isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-950 text-slate-650'
              }`}>
                {isDone ? <FiCheck className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              </span>
              <span className={`text-[10px] font-semibold hidden md:inline ${
                isActive ? 'text-slate-200' : isDone ? 'text-emerald-400' : 'text-slate-600'
              }`}>{s.label}</span>
              {s.num < 4 && <FiArrowRight className="w-3 h-3 text-slate-800 hidden md:block ml-auto mr-auto" />}
            </div>
          )
        })}
      </div>

      {/* PASO 1: SUBIR ARCHIVO */}
      {step === 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-md p-6 shadow-md text-center space-y-6">
          <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500/40 rounded-lg p-10 transition-colors flex flex-col items-center justify-center relative cursor-pointer group">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
            />
            <FiUpload className="w-10 h-10 text-slate-500 group-hover:text-emerald-450 transition-colors mb-3" />
            <p className="text-xs font-bold text-slate-300">Haz clic o arrastra tu archivo CSV aquí</p>
            <p className="text-[10px] text-slate-600 mt-1">Archivos .csv delimitados por comas (MoneyLover, bancos, Excel)</p>
          </div>

          <div className="bg-slate-950 border border-slate-850 rounded-md p-4 text-left space-y-2">
            <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
              <FiInfo className="w-3.5 h-3.5" /> Soporte Especial para Migración MoneyLover
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              El importador reconoce de forma automática los <strong>Bolsillos/Cuentas</strong> (ej. <em>Cash, Ahorro, Apto, Inversión Virtual</em>) 
              y te permitirá asignarlos a tus <strong>Espacios de Trabajo</strong> correspondientes. Las <strong>Categorías</strong> se asociarán 
              de forma separada a las categorías de ArcaFinanzas.
            </p>
          </div>
        </div>
      )}

      {/* PASO 2: MAPEAR COLUMNAS */}
      {step === 2 && (
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md space-y-5">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Asociar Columnas del CSV</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Verifica que las columnas de tu archivo CSV coincidan con los campos esperados.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'date', label: 'Fecha (Obligatorio)', hint: 'Fecha de la transacción (ej. Date)' },
              { key: 'amount', label: 'Monto (Obligatorio)', hint: 'Valor neto positivo o negativo (ej. Amount)' },
              { key: 'description', label: 'Nota / Descripción (Opcional)', hint: 'Concepto o nota (ej. Note o Concepto)' },
              { key: 'category', label: 'Categoría (Opcional)', hint: 'Categoría del movimiento (ej. Category)' },
              { key: 'account', label: 'Bolsillo / Cuenta (Opcional)', hint: 'Bolsillo o cuenta de origen (ej. Account)' },
              { key: 'subcategory', label: 'Subcategoría (Opcional)', hint: 'Subcategoría secundaria si existe' },
              { key: 'type', label: 'Tipo de Movimiento (Opcional)', hint: 'Ingreso o Gasto explícito' },
            ].map((col) => (
              <div key={col.key} className="bg-slate-950 border border-slate-850 rounded-md p-3.5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">{col.label}</span>
                  <span className="text-[9px] text-slate-600 block mt-0.5">{col.hint}</span>
                </div>
                <select
                  value={colMapping[col.key]}
                  onChange={(e) => setColMapping(prev => ({ ...prev, [col.key]: parseInt(e.target.value) }))}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-md py-1.5 px-2.5 text-xs focus:border-emerald-500 outline-none mt-3 cursor-pointer"
                >
                  <option value="-1">-- No mapear este campo --</option>
                  {csvHeaders.map((h, i) => (
                    <option key={i} value={i}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Preview de Datos */}
          <div className="border-t border-slate-800 pt-4">
            <span className="text-xs font-semibold text-slate-400 block mb-2">Vista previa de tu archivo (Primeras 5 filas)</span>
            <div className="overflow-x-auto border border-slate-850 rounded-md">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-850">
                  <tr>
                    {csvHeaders.map((h, i) => (
                      <th key={i} className="py-2 px-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/50">
                  {csvRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                      {row.map((cell, cidx) => (
                        <td key={cidx} className="py-2 px-3 text-slate-400 truncate max-w-[120px]">{cell || <span className="italic text-slate-600">vacío</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button 
              onClick={() => setStep(1)} 
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-md text-xs font-semibold cursor-pointer"
            >
              <FiArrowLeft className="w-3.5 h-3.5" /> Atrás
            </button>
            <button 
              onClick={handleProcessColumns} 
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold cursor-pointer"
            >
              Continuar <FiArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: MAPEAR BOLSILLOS Y CATEGORÍAS */}
      {step === 3 && (
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md space-y-7">
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Mapeo de Bolsillos y Categorías</h2>
            <p className="text-slate-400 text-xs leading-relaxed mt-0.5">
              Configura a qué Espacio de Trabajo se enviarán los bolsillos y cómo se mapearán las categorías del CSV.
            </p>
          </div>

          {/* SECCIÓN 1: MAPEO DE BOLSILLOS / CUENTAS A ESPACIOS DE TRABAJO */}
          {moneyAccounts.length > 0 && (
            <div className="space-y-3 bg-slate-950/60 border border-slate-850 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div>
                  <h3 className="text-xs font-bold text-emerald-450 uppercase tracking-wide flex items-center gap-2">
                    <FiBriefcase className="w-3.5 h-3.5 text-emerald-400" />
                    Bolsillos / Cuentas de Origen ({moneyAccounts.length})
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Asigna cada bolsillo del CSV a un <strong>Espacio de Trabajo</strong> de ArcaFinanzas.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {moneyAccounts.map((acc) => {
                  const targetWsId = accountWorkspaceMapping[acc.name] || activeWsId
                  const targetWs = workspaces.find(w => w.id === targetWsId)

                  return (
                    <div key={acc.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-md p-3">
                      <div>
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                          {acc.name}
                          <span className="text-[9px] bg-slate-800 text-slate-400 font-semibold px-2 py-0.5 rounded-full">
                            {acc.count} movs
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Destino: {targetWs ? targetWs.name : 'Espacio activo actual'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          value={targetWsId}
                          onChange={(e) => setAccountWorkspaceMapping(prev => ({ ...prev, [acc.name]: e.target.value }))}
                          className="bg-slate-950 border border-slate-800 text-slate-200 rounded-md py-1.5 px-2.5 text-xs focus:border-emerald-500 outline-none w-full sm:w-56 cursor-pointer"
                        >
                          {workspaces.map(ws => {
                            const meta = wsTypeMeta(ws.type)
                            return (
                              <option key={ws.id} value={ws.id}>
                                {ws.name} ({meta.label})
                              </option>
                            )
                          })}
                        </select>

                        {/* Botón para crear espacio nuevo con el nombre del bolsillo */}
                        {!workspaces.some(w => w.name.toLowerCase() === acc.name.toLowerCase()) && (
                          <button
                            type="button"
                            onClick={() => setCreatingWsForAccount(acc.name)}
                            title={`Crear nuevo espacio "${acc.name}"`}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold border border-slate-700 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <FiPlus className="w-3 h-3 text-emerald-400" /> Crear Espacio
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Mini Modal para crear espacio rápido */}
              {creatingWsForAccount && (
                <div className="bg-slate-900 border border-emerald-500/40 rounded-md p-3.5 animate-fadeIn space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-200">
                      Crear nuevo espacio para &quot;{creatingWsForAccount}&quot;
                    </h4>
                    <button 
                      onClick={() => setCreatingWsForAccount(null)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <select
                      value={newWsType}
                      onChange={(e) => setNewWsType(e.target.value as WorkspaceType)}
                      className="bg-slate-950 border border-slate-800 text-slate-200 rounded-md py-1.5 px-2.5 text-xs focus:border-emerald-500 outline-none w-full sm:w-auto cursor-pointer"
                    >
                      <option value="home">Tipo: Hogar (Familiar)</option>
                      <option value="business">Tipo: Negocio</option>
                      <option value="personal">Tipo: Personal</option>
                      <option value="other">Tipo: Otro</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleCreateWorkspaceForPocket(creatingWsForAccount)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold w-full sm:w-auto cursor-pointer"
                    >
                      Confirmar y Asignar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECCIÓN 2: MAPEO DE CATEGORÍAS */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-emerald-450 uppercase tracking-wide flex items-center gap-2">
                  <FiGrid className="w-3.5 h-3.5 text-emerald-400" />
                  Categorías del CSV ({csvCategories.length})
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Asocia las categorías de tu archivo con las de Arca o créalas directamente.
                </p>
              </div>

              {/* Botón Mapeo Masivo Automático */}
              <button
                type="button"
                onClick={handleAutoMapAndCreateRemaining}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-sm active:scale-[0.99]"
              >
                <FiZap className="w-3.5 h-3.5" />
                Auto-mapear & Crear Restantes
              </button>
            </div>

            {/* Buscador de categorías */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar categoría del archivo..."
                value={catSearchTerm}
                onChange={(e) => setCatSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-md py-1.5 pl-8 pr-3 text-xs focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredCsvCategories.map((csvCat) => {
                const isNew = !!newCategoriesToCreate[csvCat.name]
                const currentVal = categoryMapping[csvCat.name] || ''

                return (
                  <div key={csvCat.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 border border-slate-850 rounded-md p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200 truncate">{csvCat.name}</span>
                        <span className="text-[9px] bg-slate-900 text-slate-400 font-semibold px-2 py-0.5 rounded-full border border-slate-800">
                          {csvCat.count} movs
                        </span>
                      </div>
                      {isNew ? (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded-md border border-emerald-500/20 mt-1 inline-block">
                          Se creará como nueva ({newCategoriesToCreate[csvCat.name].type === 'expense' ? 'Gasto' : 'Ingreso'})
                        </span>
                      ) : currentVal ? (
                        <span className="text-[9px] text-slate-500 block mt-0.5">
                          Mapeada a: <span className="text-emerald-400 font-semibold">{categories.find(c => c.id === currentVal)?.name}</span>
                        </span>
                      ) : (
                        <span className="text-[9px] text-yellow-500/80 block mt-0.5">
                          Sin mapear (usa el selector o los botones de creación)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                      {!isNew && (
                        <select
                          value={currentVal}
                          onChange={(e) => handleMapToExisting(csvCat.name, e.target.value)}
                          className="bg-slate-900 border border-slate-800 text-slate-200 rounded-md py-1.5 px-2.5 text-xs focus:border-emerald-500 outline-none w-full sm:w-56 cursor-pointer"
                        >
                          <option value="">-- Mapear a existente --</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.type === 'expense' ? 'Gasto' : 'Ingreso'})
                            </option>
                          ))}
                        </select>
                      )}

                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCreateNewCategory(csvCat.name, 'expense')}
                          className={`px-2 py-1.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                            isNew && newCategoriesToCreate[csvCat.name].type === 'expense'
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' 
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          + Gasto
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreateNewCategory(csvCat.name, 'income')}
                          className={`px-2 py-1.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                            isNew && newCategoriesToCreate[csvCat.name].type === 'income'
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          + Ingreso
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button 
              onClick={() => setStep(2)} 
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-md text-xs font-semibold cursor-pointer"
            >
              <FiArrowLeft className="w-3.5 h-3.5" /> Atrás
            </button>
            <button 
              onClick={() => setStep(4)} 
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold cursor-pointer"
            >
              Revisar y Confirmar <FiArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 4: PREVIEW & IMPORT */}
      {step === 4 && (
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md space-y-6">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Confirmar Importación</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-950 border border-slate-850 rounded-md p-4 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Transacciones</span>
              <span className="text-xl font-black text-slate-200 mt-1 block">{csvRows.length}</span>
            </div>
            <div className="bg-slate-950 border border-slate-850 rounded-md p-4 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Nuevas Categorías</span>
              <span className="text-xl font-black text-emerald-400 mt-1 block">
                {Object.keys(newCategoriesToCreate).length}
              </span>
            </div>
            <div className="bg-slate-950 border border-slate-850 rounded-md p-4 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Bolsillos Mapeados</span>
              <span className="text-xl font-black text-indigo-400 mt-1 block">{moneyAccounts.length}</span>
            </div>
            <div className="bg-slate-950 border border-slate-850 rounded-md p-4 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Espacios Destino</span>
              <span className="text-xl font-black text-emerald-400 mt-1 block">
                {new Set(Object.values(accountWorkspaceMapping).filter(Boolean)).size || 1}
              </span>
            </div>
          </div>

          {/* Desglose de distribución por espacio */}
          {moneyAccounts.length > 0 && (
            <div className="bg-slate-950 border border-slate-850 rounded-md p-4 space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Distribución por Espacio de Trabajo:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {moneyAccounts.map(acc => {
                  const wsId = accountWorkspaceMapping[acc.name] || activeWsId
                  const ws = workspaces.find(w => w.id === wsId)
                  return (
                    <div key={acc.name} className="flex justify-between items-center bg-slate-900 border border-slate-800/80 rounded px-2.5 py-1.5">
                      <span className="text-slate-300 font-semibold">{acc.name} ({acc.count} movs)</span>
                      <span className="text-emerald-400 font-bold">→ {ws?.name || 'Espacio actual'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {importing ? (
            <div className="space-y-3 py-4 border-t border-slate-800">
              <div className="flex justify-between items-center text-xs font-bold text-slate-350">
                <span>Guardando transacciones en Supabase...</span>
                <span>{importProgress}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3.5 border border-slate-850 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${importProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Opción de borrar transacciones previas */}
              <div className="bg-slate-950 border border-slate-850 rounded-md p-4 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Iniciar desde cero en los espacios seleccionados</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Elimina los movimientos previos en los espacios de trabajo destino antes de importar el CSV.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={clearExisting}
                  onChange={(e) => setClearExisting(e.target.checked)}
                  className="w-4.5 h-4.5 rounded border-slate-800 text-emerald-500 bg-slate-900 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-950 border border-slate-850 rounded-md p-4 space-y-2">
                <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-wide flex items-center gap-1.5">
                  <FiInfo className="w-3.5 h-3.5" /> Confirmación
                </h3>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {clearExisting ? (
                    <strong className="text-rose-400">Atención: Se eliminarán de forma permanente todas las transacciones de los espacios de trabajo destino antes de importar las del CSV.</strong>
                  ) : (
                    <span>Este proceso agregará las transacciones del CSV a tus espacios sin borrar los datos existentes.</span>
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button 
              disabled={importing}
              onClick={() => setStep(3)} 
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-md text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              <FiArrowLeft className="w-3.5 h-3.5" /> Atrás
            </button>
            <button 
              disabled={importing}
              onClick={handleExecuteImport} 
              className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-black rounded-md text-xs shadow-md active:scale-[0.99] disabled:opacity-40 cursor-pointer"
            >
              {importing ? 'Importando...' : 'Iniciar Importación'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
