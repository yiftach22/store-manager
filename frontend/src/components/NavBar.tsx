import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function NavBar() {
  const { user, logout } = useAuth();
  const isManager = user?.role === 'MANAGER';

  return (
    <div className="bg-white border-b border-gray-200" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-12">
        <div className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`
            }
          >
            הזמנות
          </NavLink>
          {isManager && (
            <NavLink
              to="/tasks"
              end
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`
              }
            >
              ניהול משימות
            </NavLink>
          )}
          {isManager && (
            <NavLink
              to="/tasks/status"
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`
              }
            >
              מעקב משימות
            </NavLink>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user?.name}</span>
          {isManager && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">מנהל</span>
          )}
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600">
            יציאה
          </button>
        </div>
      </div>
    </div>
  );
}
