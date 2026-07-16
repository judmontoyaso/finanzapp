'use client'

import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import { Transaction, Category } from '@/types'
import { FiEdit, FiTrash2, FiChevronUp, FiChevronDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

const col = createColumnHelper<Transaction>()

export default function TransactionsTable({
  transactions,
  categories,
  onEdit,
  onDelete,
  onRowClick,
}: {
  transactions: Transaction[]
  categories: Category[]
  onEdit: (tx: Transaction) => void
  onDelete: (id: string) => void
  onRowClick?: (tx: Transaction) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }])
  const catName = useMemo(() => {
    return new Map(
      categories.map((c) => {
        if (c.parent_id) {
          const parent = categories.find((p) => p.id === c.parent_id)
          if (parent) {
            return [c.id, `${parent.name} / ${c.name}`]
          }
        }
        return [c.id, c.name]
      })
    )
  }, [categories])

  const columns = useMemo(
    () => [
      col.accessor('date', {
        header: 'Fecha',
        cell: (i) =>
          new Date(i.getValue()).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
        sortingFn: 'alphanumeric',
      }),
      col.accessor('description', {
        header: 'Descripción',
        cell: (i) => {
          const n = i.row.original.details?.length || 0
          return (
            <span className="font-semibold text-slate-100">
              {i.getValue()}
              {n > 0 && <span className="ml-2 text-[9px] font-bold text-emerald-500">{n} ítem{n > 1 ? 's' : ''}</span>}
            </span>
          )
        },
      }),
      col.accessor('category_id', {
        header: 'Categoría',
        enableSorting: false,
        cell: (i) => (
          <span className="inline-block px-2 py-0.5 bg-slate-950 text-slate-400 rounded-md text-[10px] border border-slate-800">
            {catName.get(i.getValue()) || 'Sin categoría'}
          </span>
        ),
      }),
      col.accessor('type', {
        header: 'Tipo',
        cell: (i) => {
          const inc = i.getValue() === 'income'
          return (
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${inc ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              <span className={`w-1 h-1 rounded-full ${inc ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              {inc ? 'Ingreso' : 'Gasto'}
            </span>
          )
        },
      }),
      col.accessor('amount', {
        header: 'Monto',
        cell: (i) => {
          const inc = i.row.original.type === 'income'
          return (
            <span className={`font-bold whitespace-nowrap ${inc ? 'text-emerald-500' : 'text-rose-500'}`}>
              {inc ? '+' : '-'}${Math.abs(i.getValue()).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
          )
        },
      }),
      col.display({
        id: 'actions',
        header: '',
        cell: (i) => (
          <div className="flex justify-end items-center gap-1">
            <button onClick={() => onEdit(i.row.original)} title="Editar" className="p-1.5 text-slate-500 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-all cursor-pointer">
              <FiEdit className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(i.row.original.id)} title="Eliminar" className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-slate-800 rounded-md transition-all cursor-pointer">
              <FiTrash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      }),
    ],
    [catName, onEdit, onDelete]
  )

  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold tracking-wider text-left">
                {hg.headers.map((h) => {
                  const sortable = h.column.getCanSort()
                  const dir = h.column.getIsSorted()
                  return (
                    <th
                      key={h.id}
                      onClick={sortable ? h.column.getToggleSortingHandler() : undefined}
                      className={`pb-3 pr-3 ${h.id === 'actions' || h.id === 'amount' ? 'text-right' : ''} ${sortable ? 'cursor-pointer select-none hover:text-slate-300' : ''}`}
                    >
                      <span className={`inline-flex items-center gap-1 ${h.id === 'amount' ? 'justify-end w-full' : ''}`}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {dir === 'asc' && <FiChevronUp className="w-3 h-3" />}
                        {dir === 'desc' && <FiChevronDown className="w-3 h-3" />}
                      </span>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-800/20 transition-colors">
                {row.getVisibleCells().map((cell) => {
                  const isActions = cell.column.id === 'actions'
                  return (
                    <td
                      key={cell.id}
                      onClick={() => !isActions && onRowClick?.(row.original)}
                      className={`py-3 pr-3 text-slate-350 ${isActions ? 'text-right' : 'cursor-pointer'} ${cell.column.id === 'amount' ? 'text-right' : ''}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-800">
          <span className="text-[10px] text-slate-500 font-semibold">
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()} · {transactions.length} movimientos
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-md disabled:opacity-40 transition-all cursor-pointer"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-md disabled:opacity-40 transition-all cursor-pointer"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
