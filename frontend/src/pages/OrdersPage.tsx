import { useCallback, useEffect, useState } from 'react';
import { startOfWeek, addWeeks, subWeeks, format, isSameDay, isBefore, isAfter, startOfDay } from 'date-fns';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { WeekData, OrderInstance } from '../types/orders';
import { WeekNav } from '../components/WeekNav';
import { DayColumn } from '../components/DayColumn';
import { FloatingList } from '../components/FloatingList';

function getSundayOfWeek(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 0 });
}

export function OrdersPage() {
  const { user, logout } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const [weekStart, setWeekStart] = useState<Date>(() => getSundayOfWeek(new Date()));
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchWeek = useCallback(async (sunday: Date) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<WeekData>(`/api/orders/week?weekOf=${format(sunday, 'yyyy-MM-dd')}`);
      setWeekData(res.data);
    } catch {
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWeek(weekStart); }, [weekStart, fetchWeek]);

  const currentWeekSunday = getSundayOfWeek(new Date());
  const isFutureWeek = isAfter(weekStart, currentWeekSunday);

  // Optimistic toggle — flip locally, then sync to server; revert on error
  function handleToggle(id: number) {
    if (id < 0) return; // virtual template instance — no DB record to toggle
    setWeekData((prev) => {
      if (!prev) return prev;
      const flipInstance = (inst: OrderInstance) =>
        inst.id === id ? { ...inst, status: !inst.status } : inst;
      const resortList = (list: OrderInstance[]) => {
        const flipped = list.map(flipInstance);
        return [
          ...flipped.filter((i) => !i.status && i.isOverdue),
          ...flipped.filter((i) => !i.status && !i.isOverdue),
          ...flipped.filter((i) => i.status),
        ];
      };
      return {
        ...prev,
        days: prev.days.map((d) => ({ ...d, instances: resortList(d.instances) })),
        lists: prev.lists.map((l) => ({ ...l, instances: resortList(l.instances) })),
      };
    });

    api.patch(`/api/orders/instances/${id}/toggle`).catch(() => {
      // Revert on network error
      fetchWeek(weekStart);
    });
  }

  function handleDayAdded(date: string, instance: OrderInstance) {
    setWeekData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((d) =>
          d.date === date ? { ...d, instances: [...d.instances, instance] } : d
        ),
      };
    });
  }

  function handleListAdded(listId: number, instance: OrderInstance) {
    setWeekData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lists: prev.lists.map((l) =>
          l.id === listId ? { ...l, instances: [...l.instances, instance] } : l
        ),
      };
    });
  }

  const today = startOfDay(new Date());

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Top bar */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">ניצת — הזמנות</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.name}</span>
            {isManager && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">מנהל</span>}
            <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600">יציאה</button>
          </div>
        </div>
        <WeekNav
          weekStart={weekStart}
          onPrev={() => setWeekStart((w) => subWeeks(w, 1))}
          onNext={() => setWeekStart((w) => addWeeks(w, 1))}
        />
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex flex-col gap-8">
        {loading && <div className="text-center text-gray-400 py-12">טוען...</div>}
        {error && <div className="text-center text-red-500 py-12">{error}</div>}

        {weekData && !loading && (
          <>
            {/* ── Daily section ── */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 mb-3">הזמנות יומיות</h2>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {weekData.days.map((day) => {
                  const dayDate = startOfDay(new Date(day.date + 'T00:00:00'));
                  const isToday = isSameDay(dayDate, today);
                  const isPast = isBefore(dayDate, today) && !isToday;
                  return (
                    <DayColumn
                      key={day.date}
                      day={day}
                      isToday={isToday}
                      isPast={isPast}
                      isFuture={isFutureWeek}
                      isManager={isManager}
                      onToggle={handleToggle}
                      onAdded={handleDayAdded}
                    />
                  );
                })}
              </div>
            </section>

            {/* ── Floating lists section ── */}
            {weekData.lists.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 mb-3">רשימות שבועיות</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {weekData.lists.map((list) => (
                    <FloatingList
                      key={list.id}
                      list={list}
                      isManager={isManager}
                      isFuture={isFutureWeek}
                      weekStart={weekData.weekStart}
                      onToggle={handleToggle}
                      onAdded={handleListAdded}
                    />
                  ))}
                </div>
              </section>
            )}

            {weekData.lists.length === 0 && !isManager && (
              <div className="text-center text-gray-400 text-sm py-4">אין רשימות שבועיות</div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
