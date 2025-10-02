import { useEffect, useState } from 'react';
import { Plus, X, Bell, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Reminder {
  id: string;
  title: string;
  amount: number;
  due_date: number;
  is_recurring: boolean;
  is_active: boolean;
  category_id: string | null;
  category?: Category;
}

export function Reminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    due_date: '1',
    category_id: '',
    is_recurring: true,
  });

  useEffect(() => {
    if (user) {
      loadCategories();
      loadReminders();
    }
  }, [user]);

  const loadCategories = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('categories')
      .select('id, name, color')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .order('name');

    if (data) {
      setCategories(data);
    }
  };

  const loadReminders = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('bill_reminders')
      .select(`
        *,
        categories (id, name, color)
      `)
      .eq('user_id', user.id)
      .order('due_date');

    if (data) {
      setReminders(data as any);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from('bill_reminders').insert({
      user_id: user.id,
      title: formData.title,
      amount: parseFloat(formData.amount),
      due_date: parseInt(formData.due_date),
      category_id: formData.category_id || null,
      is_recurring: formData.is_recurring,
      is_active: true,
    });

    if (!error) {
      setShowModal(false);
      setFormData({
        title: '',
        amount: '',
        due_date: '1',
        category_id: '',
        is_recurring: true,
      });
      loadReminders();
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('bill_reminders')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) {
      loadReminders();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;

    const { error } = await supabase.from('bill_reminders').delete().eq('id', id);

    if (!error) {
      loadReminders();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getDaysUntilDue = (dueDate: number) => {
    const today = new Date().getDate();
    let days = dueDate - today;

    if (days < 0) {
      const daysInMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0
      ).getDate();
      days = daysInMonth - today + dueDate;
    }

    return days;
  };

  const getStatusBadge = (dueDate: number, isActive: boolean) => {
    if (!isActive) {
      return {
        text: 'Inactive',
        className: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
      };
    }

    const daysUntil = getDaysUntilDue(dueDate);

    if (daysUntil === 0) {
      return {
        text: 'Due Today',
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      };
    } else if (daysUntil <= 3) {
      return {
        text: `Due in ${daysUntil} days`,
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      };
    } else if (daysUntil <= 7) {
      return {
        text: `Due in ${daysUntil} days`,
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      };
    } else {
      return {
        text: `Due on ${dueDate}${getDaySuffix(dueDate)}`,
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      };
    }
  };

  const getDaySuffix = (day: number) => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };

  const upcomingReminders = reminders.filter((r) => {
    const daysUntil = getDaysUntilDue(r.due_date);
    return r.is_active && daysUntil <= 7;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bill Reminders</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Never miss a payment again
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Reminder</span>
        </button>
      </div>

      {upcomingReminders.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-300 mb-2">
                Upcoming Bills
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-400">
                You have {upcomingReminders.length} bill{upcomingReminders.length > 1 ? 's' : ''}{' '}
                due in the next 7 days
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {reminders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <Bell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              No reminders set. Add your first bill reminder to stay on top of your payments!
            </p>
          </div>
        ) : (
          reminders.map((reminder) => {
            const status = getStatusBadge(reminder.due_date, reminder.is_active);

            return (
              <div
                key={reminder.id}
                className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border transition-all ${
                  reminder.is_active
                    ? 'border-slate-200 dark:border-slate-700 hover:shadow-md'
                    : 'border-slate-200 dark:border-slate-700 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      <button
                        onClick={() => handleToggleActive(reminder.id, reminder.is_active)}
                        className={`p-2 rounded-lg transition-colors ${
                          reminder.is_active
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                        }`}
                      >
                        {reminder.is_active ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <Bell className="w-6 h-6" />
                        )}
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                          {reminder.title}
                        </h4>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}
                        >
                          {status.text}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {formatCurrency(reminder.amount)}
                        </p>

                        {reminder.category && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: reminder.category.color }}
                            />
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {reminder.category.name}
                            </span>
                          </div>
                        )}

                        {reminder.is_recurring && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Recurring monthly
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(reminder.id)}
                    className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Add Bill Reminder
              </h3>
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
                  Bill Name
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
                  placeholder="e.g., Electricity Bill"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Amount
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

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Due Date (Day of Month)
                </label>
                <select
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
                  required
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                      {getDaySuffix(day)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Category (Optional)
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
                >
                  <option value="">None</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.is_recurring}
                  onChange={(e) =>
                    setFormData({ ...formData, is_recurring: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="recurring"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Recurring monthly
                </label>
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
                  Add Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}