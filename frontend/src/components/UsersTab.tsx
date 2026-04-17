import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, type Role } from '../lib/roles';
import type { JobRole } from '../types/tasks';

interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  jobRole: { id: number; name: string } | null;
}

interface AllowedEmail {
  id: number;
  email: string;
  role: Role;
  jobRole: { id: number; name: string } | null;
  createdAt: string;
}

// Tailwind class lookup for auth-role pills. Amber for ORDERS keeps it visually
// distinct from MANAGER (indigo) and the neutral WORKER pill.
const ROLE_PILL_CLASS: Record<Role, string> = {
  MANAGER: 'bg-indigo-100 text-indigo-700',
  ORDERS: 'bg-amber-100 text-amber-700',
  WORKER: 'bg-gray-100 text-gray-600',
};

export function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [allowed, setAllowed] = useState<AllowedEmail[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newAuthRole, setNewAuthRole] = useState<Role>('WORKER');
  const [newJobRoleId, setNewJobRoleId] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [resetError, setResetError] = useState('');

  async function load() {
    const [u, a, r] = await Promise.all([
      api.get<User[]>('/api/users'),
      api.get<AllowedEmail[]>('/api/users/allowed-emails'),
      api.get<JobRole[]>('/api/roles'),
    ]);
    setUsers(u.data);
    setAllowed(a.data);
    setRoles(r.data.filter((r) => r.isActive));
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    setError('');
    try {
      // jobRoleId only applies to WORKER — backend enforces this too, but we
      // strip it client-side so the payload reflects the UI state.
      const res = await api.post<AllowedEmail>('/api/users/allowed-emails', {
        email: newEmail.trim(),
        role: newAuthRole,
        jobRoleId: newAuthRole === 'WORKER' && newJobRoleId ? parseInt(newJobRoleId, 10) : null,
      });
      setAllowed((prev) => [res.data, ...prev]);
      setNewEmail('');
      setNewAuthRole('WORKER');
      setNewJobRoleId('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'שגיאה בהוספת אימייל');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: number) {
    await api.delete(`/api/users/allowed-emails/${id}`);
    setAllowed((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleJobRoleChange(userId: number, value: string) {
    const roleId = value === '' ? null : parseInt(value, 10);
    await api.patch(`/api/users/${userId}/role`, { roleId });
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const matched = roles.find((r) => r.id === roleId) ?? null;
        return { ...u, jobRole: matched ? { id: matched.id, name: matched.name } : null };
      })
    );
  }

  async function handleAuthRoleChange(userId: number, role: Role) {
    await api.patch(`/api/users/${userId}/auth-role`, { role });
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        // Non-WORKER auth roles drop the job role (backend enforces + we mirror locally).
        return { ...u, role, jobRole: role === 'WORKER' ? u.jobRole : null };
      })
    );
  }

  function openResetModal(user: User) {
    setResettingUser(user);
    setNewPassword('');
    setResetStatus('idle');
    setResetError('');
  }

  function closeResetModal() {
    setResettingUser(null);
    setNewPassword('');
    setResetStatus('idle');
    setResetError('');
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resettingUser) return;
    if (newPassword.length < 6) {
      setResetError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    setResetStatus('saving');
    setResetError('');
    try {
      await api.patch(`/api/users/${resettingUser.id}/password`, { newPassword });
      setResetStatus('done');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setResetError(msg ?? 'שגיאה באיפוס הסיסמה');
      setResetStatus('error');
    }
  }

  const registeredEmails = new Set(users.map((u) => u.email));

  return (
    <div className="flex flex-col gap-8" dir="rtl">

      {/* Allowed emails */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">אימיילים מאושרים להרשמה</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* Add form */}
          <form onSubmit={handleAdd} className="flex items-center gap-2 p-4 border-b border-gray-100">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="הכנס אימייל..."
              required
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={newAuthRole}
              onChange={(e) => setNewAuthRole(e.target.value as Role)}
              className="border border-gray-300 rounded-lg px-2.5 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="WORKER">{ROLE_LABELS.WORKER}</option>
              <option value="ORDERS">{ROLE_LABELS.ORDERS}</option>
              <option value="MANAGER">{ROLE_LABELS.MANAGER}</option>
            </select>
            {/* Job-role dropdown only makes sense for WORKERs */}
            {newAuthRole === 'WORKER' && (
              <select
                value={newJobRoleId}
                onChange={(e) => setNewJobRoleId(e.target.value)}
                className="border border-gray-300 rounded-lg px-2.5 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">ללא תפקיד</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}
            <button
              type="submit"
              disabled={adding}
              className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-base font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              הוסף
            </button>
          </form>
          {error && <p className="text-red-500 text-sm px-4 py-1">{error}</p>}

          {allowed.length === 0 ? (
            <p className="text-base text-gray-400 px-4 py-3">אין אימיילים מאושרים</p>
          ) : (
            <ul>
              {allowed.map((a) => {
                const isUsed = registeredEmails.has(a.email);
                return (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0">
                    <span className="flex-1 text-base text-gray-800">{a.email}</span>
                    <span className={`text-sm px-2.5 py-0.5 rounded-full ${ROLE_PILL_CLASS[a.role]}`}>
                      {ROLE_LABELS[a.role]}
                    </span>
                    {a.jobRole && (
                      <span className="text-sm px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {a.jobRole.name}
                      </span>
                    )}
                    {isUsed && (
                      <span className="text-sm bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full">רשום</span>
                    )}
                    <button
                      onClick={() => handleRemove(a.id)}
                      className="text-sm text-red-400 hover:text-red-600"
                    >
                      הסר
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Password reset modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl" onClick={closeResetModal}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 mb-1">איפוס סיסמה</h3>
            <p className="text-xs text-gray-500 mb-4 truncate">{resettingUser.name} — {resettingUser.email}</p>

            {resetStatus === 'done' ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-green-800 mb-1">הסיסמה אופסה בהצלחה</p>
                  <p className="text-xs text-green-700">מסור את הסיסמה החדשה למשתמש:</p>
                  <p className="font-mono text-sm bg-white border border-green-200 rounded px-2 py-1 mt-2 text-gray-800 select-all">
                    {newPassword}
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    סגור
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">סיסמה חדשה (לפחות 6 תווים)</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                    minLength={6}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {resetError && <p className="text-red-500 text-xs">{resetError}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    disabled={resetStatus === 'saving'}
                    className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {resetStatus === 'saving' ? 'מאפס...' : 'אפס סיסמה'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Registered users */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">משתמשים רשומים</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {users.length === 0 ? (
            <p className="text-base text-gray-400 px-4 py-3">אין משתמשים</p>
          ) : (
            <ul>
              {users.map((u) => {
                const isSelf = currentUser?.id === u.id;
                return (
                <li key={u.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-gray-800 truncate">{u.name}</p>
                    <p className="text-sm text-gray-400 truncate">{u.email}</p>
                  </div>
                  <span className={`text-sm px-2.5 py-0.5 rounded-full shrink-0 ${ROLE_PILL_CLASS[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                  {/* Job role is only meaningful for WORKERs — hide the picker
                      for MANAGER / ORDERS to avoid confusing "no effect" UI. */}
                  {u.role === 'WORKER' && (
                    <select
                      value={u.jobRole?.id ?? ''}
                      onChange={(e) => handleJobRoleChange(u.id, e.target.value)}
                      className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
                    >
                      <option value="">ללא תפקיד</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  )}
                  {/* Auth-role picker — disabled for the logged-in manager so they
                      can't demote themselves. Backend also rejects self-changes. */}
                  <select
                    value={u.role}
                    onChange={(e) => handleAuthRoleChange(u.id, e.target.value as Role)}
                    disabled={isSelf}
                    title={isSelf ? 'לא ניתן לשנות את התפקיד של עצמך' : undefined}
                    className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    <option value="WORKER">{ROLE_LABELS.WORKER}</option>
                    <option value="ORDERS">{ROLE_LABELS.ORDERS}</option>
                    <option value="MANAGER">{ROLE_LABELS.MANAGER}</option>
                  </select>
                  <button
                    onClick={() => openResetModal(u)}
                    className="text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600 shrink-0 transition-colors"
                  >
                    איפוס סיסמה
                  </button>
                  <span className="text-sm text-gray-400 shrink-0">
                    {new Date(u.createdAt).toLocaleDateString('he-IL')}
                  </span>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

    </div>
  );
}
