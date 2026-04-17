import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../lib/roles';

export function NavBar() {
  const { user, logout } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const isWorker = user?.role === 'WORKER';
  const canSeeOrders = user?.role === 'MANAGER' || user?.role === 'ORDERS';

  const topLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-5 py-3 text-base font-medium border-b-2 transition-colors ${
      isActive
        ? 'border-indigo-600 text-indigo-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  const bottomLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors ${
      isActive ? 'text-indigo-600' : 'text-gray-400'
    }`;

  const badgeClass = isManager
    ? 'bg-indigo-100 text-indigo-700'
    : user?.role === 'ORDERS'
    ? 'bg-amber-100 text-amber-700'
    : '';

  return (
    <>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200" dir="rtl">
        <div className="px-8 flex items-center justify-between h-16">

          {/* Nav links — desktop only */}
          <div className="hidden md:flex items-center gap-1">
            <span className="font-bold text-indigo-700 text-xl tracking-tight px-3 border-l border-gray-200 ml-1">ניצת</span>
            {isWorker && (
              <NavLink to="/my-tasks" end className={topLinkClass}>
                המשימות שלי
              </NavLink>
            )}
            {canSeeOrders && (
              <NavLink to="/" end className={topLinkClass}>
                הזמנות
              </NavLink>
            )}
            {isManager && (
              <NavLink to="/tasks/status" className={topLinkClass}>
                מעקב משימות
              </NavLink>
            )}
            {isManager && (
              <NavLink to="/tasks" end className={topLinkClass}>
                ניהול משימות
              </NavLink>
            )}
            {isManager && (
              <NavLink to="/users" end className={topLinkClass}>
                ניהול עובדים
              </NavLink>
            )}
          </div>

          {/* Mobile: app name */}
          <div className="flex md:hidden">
            <span className="text-sm font-bold text-indigo-700">ניצת</span>
          </div>

          {/* User info & logout */}
          <div className="flex items-center gap-3">
            <span className="text-base text-gray-500">{user?.name}</span>
            {user && user.role !== 'WORKER' && (
              <span className={`hidden md:inline text-sm px-2.5 py-0.5 rounded-full ${badgeClass}`}>
                {ROLE_LABELS[user.role]}
              </span>
            )}
            <button onClick={logout} className="text-base text-gray-400 hover:text-gray-600">
              יציאה
            </button>
          </div>
        </div>
      </div>

      {/* Bottom tab bar — mobile only */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-50" dir="rtl">
        <div className="flex items-stretch">
          {isWorker && (
            <NavLink to="/my-tasks" end className={bottomLinkClass}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              משימות
            </NavLink>
          )}

          {canSeeOrders && (
            <NavLink to="/" end className={bottomLinkClass}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              הזמנות
            </NavLink>
          )}

          {isManager && (
            <NavLink to="/tasks/status" className={bottomLinkClass}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              מעקב
            </NavLink>
          )}

          {isManager && (
            <NavLink to="/tasks" end className={bottomLinkClass}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              ניהול
            </NavLink>
          )}

          {isManager && (
            <NavLink to="/users" end className={bottomLinkClass}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              עובדים
            </NavLink>
          )}
        </div>
      </nav>
    </>
  );
}
