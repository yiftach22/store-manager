import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { JobRole, TaskTemplate } from '../types/tasks';
import { NavBar } from '../components/NavBar';
import { RoleCard } from '../components/RoleCard';

let _rolesCache: JobRole[] | null = null;
let _templatesCache: Record<number, TaskTemplate[]> | null = null;

export function TasksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect non-managers
  useEffect(() => {
    if (user && user.role !== 'MANAGER') navigate('/', { replace: true });
  }, [user, navigate]);

  const [roles, setRoles] = useState<JobRole[]>(_rolesCache ?? []);
  const [templates, setTemplates] = useState<Record<number, TaskTemplate[]>>(_templatesCache ?? {});
  const [loading, setLoading] = useState(!_rolesCache);
  const [error, setError] = useState('');
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const addRoleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAddRole) addRoleInputRef.current?.focus();
  }, [showAddRole]);

  const fetchAll = useCallback(async () => {
    if (!_rolesCache) setLoading(true);
    setError('');
    try {
      const res = await api.get<(JobRole & { templates: TaskTemplate[] })[]>('/api/roles/with-templates');
      const fetchedRoles = res.data.map(({ templates: _, ...r }) => r);
      const templateMap: Record<number, TaskTemplate[]> = {};
      for (const r of res.data) templateMap[r.id] = r.templates;

      setRoles(fetchedRoles);
      setTemplates(templateMap);
      _rolesCache = fetchedRoles;
      _templatesCache = templateMap;
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
        <div className="max-w-6xl mx-auto px-6 py-5">
          <h1 className="text-xl font-bold text-gray-800">ניהול משימות</h1>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 pb-24 md:pb-8">
        {loading && <div className="text-center text-gray-400 py-12">טוען...</div>}
        {error && <div className="text-center text-red-500 py-12">{error}</div>}

        {(!loading || roles.length > 0) && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  templates={templates[role.id] ?? []}
                  isEditMode={true}
                  onChanged={fetchAll}
                />
              ))}

              {/* Add role card */}
              <div className="bg-white rounded-xl shadow-md border-2 border-dashed border-gray-200 p-5 min-h-[8rem] flex flex-col items-center justify-center">
                {showAddRole ? (
                  <div className="w-full flex flex-col gap-3">
                    <input
                      ref={addRoleInputRef}
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddRole();
                        if (e.key === 'Escape') { setShowAddRole(false); setNewRoleName(''); }
                      }}
                      placeholder="שם התפקיד"
                      className="w-full text-base border-b border-indigo-400 focus:outline-none pb-1"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={handleAddRole}
                        disabled={!newRoleName.trim()}
                        className="text-sm text-indigo-500 hover:text-indigo-700 disabled:opacity-30 font-medium"
                      >
                        הוסף
                      </button>
                      <button
                        onClick={() => { setShowAddRole(false); setNewRoleName(''); }}
                        className="text-sm text-gray-400 hover:text-gray-600"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddRole(true)}
                    className="flex flex-col items-center gap-2 text-gray-300 hover:text-indigo-400 transition-colors"
                  >
                    <span className="text-5xl font-light leading-none">+</span>
                    <span className="text-sm font-medium">הוסף תפקיד</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
