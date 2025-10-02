import { useEffect, useState } from 'react';
import { Plus, X, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}

interface Budget {
  id: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
  category?: Category;
  spent: number;
}

export function Budget() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
  });

  useEffect(() => {
    if (user) {
      loadCategories();
      loadBudgets();
    }
  }, [user, selectedMonth, selectedYear]);

  const loadCategories = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .order('name');

    if (data) {
      setCategories(data);
      if (data.length > 0 && !formData.category_id) {
        setFormData((prev) => ({ ...prev, category_id: data[0].id }));
      }
    }
  };

  const loadBudgets = async () => {
    if (!user) return;

    const { data: budgetData } = await supabase
      .from('budgets')
      .select(`
        *,
        categories (*)
      `)
      .eq('user_id', user.id)
      .eq('month', selectedMonth)
      .eq('year', selectedYear);

    if (budgetData) {
      const firstDay = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      const { data: transactionData } = await supabase
        .from('transactions')
        .select('category_id, amount')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', firstDay)
        .lte('date', lastDay);

      const spentByCategory: Record<string, number> = {};
      if (transactionData) {
        transactionData.forEach((transaction) => {
          spentByCategory[transaction.category_id] =
            (spentByCategory[transaction.category_id] || 0) + Number(transaction.amount);
        });
      }

      const budgetsWithSpent = budgetData.map((budget: any) => ({
        ...budget,
        spent: spentByCategory[budget.category_id] || 0,
      }));

      setBudgets(budgetsWithSpent);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from('budgets').upsert(
      {
        user_id: user.id,
        category_id: formData.category_id,
        amount: parseFloat(formData.amount),
        month: selectedMonth,
        year: selectedYear,
      },
      {
        onConflict: 'user_id,category_id,month,year',
      }
    );

    if (!error) {
      setShowModal(false);
      setFormData({
        category_id: categories.length > 0 ? categories[0].id : '',
        amount: '',
      });
      loadBudgets();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-600';
    if (percentage >= 80) return 'bg-amber-600';
    return 'bg-green-600';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-100 dark:bg-red-900/20';
    if (percentage >= 80) return 'bg-amber-100 dark:bg-amber-900/20';
    return 'bg-green-100 dark:bg-green-900/20';
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
          >
            {monthNames.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
          >
            {[2023, 2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Set Budget</span>
        </button>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-blue-100 text-sm font-medium">Total Budget</p>
            <h3 className="text-3xl font-bold mt-1">{formatCurrency(totalBudget)}</h3>
          </div>
          <div className="bg-white/20 p-3 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Spent: {formatCurrency(totalSpent)}</span>
            <span>Remaining: {formatCurrency(Math.max(0, totalBudget - totalSpent))}</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${Math.min(100, totalPercentage)}%` }}
            />
          </div>
          <p className="text-xs text-blue-100">
            {totalPercentage.toFixed(1)}% of budget used
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {budgets.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              No budgets set for this month. Create your first budget to start tracking your spending!
            </p>
          </div>
        ) : (
          budgets.map((budget) => {
            const percentage = (budget.spent / budget.amount) * 100;
            const remaining = budget.amount - budget.spent;

            return (
              <div
                key={budget.id}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${budget.category?.color}20` }}
                    >
                      <div
                        className="w-6 h-6"
                        style={{ color: budget.category?.color }}
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {budget.category?.name}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Budget: {formatCurrency(budget.amount)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${
                        percentage >= 100
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {formatCurrency(budget.spent)}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">spent</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className={`h-2 ${getProgressBarColor(percentage)} rounded-full overflow-hidden`}>
                    <div
                      className={`h-full ${getProgressColor(percentage)} transition-all duration-500`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span
                      className={`font-medium ${
                        percentage >= 100
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {percentage.toFixed(1)}% used
                    </span>
                    <span
                      className={`${
                        remaining < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      } font-medium`}
                    >
                      {remaining < 0 ? 'Over by ' : ''}
                      {formatCurrency(Math.abs(remaining))}
                      {remaining >= 0 ? ' left' : ''}
                    </span>
                  </div>
                </div>

                {percentage >= 80 && (
                  <div
                    className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
                      percentage >= 100
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : 'bg-amber-50 dark:bg-amber-900/20'
                    }`}
                  >
                    <AlertCircle
                      className={`w-5 h-5 flex-shrink-0 ${
                        percentage >= 100
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    />
                    <p
                      className={`text-sm ${
                        percentage >= 100
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {percentage >= 100
                        ? "You've exceeded your budget for this category!"
                        : 'You are approaching your budget limit. Consider reducing spending.'}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Set Budget</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Period
                </label>
                <div className="text-sm text-slate-600 dark:text-slate-400 px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  {monthNames[selectedMonth - 1]} {selectedYear}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
                  required
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Budget Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Set Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}