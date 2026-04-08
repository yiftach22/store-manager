import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { JobRole, TaskTemplate } from '../types/tasks';
import { NavBar } from '../components/NavBar';
import { RoleCard } from '../components/RoleCard';

export function TasksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect non-managers
  useEffect(() => {
    if (user && user.role !== 'MANAGER') navigate('/', { replace: true });
  }, [user, navigate]);

  const [roles, setRoles] = useState<JobRole[]>([]);
  const [templates, setTemplates] = useState<Record<number, TaskTemplate[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const addRoleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAddRole) addRoleInputRef.current?.focus();
  }, [showAddRole]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rolesRes = await api.get<JobRole[]>('/api/roles');
      const fetchedRoles = rolesRes.data;
      setRoles(fetchedRoles);

      const templateResults = await Promise.all(
        fetchedRoles.map((r) =>
          api.get<TaskTemplate[]>(`/api/roles/${r.id}/templates`).then((res) => ({
            roleId: r.id,
            templates: res.data,
          }))
        )
      );

      const templateMap: Record<number, TaskTemplate[]> = {};
      for (const { roleId, templates: ts } of templateResults) {
        templateMap[roleId] = ts;
      }
      setTemplates(templateMap);
    } catch {
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleAddRole() {
    const name = newRoleName.trim();
    if (!name) return;
    await api.post('/api/roles', { name });
    setNewRoleName('');
    setShowAddRole(false);
    fetchAll();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      <NavBar />

      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">ניהול משימות</h1>
          <button
            onClick={() => setIsEditMode((v) => !v)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              isEditMode
                ? 'bg-orange-100 border-orange-300 text-orange-700'
                : 'border-gray-300 text-gray-500 hover:border-gray-400'
            }`}
          >
            {isEditMode ? 'סיום עריכה' : 'עריכת תפקידים'}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {loading && <div className="text-center text-gray-400 py-12">טוען...</div>}
        {error && <div className="text-center text-red-500 py-12">{error}</div>}

        {!loading && !error && (
          <>
            {/* Add role button (edit mode only) */}
            {isEditMode && (
              <div className="mb-4">
                {showAddRole ? (
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm max-w-sm">
                    <input
                      ref={addRoleInputRef}
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddRole();
                        if (e.key === 'Escape') setShowAddRole(false);
                      }}
                      placeholder="שם התפקיד"
                      className="flex-1 text-sm focus:outline-none"
                    />
                    <button
                      onClick={handleAddRole}
                      disabled={!newRoleName.trim()}
                      className="text-sm text-blue-500 hover:text-blue-700 disabled:opacity-30 font-medium"
                    >
                      הוסף
                    </button>
                    <button
                      onClick={() => setShowAddRole(false)}
                      className="text-sm text-gray-400 hover:text-gray-600"
                    >
                      ביטול
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddRole(true)}
                    className="text-sm text-blue-500 hover:text-blue-700 font-medium"
                  >
                    + הוסף תפקיד
                  </button>
                )}
              </div>
            )}

            {roles.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                אין תפקידים. {isEditMode ? 'הוסף תפקיד ראשון.' : 'הפעל עריכה כדי להוסיף.'}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  templates={templates[role.id] ?? []}
                  isEditMode={isEditMode}
                  onChanged={fetchAll}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
