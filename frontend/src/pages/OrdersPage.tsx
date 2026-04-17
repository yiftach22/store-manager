import { useCallback, useEffect, useState } from 'react';
import { startOfWeek, addWeeks, subWeeks, format, isSameDay, isBefore, isAfter, startOfDay } from 'date-fns';
import { io } from 'socket.io-client';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { WeekData, OrderInstance } from '../types/orders';
import { WeekNav } from '../components/WeekNav';
import { DayColumn } from '../components/DayColumn';
import { FloatingList } from '../components/FloatingList';
import { EditTemplatesModal } from '../components/EditTemplatesModal';
import { NavBar } from '../components/NavBar';

function getSundayOfWeek(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 0 });
}

let _ordersCache: { weekStart: string; data: WeekData } | null = null;

export function OrdersPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  // MANAGER and ORDERS can both add one-off items. ORDERS cannot enter edit mode,
  // trigger rollover, or create new lists — those stay manager-only below.
  const canAddOneOff = user?.role === 'MANAGER' || user?.role === 'ORDERS';

  const [weekStart, setWeekStart] = useState<Date>(() => getSundayOfWeek(new Date()));
  const _thisWeek = format(getSundayOfWeek(new Date()), 'yyyy-MM-dd');
  const [weekData, setWeekData] = useState<WeekData | null>(
    _ordersCache?.weekStart === _thisWeek ? _ordersCache.data : null
  );
  const [loading, setLoading] = useState(_ordersCache?.weekStart !== _thisWeek);
  const [error, setError] = useState('');
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Realtime updates — listen for toggle events from other clients
  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL ?? '', {
      auth: { token: localStorage.getItem('token') ?? '' },
    });

    socket.on('instance:toggled', ({ id, status, completedAt, completedByName }: {
      id: number;
      status: boolean;
      completedAt?: string | null;
      completedByName?: string | null;
    }) => {
      setWeekData((prev) => {
        if (!prev) return prev;
        const applyUpdate = (instances: OrderInstance[]) => {
          if (!instances.some((i) => i.id === id)) return instances;
          const next = instances.map((i) =>
            i.id === id
              ? { ...i, status, completedAt: completedAt ?? null, completedByName: completedByName ?? null }
              : i
          );
          return [
            ...next.filter((i) => !i.status && i.isOverdue),
            ...next.filter((i) => !i.status && !i.isOverdue),
            ...next.filter((i) => i.status),
          ];
        };
        return {
          ...prev,
          days: prev.days.map((d) => ({ ...d, instances: applyUpdate(d.instances) })),
          lists: prev.lists.map((l) => ({ ...l, instances: applyUpdate(l.instances) })),
        };
      });
    });

    return () => { socket.disconnect(); };
  }, []);

  const fetchWeek = useCallback(async (sunday: Date) => {
    const weekStr = format(sunday, 'yyyy-MM-dd');
    if (_ordersCache?.weekStart !== weekStr) setLoading(true);
    setError('');
    try {
      const res = await api.get<WeekData>(`/api/orders/week?weekOf=${weekStr}`);
      _ordersCache = { weekStart: weekStr, data: res.data };
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

  function handleListDeleted(listId: number) {
    setWeekData((prev) => prev && { ...prev, lists: prev.lists.filter((l) => l.id !== listId) });
  }

  function handleListRenamed(listId: number, name: string) {
    setWeekData((prev) => prev && {
      ...prev,
      lists: prev.lists.map((l) => l.id === listId ? { ...l, name } : l),
    });
  }

  const today = startOfDay(new Date());
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  async function handleManualSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      await api.post('/api/orders/sync');
      setSyncMsg('הרולאובר הופעל בהצלחה');
      fetchWeek(weekStart);
    } catch {
      setSyncMsg('שגיאה בהפעלת הרולאובר');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 4000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      <NavBar />

      <header className="bg-white shadow-sm">
        <WeekNav
          weekStart={weekStart}
          onPrev={() => setWeekStart((w) => subWeeks(w, 1))}
          onNext={() => setWeekStart((w) => addWeeks(w, 1))}
        />
      </header>

      <main className="flex-1 w-full px-8 py-8 flex flex-col gap-10">
        <>
            {loading && <div className="text-center text-gray-400 py-12">טוען...</div>}
            {error && <div className="text-center text-red-500 py-12">{error}</div>}

            {weekData && !loading && (
              <>
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-700">הזמנות יומיות</h2>
                    {isManager && (
                      <div className="flex items-center gap-3">
                        {syncMsg && (
                          <span className={`text-sm ${syncMsg.includes('שגיאה') ? 'text-red-500' : 'text-green-600'}`}>
                            {syncMsg}
                          </span>
                        )}
                        <button
                          onClick={handleManualSync}
                          disabled={syncing}
                          className="text-sm px-3 py-1.5 rounded-full border border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                        >
                          {syncing ? 'מפעיל...' : 'הפעל רולאובר'}
                        </button>
                        <button
                          onClick={() => setIsEditMode((v) => !v)}
                          className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${isEditMode ? 'bg-orange-100 border-orange-300 text-orange-700' : 'border-gray-300 text-gray-500 hover:border-gray-400'}`}
                        >
                          {isEditMode ? 'סיום עריכה' : 'עריכת תבניות'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
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
                          canAddOneOff={canAddOneOff}
                          isEditMode={isEditMode}
                          onToggle={handleToggle}
                          onAdded={handleDayAdded}
                          onTemplatesChanged={() => fetchWeek(weekStart)}
                        />
                      );
                    })}
                  </div>
                </section>

                {(weekData.lists.length > 0 || isManager) && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-700">הזמנות שבועיות</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                      {weekData.lists.map((list) => (
                        <FloatingList
                          key={list.id}
                          list={list}
                          isManager={isManager}
                          canAddOneOff={canAddOneOff}
                          isEditMode={isEditMode}
                          isFuture={isFutureWeek}
                          weekStart={weekData.weekStart}
                          onToggle={handleToggle}
                          onAdded={handleListAdded}
                          onListDeleted={handleListDeleted}
                          onListRenamed={handleListRenamed}
                          onTemplatesChanged={() => fetchWeek(weekStart)}
                        />
                      ))}

                      {/* Add list card — manager only */}
                      {isManager && isEditMode && (
                        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center min-h-[8rem]">
                          <button
                            onClick={() => setShowNewListModal(true)}
                            className="flex flex-col items-center gap-2 text-gray-300 hover:text-indigo-400 transition-colors"
                          >
                            <span className="text-5xl font-light leading-none">+</span>
                            <span className="text-sm font-medium">הוסף רשימה</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {weekData.lists.length === 0 && !isManager && (
                  <div className="text-center text-gray-400 text-sm py-4">אין הזמנות שבועיות</div>
                )}
              </>
            )}
          </>
      </main>

      {showNewListModal && (
        <EditTemplatesModal
          mode={{ type: 'new-list' }}
          onClose={() => setShowNewListModal(false)}
          onListCreated={() => { setShowNewListModal(false); fetchWeek(weekStart); }}
        />
      )}
    </div>
  );
}
