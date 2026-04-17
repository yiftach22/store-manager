import { useCallback, useEffect, useState } from 'react';
import { format, getDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { io } from 'socket.io-client';
import { api } from '../lib/api';
import { NavBar } from '../components/NavBar';
import type { TaskInstance } from '../types/tasks';

interface MyTasksData {
  role: { id: number; name: string } | null;
  daily: TaskInstance[];
  weekly: TaskInstance[];
}

type Tab = 'daily' | 'weekly';

function sorted(list: TaskInstance[]): TaskInstance[] {
  return [...list.filter((t) => !t.status), ...list.filter((t) => t.status)];
}

function TaskRow({
  instance,
  onToggle,
}: {
  instance: TaskInstance;
  onToggle: (id: number) => void;
}) {
  return (
    <li className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-100 last:border-0 active:bg-gray-50">
      <button
        onClick={() => onToggle(instance.id)}
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          instance.status
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 text-transparent hover:border-gray-400'
        }`}
        aria-label={instance.status ? 'סמן כלא בוצע' : 'סמן כבוצע'}
      >
        {instance.status && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span className={`flex-1 text-base ${instance.status ? 'line-through text-gray-400' : 'text-gray-800'}`}>
        {instance.title}
      </span>
    </li>
  );
}

function TaskList({
  instances,
  onToggle,
  emptyText,
}: {
  instances: TaskInstance[];
  onToggle: (id: number) => void;
  emptyText: string;
}) {
  if (instances.length === 0) {
    return <div className="text-center py-16 text-gray-400">{emptyText}</div>;
  }
  const done = instances.filter((t) => t.status).length;
  return (
    <>
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm text-gray-400">{done}/{instances.length} הושלמו</span>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <ul>
          {sorted(instances).map((inst) => (
            <TaskRow key={inst.id} instance={inst} onToggle={onToggle} />
          ))}
        </ul>
      </div>
    </>
  );
}

let _cache: { date: string; data: MyTasksData } | null = null;

export function WorkerTasksPage() {
  const now = new Date();
  const isSaturday = getDay(now) === 6;
  const today = format(now, 'yyyy-MM-dd');
  const [data, setData] = useState<MyTasksData | null>(_cache?.date === today ? _cache.data : null);
  const [loading, setLoading] = useState(_cache?.date !== today);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('daily');

  const fetchTasks = useCallback(async () => {
    if (isSaturday) return;
    if (!_cache || _cache.date !== today) setLoading(true);
    setError('');
    try {
      const res = await api.get<MyTasksData>(`/api/tasks/my-tasks?date=${today}`);
      _cache = { date: today, data: res.data };
      setData(res.data);
    } catch {
      setError('שגיאה בטעינת המשימות');
    } finally {
      setLoading(false);
    }
  }, [today, isSaturday]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL ?? '', {
      auth: { token: localStorage.getItem('token') ?? '' },
    });

    socket.on('task:toggled', ({ id, status, completedAt, completedByName }: {
      id: number; status: boolean; completedAt: string | null; completedByName: string | null;
    }) => {
      setData((prev) => {
        if (!prev) return prev;
        const apply = (list: TaskInstance[]) =>
          list.map((t) => (t.id === id ? { ...t, status, completedAt, completedByName } : t));
        return { ...prev, daily: apply(prev.daily), weekly: apply(prev.weekly) };
      });
    });

    return () => { socket.disconnect(); };
  }, []);

  async function handleToggle(id: number) {
    setData((prev) => {
      if (!prev) return prev;
      const apply = (list: TaskInstance[]) =>
        list.map((t) => t.id === id
          ? { ...t, status: !t.status, completedAt: t.status ? null : t.completedAt, completedByName: t.status ? null : t.completedByName }
          : t);
      return { ...prev, daily: apply(prev.daily), weekly: apply(prev.weekly) };
    });

    try {
      await api.patch(`/api/tasks/instances/${id}/toggle`);
    } catch {
      // revert
      setData((prev) => {
        if (!prev) return prev;
        const apply = (list: TaskInstance[]) =>
          list.map((t) => t.id === id
            ? { ...t, status: !t.status, completedAt: t.status ? null : t.completedAt, completedByName: t.status ? null : t.completedByName }
            : t);
        return { ...prev, daily: apply(prev.daily), weekly: apply(prev.weekly) };
      });
    }
  }

  const tabClass = (tab: Tab) =>
    `flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
      activeTab === tab
        ? 'border-indigo-600 text-indigo-600'
        : 'border-transparent text-gray-400 hover:text-gray-600'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-0" dir="rtl">
      <NavBar />

      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 pt-4">
          <h1 className="text-lg font-bold text-gray-800">
            {data?.role ? data.role.name : 'המשימות שלי'}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5 mb-3">{format(new Date(), 'EEEE, d/M/yyyy', { locale: he })}</p>

          {/* Tabs */}
          <div className="flex">
            <button className={tabClass('daily')} onClick={() => setActiveTab('daily')}>
              יומי
            </button>
            <button className={tabClass('weekly')} onClick={() => setActiveTab('weekly')}>
              שבועי
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {loading && <div className="text-center text-gray-400 py-12">טוען...</div>}
        {error && <div className="text-center text-red-500 py-12">{error}</div>}

        {isSaturday && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-2xl font-semibold text-gray-700">שבת שלום!</p>
            <p className="text-sm text-gray-400 mt-2">אין משימות להיום</p>
          </div>
        )}

        {!isSaturday && !loading && !error && data && (
          <>
            {data.role === null ? (
              <div className="text-center py-16">
                <p className="text-gray-400 text-base">לא הוקצה לך תפקיד</p>
                <p className="text-gray-300 text-sm mt-1">פנה למנהל להקצאת תפקיד</p>
              </div>
            ) : activeTab === 'daily' ? (
              <TaskList
                instances={data.daily}
                onToggle={handleToggle}
                emptyText="המשימות היומיות טרם נוצרו — פנה למנהל"
              />
            ) : (
              <TaskList
                instances={data.weekly}
                onToggle={handleToggle}
                emptyText="המשימות השבועיות טרם נוצרו — פנה למנהל"
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
