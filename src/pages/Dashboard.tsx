import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Stats {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  monthlyChange: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  date: string;
  category_name: string;
  category_icon: string;
  category_color: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    monthlyChange: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
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
        categories (name, icon, color)
      `)
      .eq('user_id', user.id)
      .gte('date', firstDay)
      .lte('date', lastDay)
      .order('date', { ascending: false });

    if (transactions) {
      const income = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expenses = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      setStats({
        totalIncome: income,
        totalExpenses: expenses,
        totalSavings: income - expenses,
        monthlyChange: 12.5,
      });

      const recent = transactions.slice(0, 5).map((t: any) => ({
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        description: t.description,
        date: t.date,
        category_name: t.categories?.name || 'Uncategorized',
        category_icon: t.categories?.icon || 'circle',
        category_color: t.categories?.color || '#6366f1',
      }));

      setRecentTransactions(recent);
    }

    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Income</p>
              <h3 className="text-3xl font-bold mt-2">{formatCurrency(stats.totalIncome)}</h3>
              <div className="flex items-center gap-1 mt-3">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">+{stats.monthlyChange}% from last month</span>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Total Expenses</p>
              <h3 className="text-3xl font-bold mt-2">{formatCurrency(stats.totalExpenses)}</h3>
              <div className="flex items-center gap-1 mt-3">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm">+8.2% from last month</span>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Savings</p>
              <h3 className="text-3xl font-bold mt-2">{formatCurrency(stats.totalSavings)}</h3>
              <div className="flex items-center gap-1 mt-3">
                <PiggyBank className="w-4 h-4" />
                <span className="text-sm">
                  {stats.totalIncome > 0
                    ? `${((stats.totalSavings / stats.totalIncome) * 100).toFixed(1)}% saved`
                    : 'No income yet'}
                </span>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Transactions</h3>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View All</button>
          </div>

          <div className="space-y-4">
            {recentTransactions.length === 0 ? (
              <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                No transactions yet. Add your first transaction to get started!
              </p>
            ) : (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${transaction.category_color}20` }}
                  >
                    <div className="w-6 h-6" style={{ color: transaction.category_color }}>
                      <Wallet className="w-full h-full" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {transaction.description || transaction.category_name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(transaction.date)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        transaction.type === 'income'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Quick Actions</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl transition-colors text-left">
              <ArrowUpRight className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
              <p className="font-medium text-slate-900 dark:text-white">Add Income</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Record earnings</p>
            </button>

            <button className="p-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl transition-colors text-left">
              <ArrowDownRight className="w-6 h-6 text-red-600 dark:text-red-400 mb-2" />
              <p className="font-medium text-slate-900 dark:text-white">Add Expense</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Track spending</p>
            </button>

            <button className="p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl transition-colors text-left">
              <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
              <p className="font-medium text-slate-900 dark:text-white">Set Budget</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Plan spending</p>
            </button>

            <button className="p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-xl transition-colors text-left">
              <PiggyBank className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
              <p className="font-medium text-slate-900 dark:text-white">View Reports</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Analyze trends</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}