/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase'

async function getBudgetSummary() {
  const currentDate = new Date().toISOString().split('T')[0]
  
  const { data: budgets, error: budgetError } = await supabase
    .from('budgets')
    .select(`
      amount,
      categories (
        name,
        type
      )
    `)
    .lte('start_date', currentDate)
    .gte('end_date', currentDate)

  if (budgetError) throw budgetError

  const { data: transactions, error: transactionError } = await supabase
    .from('transactions')
    .select('amount, type, category_id')
    .gte('date', currentDate.slice(0, 7) + '-01') // Desde el primer día del mes actual
    .lte('date', currentDate)

  if (transactionError) throw transactionError

  return {
    budgets,
    transactions
  }
}

export default async function BudgetOverview() {
  const { budgets, transactions } = await getBudgetSummary()

  // Calcular totales
  const totalIncome = transactions
    ?.filter(t => t.type === 'income')
    ?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0

  const totalExpenses = transactions
    ?.filter(t => t.type === 'expense')
    ?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0

  const balance = totalIncome - totalExpenses

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-green-800">Ingresos</h3>
          <p className="text-2xl font-bold text-green-600">
            {new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR'
            }).format(totalIncome)}
          </p>
        </div>

        <div className="bg-red-100 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-red-800">Gastos</h3>
          <p className="text-2xl font-bold text-red-600">
            {new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR'
            }).format(totalExpenses)}
          </p>
        </div>

        <div className={`${
          balance >= 0 ? 'bg-blue-100' : 'bg-yellow-100'
        } p-4 rounded-lg`}>
          <h3 className="text-lg font-medium text-blue-800">Balance</h3>
          <p className={`text-2xl font-bold ${
            balance >= 0 ? 'text-blue-600' : 'text-yellow-600'
          }`}>
            {new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR'
            }).format(balance)}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Presupuestos Actuales</h3>
        <div className="space-y-4">
          {budgets?.map((budget: any) => (
            <div key={budget.id} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">{budget.categories.name}</span>
                <span className="text-gray-600">
                  {new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(budget.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
