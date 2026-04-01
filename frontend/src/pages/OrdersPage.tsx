import { useCallback, useEffect, useState } from 'react';
import { startOfWeek, addWeeks, subWeeks, format, isSameDay, isBefore, isAfter, startOfDay } from 'date-fns';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { WeekData, OrderInstance } from '../types/orders';
import { WeekNav } from '../components/WeekNav';
import { DayColumn } from '../components/DayColumn';
import { FloatingList } from '../components/FloatingList';
import { UsersTab } from '../components/UsersTab';
import { EditTemplatesModal } from '../components/EditTemplatesModal';

function getSundayOfWeek(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 0 });
}

type Tab = 'orders' | 'users';

export function OrdersPage() {
  const { user, logout } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const [activeTab, setActiveTab] = useState<Tab>('orders');

  const [weekStart, setWeekStart] = useState<Date>(() => getSundayOfWeek(new Date()));
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Top bar */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">ניצת</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.name}</span>
            {isManager && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">מנהל</span>}
            <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600">יציאה</button>
          </div>
        </div>

        {/* Tab bar — manager only */}
        {isManager && (
          <div className="flex border-b border-gray-200 px-4">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'orders' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              הזמנות
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              ניהול עובדים
            </button>
          </div>
        )}

        {activeTab === 'orders' && (
          <WeekNav
            weekStart={weekStart}
            onPrev={() => setWeekStart((w) => subWeeks(w, 1))}
            onNext={() => setWeekStart((w) => addWeeks(w, 1))}
          />
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex flex-col gap-8">

        {/* ── Users management tab ── */}
        {activeTab === 'users' && <UsersTab />}

        {/* ── Orders tab ── */}
        {activeTab === 'orders' && (
          <>
            {loading && <div className="text-center text-gray-400 py-12">טוען...</div>}
            {error && <div className="text-center text-red-500 py-12">{error}</div>}

            {weekData && !loading && (
              <>
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-500">הזמנות יומיות</h2>
                    {isManager && (
                      <button
                        onClick={() => setIsEditMode((v) => !v)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${isEditMode ? 'bg-orange-100 border-orange-300 text-orange-700' : 'border-gray-300 text-gray-500 hover:border-gray-400'}`}
                      >
                        {isEditMode ? 'סיום עריכה' : 'עריכת תבניות'}
                      </button>
                    )}
                  </div>
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
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold text-gray-500">רשימות שבועיות</h2>
                      {isManager && isEditMode && (
                        <button
                          onClick={() => setShowNewListModal(true)}
                          className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                        >
                          + הוסף רשימה
                        </button>
                      )}
                    </div>
                    {weekData.lists.length === 0 && (
                      <div className="text-center text-gray-400 text-sm py-4">אין רשימות שבועיות</div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {weekData.lists.map((list) => (
                        <FloatingList
                          key={list.id}
                          list={list}
                          isManager={isManager}
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
                    </div>
                  </section>
                )}

                {weekData.lists.length === 0 && !isManager && (
                  <div className="text-center text-gray-400 text-sm py-4">אין רשימות שבועיות</div>
                )}
              </>
            )}
          </>
        )}
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
