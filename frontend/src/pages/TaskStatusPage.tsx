import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, format, subDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { io } from 'socket.io-client';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { RoleStatus, TaskInstance } from '../types/tasks';
import { NavBar } from '../components/NavBar';
import { RoleStatusCard } from '../components/RoleStatusCard';

export function TaskStatusPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'MANAGER') navigate('/', { replace: true });
  }, [user, navigate]);

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [statusData, setStatusData] = useState<RoleStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

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
    setLoading(true);
    setError('');
    try {
      const res = await api.get<RoleStatus[]>(
        `/api/tasks/status?date=${format(date, 'yyyy-MM-dd')}`
      );
      const data = res.data;
      const empty = data.every((r) => r.daily.length === 0 && r.weekly.length === 0);

      if (empty && isToday(date)) {
        setSyncing(true);
        try {
          await api.post('/api/tasks/sync');
          const synced = await api.get<RoleStatus[]>(
            `/api/tasks/status?date=${format(date, 'yyyy-MM-dd')}`
          );
          setStatusData(synced.data);
        } finally {
          setSyncing(false);
        }
      } else {
        setStatusData(data);
      }
    } catch {
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      <NavBar />

      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-800">מעקב משימות</h1>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50"
            >
              {syncing ? 'מייצר...' : 'צור משימות להיום'}
            </button>
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedDate((d) => subDays(d, 1))}
              className="text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
            >
              →
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-52 text-center">
              {dateLabel}
            </span>
            <button
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className="text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
            >
              ←
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-xs text-blue-500 hover:text-blue-700 mr-2"
            >
              היום
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {loading && <div className="text-center text-gray-400 py-12">טוען...</div>}
        {error && <div className="text-center text-red-500 py-12">{error}</div>}

        {!loading && !error && (
          <>
            {(statusData.length === 0 || isEmpty) && (
              <div className="text-center text-gray-400 py-12">אין נתונים לתאריך זה</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statusData
                .filter((r) => r.daily.length > 0 || r.weekly.length > 0)
                .map((roleStatus) => (
                  <RoleStatusCard key={roleStatus.role.id} roleStatus={roleStatus} />
                ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
