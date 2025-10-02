import { Bell, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuth();
  const [userName, setUserName] = useState('');
  const [notifications, setNotifications] = useState(0);

  useEffect(() => {
    if (user) {
      loadUserData();
      loadNotifications();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setUserName(data.full_name);
    }
  };

  const loadNotifications = async () => {
    if (!user) return;

    const today = new Date().getDate();
    const { data } = await supabase
      .from('bill_reminders')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (data) {
      const upcoming = data.filter((bill) => {
        const daysUntil = bill.due_date - today;
        return daysUntil >= 0 && daysUntil <= 3;
      });
      setNotifications(upcoming.length);
    }
  };

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Welcome back, {userName}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              className="pl-10 pr-4 py-2 w-64 bg-slate-100 dark:bg-slate-700 border border-transparent focus:border-blue-500 rounded-lg outline-none text-sm text-slate-900 dark:text-white placeholder-slate-500"
            />
          </div>

          <button className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <Bell className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            {notifications > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                {notifications}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}