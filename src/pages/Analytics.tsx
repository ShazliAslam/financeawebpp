import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CategoryExpense {
  name: string;
  amount: number;
  color: string;
  percentage: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  savings: number;
}

export function Analytics() {
  const { user } = useAuth();
  const [categoryExpenses, setCategoryExpenses] = useState<CategoryExpense[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const firstDay = new Date(currentYear, now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(currentYear, now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        *,
        categories (name, color)
      `)
      .eq('user_id', user.id)
      .gte('date', firstDay)
      .lte('date', lastDay);

    if (transactions) {
      const expensesByCategory: Record<string, { amount: number; color: string }> = {};
      let totalExpense = 0;

      transactions.forEach((t: any) => {
        if (t.type === 'expense') {
          const categoryName = t.categories?.name || 'Other';
          const categoryColor = t.categories?.color || '#6366f1';
          const amount = Number(t.amount);

          if (!expensesByCategory[categoryName]) {
            expensesByCategory[categoryName] = { amount: 0, color: categoryColor };
          }
          expensesByCategory[categoryName].amount += amount;
          totalExpense += amount;
        }
      });

      const categoryData = Object.entries(expensesByCategory)
        .map(([name, data]) => ({
          name,
          amount: data.amount,
          color: data.color,
          percentage: (data.amount / totalExpense) * 100,
        }))
        .sort((a, b) => b.amount - a.amount);

      setCategoryExpenses(categoryData);
    }

    const monthlyStats: MonthlyData[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - 1 - i, 1);
      const targetMonth = targetDate.getMonth() + 1;
      const targetYear = targetDate.getFullYear();
      const monthFirst = new Date(targetYear, targetMonth - 1, 1).toISOString().split('T')[0];
      const monthLast = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

      const { data } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id)
        .gte('date', monthFirst)
        .lte('date', monthLast);

      let income = 0;
      let expense = 0;

      if (data) {
        data.forEach((t) => {
          if (t.type === 'income') {
            income += Number(t.amount);
          } else {
            expense += Number(t.amount);
          }
        });
      }

      monthlyStats.push({
        month: monthNames[targetMonth - 1],
        income,
        expense,
        savings: income - expense,
      });
    }

    setMonthlyData(monthlyStats);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const maxValue = Math.max(...monthlyData.map((d) => Math.max(d.income, d.expense)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Expenses by Category
          </h3>

          {categoryExpenses.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-12">
              No expense data available for this month
            </p>
          ) : (
            <div className="space-y-4">
              <div className="relative w-64 h-64 mx-auto">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  {categoryExpenses.reduce(
                    (acc, category, index) => {
                      const percentage = category.percentage;
                      const strokeDasharray = `${percentage} ${100 - percentage}`;
                      const strokeDashoffset = -acc.offset;
                      acc.offset += percentage;

                      return {
                        ...acc,
                        elements: [
                          ...acc.elements,
                          <circle
                            key={index}
                            cx="50"
                            cy="50"
                            r="15.915"
                            fill="transparent"
                            stroke={category.color}
                            strokeWidth="31.831"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-500"
                          />,
                        ],
                      };
                    },
                    { offset: 0, elements: [] as JSX.Element[] }
                  ).elements}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <DollarSign className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs text-slate-600 dark:text-slate-400">Total</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {categoryExpenses.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {category.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(category.amount)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {category.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Income vs Expenses Trend
          </h3>

          {monthlyData.every((d) => d.income === 0 && d.expense === 0) ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-12">
              No transaction data available
            </p>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-6 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Income</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Expenses</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Savings</span>
                </div>
              </div>

              <div className="relative h-64">
                <div className="absolute inset-0 flex items-end justify-between gap-4 px-2">
                  {monthlyData.map((data, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex items-end justify-center gap-1 h-48">
                        <div className="relative group flex-1">
                          <div
                            className="w-full bg-green-500 rounded-t transition-all duration-500 hover:bg-green-600"
                            style={{
                              height: `${maxValue > 0 ? (data.income / maxValue) * 100 : 0}%`,
                              minHeight: data.income > 0 ? '4px' : '0px',
                            }}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                            {formatCurrency(data.income)}
                          </div>
                        </div>

                        <div className="relative group flex-1">
                          <div
                            className="w-full bg-red-500 rounded-t transition-all duration-500 hover:bg-red-600"
                            style={{
                              height: `${maxValue > 0 ? (data.expense / maxValue) * 100 : 0}%`,
                              minHeight: data.expense > 0 ? '4px' : '0px',
                            }}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                            {formatCurrency(data.expense)}
                          </div>
                        </div>

                        <div className="relative group flex-1">
                          <div
                            className="w-full bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600"
                            style={{
                              height: `${maxValue > 0 && data.savings > 0 ? (data.savings / maxValue) * 100 : 0}%`,
                              minHeight: data.savings > 0 ? '4px' : '0px',
                            }}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                            {formatCurrency(data.savings)}
                          </div>
                        </div>
                      </div>

                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {data.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Average Income</h4>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(
              monthlyData.reduce((sum, d) => sum + d.income, 0) / monthlyData.length
            )}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Last 6 months</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Average Expenses</h4>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(
              monthlyData.reduce((sum, d) => sum + d.expense, 0) / monthlyData.length
            )}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Last 6 months</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Average Savings</h4>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(
              monthlyData.reduce((sum, d) => sum + d.savings, 0) / monthlyData.length
            )}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Last 6 months</p>
        </div>
      </div>
    </div>
  );
}