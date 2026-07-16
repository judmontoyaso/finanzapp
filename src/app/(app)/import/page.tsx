'use client'

import { useState, useEffect } from 'react'
import { LocalDB } from '@/lib/db'
import { Category, Transaction } from '@/types'
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
  FiCheck
} from 'react-icons/fi'

// Simple CSV parser that handles commas inside quotes
function parseCSV(text: string): string[][] {
  const lines: string[][] = []
  let row: string[] = []
  let inQuotes = false
  let curVal = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        curVal += '"'
        i++
      } else {
        // Toggle quote state
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
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1) // 1: Upload, 2: Columns, 3: Categories, 4: Preview

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

  // Cuentas de Money encontradas y su mapeo a categoría en Arca
  const [moneyAccounts, setMoneyAccounts] = useState<string[]>([])
  const [accountCategoryMapping, setAccountCategoryMapping] = useState<Record<string, string>>({})

  // Categorías de Money encontradas y su mapeo a Arca
  const [csvCategories, setCsvCategories] = useState<string[]>([])
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({}) // CSV Category Name -> Arca Category ID
  const [newCategoriesToCreate, setNewCategoriesToCreate] = useState<Record<string, { name: string; type: 'income' | 'expense' }>>({})

  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [clearExisting, setClearExisting] = useState(false)

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const list = await LocalDB.getCategories()
        setCategories(list)
      } catch {
        toast.error('No se pudieron cargar las categorías del espacio')
      } finally {
        setLoading(false)
      }
    }
    fetchCats()
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

        // Intentar auto-detectar columnas comunes
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
          if (['descripcion', 'descripción', 'description', 'concept', 'concepto', 'note', 'nota'].includes(lh)) mapping.description = idx
          if (['monto', 'amount', 'value', 'valor', 'monto total', 'cantidad'].includes(lh)) mapping.amount = idx
          if (['categoria', 'categoría', 'category'].includes(lh)) mapping.category = idx
          if (['subcategoria', 'subcategoría', 'subcategory'].includes(lh)) mapping.subcategory = idx
          if (['cuenta', 'account', 'wallet', 'billetera', 'origen'].includes(lh)) mapping.account = idx
          if (['tipo', 'type', 'movimiento'].includes(lh)) mapping.type = idx
        })

        setColMapping(mapping)
        setStep(2)
        toast.success('CSV leído con éxito. Mapea las columnas.')
      } catch (err) {
        toast.error('Error al procesar el archivo CSV')
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  // Avanzar a mapeo de categorías
  const handleProcessColumns = () => {
    // Validar columnas obligatorias
    if (colMapping.date === -1 || colMapping.description === -1 || colMapping.amount === -1) {
      toast.error('Las columnas Fecha, Descripción y Monto son obligatorias')
      return
    }

    // Extraer valores únicos de categorías de los datos del CSV
    const catsSet = new Set<string>()
    const accountsSet = new Set<string>()

    csvRows.forEach(row => {
      if (colMapping.category !== -1 && row[colMapping.category]) {
        catsSet.add(row[colMapping.category])
      }
      if (colMapping.account !== -1 && row[colMapping.account]) {
        accountsSet.add(row[colMapping.account])
      }
    })

    const uniqueCats = Array.from(catsSet)
    const uniqueAccounts = Array.from(accountsSet)

    setCsvCategories(uniqueCats)
    setMoneyAccounts(uniqueAccounts)

    // Inicializar mapeos sugeridos
    const catMap: Record<string, string> = {}
    uniqueCats.forEach(c => {
      catMap[c] = findBestCategoryMatch(c, categories)
    })
    setCategoryMapping(catMap)

    const accMap: Record<string, string> = {}
    uniqueAccounts.forEach(acc => {
      // Si la cuenta coincide con el nombre de alguna categoría existente
      accMap[acc] = findBestCategoryMatch(acc, categories)
    })
    setAccountCategoryMapping(accMap)

    setStep(3)
  }

  // Guardar transacciones e importar
  const handleExecuteImport = async () => {
    setImporting(true)
    setImportProgress(10)

    try {
      const activeWsId = LocalDB.getActiveWorkspaceId()
      const user = await LocalDB.getCurrentUser()

      if (!activeWsId || !user) {
        toast.error('Error de sesión o espacio de trabajo activo')
        setImporting(false)
        return
      }

      // Si se solicita limpiar, borrar movimientos previos en este espacio
      if (clearExisting) {
        await LocalDB.clearWorkspaceTransactions(activeWsId)
      }

      // 1. Crear las nuevas categorías solicitadas
      const createdCatsMap: Record<string, string> = {} // CSV Name -> Real ID
      
      const newCatsList = Object.entries(newCategoriesToCreate)
      if (newCatsList.length > 0) {
        const added = await LocalDB.bulkAddCategories(
          newCatsList.map(([name, val]) => ({
            name,
            type: val.type
          }))
        )
        added.forEach(c => {
          createdCatsMap[c.name.toLowerCase()] = c.id
        })
      }

      setImportProgress(40)

      // 2. Mapear transacciones
      const transactionsToInsert: Omit<Transaction, 'id' | 'created_at'>[] = []

      csvRows.forEach((row, idx) => {
        const rawDate = row[colMapping.date]
        const rawDesc = row[colMapping.description]
        const rawAmount = row[colMapping.amount]
        const rawCat = colMapping.category !== -1 ? row[colMapping.category] : ''
        const rawAcc = colMapping.account !== -1 ? row[colMapping.account] : ''
        const rawType = colMapping.type !== -1 ? row[colMapping.type] : ''

        if (!rawDate || !rawDesc || !rawAmount) return

        // Formatear fecha a YYYY-MM-DD
        let formattedDate = rawDate
        try {
          // Intentar parsear si viene en formatos comunes (DD/MM/YYYY o DD-MM-YYYY)
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

        // Obtener ID de la categoría mapeada
        let matchedCatId = ''
        if (rawCat) {
          const mappedId = categoryMapping[rawCat]
          if (mappedId) {
            matchedCatId = mappedId
          } else {
            // Revisar si fue una de las recién creadas
            matchedCatId = createdCatsMap[rawCat.toLowerCase()] || ''
          }
        }

        // Si no tiene categoría mapeada pero tiene cuenta de Money mapped to Arca category
        if (!matchedCatId && rawAcc) {
          matchedCatId = accountCategoryMapping[rawAcc] || ''
        }

        // Si aún no tenemos, usar una por defecto según el tipo
        if (!matchedCatId) {
          const defaultCat = categories.find(c => c.type === type)
          matchedCatId = defaultCat ? defaultCat.id : ''
        }

        transactionsToInsert.push({
          description: rawDesc,
          amount: Math.abs(cleanAmount),
          type,
          category_id: matchedCatId,
          workspace_id: activeWsId,
          user_id: user.id,
          date: formattedDate,
          details: rawAcc ? [{ description: `Bolsillo Money: ${rawAcc}`, amount: Math.abs(cleanAmount) }] : null
        })
      })

      setImportProgress(70)

      // 3. Inserción masiva de transacciones
      await LocalDB.bulkAddTransactions(transactionsToInsert)

      setImportProgress(100)
      toast.success(`Importación finalizada. ${transactionsToInsert.length} movimientos importados.`)
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

  const handleCreateNewCategory = (csvName: string, type: 'income' | 'expense') => {
    setNewCategoriesToCreate(prev => ({
      ...prev,
      [csvName]: { name: csvName, type }
    }))
    // Limpiar mapeo existente para que use la nueva
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
    // Eliminar de las creadas
    setNewCategoriesToCreate(prev => {
      const copy = { ...prev }
      delete copy[csvName]
      return copy
    })
  }

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
          Carga un archivo CSV exportado desde Money u otras aplicaciones para cargarlo a tu espacio de trabajo.
        </p>
      </div>

      {/* Indicador de pasos */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-4 flex items-center justify-between shadow-sm">
        {[
          { num: 1, label: 'Subir CSV', icon: FiUpload },
          { num: 2, label: 'Mapear Columnas', icon: FiColumns },
          { num: 3, label: 'Mapear Categorías', icon: FiGrid },
          { num: 4, label: 'Importar', icon: FiCheckCircle },
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
                {isDone ? <FiCheck className="w-3.5 h-3.5" /> : s.num}
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
            <p className="text-[10px] text-slate-600 mt-1">Sólo archivos .csv delimitados por comas</p>
          </div>

          <div className="bg-slate-950 border border-slate-850 rounded-md p-4 text-left space-y-2">
            <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
              <FiInfo className="w-3.5 h-3.5" /> Nota sobre Brenda (Money App)
            </h3>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Los registros migrados de la app Money pueden tener columnas como <strong>Account</strong> que contienen 
              &quot;Ahorro&quot;, &quot;Inversión Virtual&quot; o &quot;Apto&quot;. No te preocupes: el importador identificará esta columna y te permitirá 
              mapearla como categorías específicas dentro de tu espacio de trabajo.
            </p>
          </div>
        </div>
      )}

      {/* PASO 2: MAPEAR COLUMNAS */}
      {step === 2 && (
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md space-y-5">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Asociar Columnas del CSV</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Asocia las columnas de tu archivo CSV con los campos requeridos en la aplicación.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'date', label: 'Fecha (Obligatorio)', hint: 'Fecha de la transacción' },
              { key: 'description', label: 'Descripción (Obligatorio)', hint: 'Nombre o concepto del movimiento' },
              { key: 'amount', label: 'Monto (Obligatorio)', hint: 'Monto neto (positivo o negativo)' },
              { key: 'category', label: 'Categoría (Opcional)', hint: 'Categoría principal' },
              { key: 'subcategory', label: 'Subcategoría (Opcional)', hint: 'Subcategoría asociada' },
              { key: 'account', label: 'Cuenta / Origen (Opcional)', hint: 'Bolsillo en Money (ej. Ahorro, Apto)' },
              { key: 'type', label: 'Tipo de Movimiento (Opcional)', hint: 'Ingreso o Gasto explicitamente' },
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
                        <td key={cidx} className="py-2 px-3 text-slate-400 truncate max-w-[120px]">{cell}</td>
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

      {/* PASO 3: MAPEAR CATEGORÍAS */}
      {step === 3 && (
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md space-y-5">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Mapeo de Categorías y Bolsillos</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Asocia las categorías encontradas en el CSV con las de Arca Finanzas, o crea nuevas si no existen.
          </p>

          {/* Mapeo de Bolsillos de Cuenta (Money app específica) */}
          {moneyAccounts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-emerald-450 uppercase tracking-wide border-b border-slate-800 pb-1.5">Bolsillos / Cuentas de Money</h3>
              <p className="text-[10px] text-slate-500 leading-tight">
                Mapea bolsillos como &quot;Ahorro&quot;, &quot;Inversión Virtual&quot; o &quot;Apto&quot; a categorías. Esto registrará movimientos en ellas.
              </p>
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1.5 custom-scrollbar">
                {moneyAccounts.map((acc) => (
                  <div key={acc} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 border border-slate-850 rounded-md p-3">
                    <span className="text-xs font-bold text-slate-350">{acc}</span>
                    <select
                      value={accountCategoryMapping[acc] || ''}
                      onChange={(e) => setAccountCategoryMapping(prev => ({ ...prev, [acc]: e.target.value }))}
                      className="bg-slate-900 border border-slate-800 text-slate-200 rounded-md py-1.5 px-2.5 text-xs focus:border-emerald-500 outline-none w-full sm:max-w-xs cursor-pointer"
                    >
                      <option value="">-- Ignorar cuenta (Usará categoría del CSV) --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.type === 'expense' ? 'Gasto' : 'Ingreso'})</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mapeo de Categorías Generales */}
          <div className="space-y-3 pt-3">
            <h3 className="text-xs font-bold text-emerald-450 uppercase tracking-wide border-b border-slate-800 pb-1.5">Categorías del CSV</h3>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1.5 custom-scrollbar">
              {csvCategories.map((csvCat) => {
                const isNew = !!newCategoriesToCreate[csvCat]
                const currentVal = categoryMapping[csvCat] || ''
                return (
                  <div key={csvCat} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 border border-slate-850 rounded-md p-3.5">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-200 block truncate">{csvCat}</span>
                      {isNew && (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.2 rounded-md border border-emerald-500/10 mt-1 inline-block">
                          Se creará como nueva ({newCategoriesToCreate[csvCat].type === 'expense' ? 'Gasto' : 'Ingreso'})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                      {!isNew && (
                        <select
                          value={currentVal}
                          onChange={(e) => handleMapToExisting(csvCat, e.target.value)}
                          className="bg-slate-900 border border-slate-800 text-slate-200 rounded-md py-1.5 px-2.5 text-xs focus:border-emerald-500 outline-none w-full sm:max-w-xs cursor-pointer"
                        >
                          <option value="">-- No mapeado (creará por defecto) --</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.type === 'expense' ? 'Gasto' : 'Ingreso'})</option>
                          ))}
                        </select>
                      )}

                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCreateNewCategory(csvCat, 'expense')}
                          className={`px-2 py-1.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                            isNew && newCategoriesToCreate[csvCat].type === 'expense'
                              ? 'bg-rose-500/15 border-rose-500/35 text-rose-455' 
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          + Crear Gasto
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreateNewCategory(csvCat, 'income')}
                          className={`px-2 py-1.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                            isNew && newCategoriesToCreate[csvCat].type === 'income'
                              ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400' 
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          + Crear Ingreso
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
              Confirmar Vista <FiArrowRight className="w-3.5 h-3.5" />
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
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Transacciones</span>
              <span className="text-xl font-black text-slate-200 mt-1 block">{csvRows.length}</span>
            </div>
            <div className="bg-slate-950 border border-slate-850 rounded-md p-4 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Nuevas Categorías</span>
              <span className="text-xl font-black text-emerald-400 mt-1 block">
                {Object.keys(newCategoriesToCreate).length}
              </span>
            </div>
            <div className="bg-slate-950 border border-slate-850 rounded-md p-4 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Bolsillos Money</span>
              <span className="text-xl font-black text-indigo-400 mt-1 block">{moneyAccounts.length}</span>
            </div>
            <div className="bg-slate-950 border border-slate-850 rounded-md p-4 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Estado</span>
              <span className="text-xs font-bold text-emerald-450 mt-2 block">Listo</span>
            </div>
          </div>

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
                  <span className="text-xs font-bold text-slate-200 block">Iniciar desde cero</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Elimina todas las transacciones existentes en este espacio de trabajo antes de realizar la importación.
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
                  <FiInfo className="w-3.5 h-3.5" /> Advertencia
                </h3>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {clearExisting ? (
                    <strong className="text-rose-400">Atención: Se eliminarán de forma permanente todas las transacciones de este espacio antes de importar las del CSV. Esta acción es irreversible.</strong>
                  ) : (
                    <span>Este proceso agregará las transacciones del CSV a tu historial actual sin borrar nada. Si cometes un error en el mapeo de columnas, tendrás que eliminar las transacciones de forma manual o re-importar seleccionando &quot;Iniciar desde cero&quot;.</span>
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
