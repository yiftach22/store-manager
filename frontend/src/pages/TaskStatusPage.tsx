import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, format, startOfWeek, subDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { io } from 'socket.io-client';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { RoleStatus, TaskInstance } from '../types/tasks';
import type { WeekData } from '../types/orders';
import { NavBar } from '../components/NavBar';
import { RoleStatusCard } from '../components/RoleStatusCard';

function ProgressBar({ done, total, color }: { done: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-3.5">
        <div
          className={`${color} rounded-full h-3.5 transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm text-gray-500 w-10 text-left">{done}/{total}</span>
    </div>
  );
}

interface OrderSummaryProps {
  title: string;
  done: number;
  total: number;
  color: string;
}

function OrderSummaryCard({ title, done, total, color }: OrderSummaryProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
      <h3 className="text-base font-semibold text-gray-800 mb-3">{title}</h3>
      {total > 0 ? (
        <ProgressBar done={done} total={total} color={color} />
      ) : (
        <p className="text-sm text-gray-300">אין הזמנות</p>
      )}
    </div>
  );
}

let _statusCache: { date: string; data: RoleStatus[] } | null = null;
let _weekCache: WeekData | null = null;

export function TaskStatusPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'MANAGER') navigate('/', { replace: true });
  }, [user, navigate]);

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [statusData, setStatusData] = useState<RoleStatus[]>(
    _statusCache?.date === todayStr ? _statusCache.data : []
  );
  const [loading, setLoading] = useState(_statusCache?.date !== todayStr);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Orders summary state (always current week/today)
  const [weekData, setWeekData] = useState<WeekData | null>(_weekCache);

  async function handleSync() {
    setSyncing(true);
    try {
      await api.post('/api/tasks/sync');
      fetchStatus(selectedDate);
    } finally {
      setSyncing(false);
    }
  }

  const isToday = (date: Date) => format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const fetchStatus = useCallback(async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (_statusCache?.date !== dateStr) setLoading(true);
    setError('');
    try {
      const res = await api.get<RoleStatus[]>(`/api/tasks/status?date=${dateStr}`);
      const data = res.data;
      const empty = data.every((r) => r.daily.length === 0 && r.weekly.length === 0);

      if (empty && isToday(date)) {
        setSyncing(true);
        try {
          await api.post('/api/tasks/sync');
          const synced = await api.get<RoleStatus[]>(`/api/tasks/status?date=${dateStr}`);
          _statusCache = { date: dateStr, data: synced.data };
          setStatusData(synced.data);
        } finally {
          setSyncing(false);
        }
      } else {
        _statusCache = { date: dateStr, data };
        setStatusData(data);
      }
    } catch {
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch orders week data (always current week)
  useEffect(() => {
    const sunday = startOfWeek(new Date(), { weekStartsOn: 0 });
    api.get<WeekData>(`/api/orders/week?weekOf=${format(sunday, 'yyyy-MM-dd')}`)
      .then((res) => { _weekCache = res.data; setWeekData(res.data); })
      .catch(() => {/* silently ignore */});
  }, []);

  useEffect(() => { fetchStatus(selectedDate); }, [selectedDate, fetchStatus]);

  // Realtime: apply task:toggled events to the status grid
  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL ?? '', {
      auth: { token: localStorage.getItem('token') ?? '' },
    });

    socket.on('task:toggled', ({ id, status, completedAt, completedByName }: {
      id: number; status: boolean; completedAt: string | null; completedByName: string | null;
    }) => {
      setStatusData((prev) => prev.map((roleStatus) => {
        const apply = (list: TaskInstance[]) =>
          list.map((t) => (t.id === id ? { ...t, status, completedAt, completedByName } : t));
        return { ...roleStatus, daily: apply(roleStatus.daily), weekly: apply(roleStatus.weekly) };
      }));
    });

    return () => { socket.disconnect(); };
  }, []);

  const isEmpty = statusData.every((r) => r.daily.length === 0 && r.weekly.length === 0);
  const dateLabel = format(selectedDate, 'EEEE, d בMMMM yyyy', { locale: he });

  // Compute order summaries
  const todayInstances = weekData?.days.find((d) => d.date === todayStr)?.instances ?? [];
  const dailyDone = todayInstances.filter((i) => i.status).length;
  const dailyTotal = todayInstances.length;

  const weeklyInstances = weekData?.lists.flatMap((l) => l.instances) ?? [];
  const weeklyDone = weeklyInstances.filter((i) => i.status).length;
  const weeklyTotal = weeklyInstances.length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      <NavBar />

      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800">מעקב</h1>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-sm text-indigo-500 hover:text-indigo-700 disabled:opacity-50"
            >
              {syncing ? 'מייצר...' : 'צור משימות להיום'}
            </button>
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedDate((d) => subDays(d, 1))}
              className="text-gray-400 hover:text-gray-600 px-2.5 py-1.5 rounded hover:bg-gray-100"
            >
              →
            </button>
            <span className="text-base font-medium text-gray-700 min-w-52 text-center">
              {dateLabel}
            </span>
            <button
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className="text-gray-400 hover:text-gray-600 px-2.5 py-1.5 rounded hover:bg-gray-100"
            >
              ←
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-sm text-indigo-500 hover:text-indigo-700 mr-2"
            >
              היום
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {loading && <div className="text-center text-gray-400 py-12">טוען...</div>}
        {error && <div className="text-center text-red-500 py-12">{error}</div>}

        {(!loading || statusData.length > 0) && !error && (
          <div className="flex gap-0">
            {/* Order summary cards — right side in RTL */}
            <div className="w-64 shrink-0 flex flex-col gap-4">
              <OrderSummaryCard
                title="הזמנות יומיות"
                done={dailyDone}
                total={dailyTotal}
                color="bg-indigo-500"
              />
              <OrderSummaryCard
                title="הזמנות שבועיות"
                done={weeklyDone}
                total={weeklyTotal}
                color="bg-emerald-500"
              />
            </div>

            {/* Vertical separator */}
            <div className="w-px bg-gray-200 mx-6 shrink-0" />

            {/* Role status cards — left side in RTL */}
            <div className="flex-1 min-w-0">
              {(statusData.length === 0 || isEmpty) && (
                <div className="text-center text-gray-400 py-12">אין נתונים לתאריך זה</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {statusData
                  .filter((r) => r.daily.length > 0 || r.weekly.length > 0)
                  .map((roleStatus) => (
                    <RoleStatusCard key={roleStatus.role.id} roleStatus={roleStatus} />
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
