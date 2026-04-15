import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { JobRole } from '../types/tasks';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'MANAGER' | 'WORKER';
  createdAt: string;
  jobRole: { id: number; name: string } | null;
}

interface AllowedEmail {
  id: number;
  email: string;
  role: 'MANAGER' | 'WORKER';
  jobRole: { id: number; name: string } | null;
  createdAt: string;
}

export function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [allowed, setAllowed] = useState<AllowedEmail[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newJobRoleId, setNewJobRoleId] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

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
      const res = await api.post<AllowedEmail>('/api/users/allowed-emails', {
        email: newEmail.trim(),
        jobRoleId: newJobRoleId ? parseInt(newJobRoleId, 10) : null,
      });
      setAllowed((prev) => [res.data, ...prev]);
      setNewEmail('');
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

  async function handleAuthRoleToggle(userId: number, currentRole: 'MANAGER' | 'WORKER') {
    const newRole = currentRole === 'MANAGER' ? 'WORKER' : 'MANAGER';
    await api.patch(`/api/users/${userId}/auth-role`, { role: newRole });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
  }

  const registeredEmails = new Set(users.map((u) => u.email));

  return (
    <div className="flex flex-col gap-8" dir="rtl">

      {/* Allowed emails */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">אימיילים מאושרים להרשמה</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* Add form */}
          <form onSubmit={handleAdd} className="flex items-center gap-2 p-3 border-b border-gray-100">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="הכנס אימייל..."
              required
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={newJobRoleId}
              onChange={(e) => setNewJobRoleId(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">ללא תפקיד</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={adding}
              className="bg-indigo-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              הוסף
            </button>
          </form>
          {error && <p className="text-red-500 text-xs px-3 py-1">{error}</p>}

          {allowed.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-3">אין אימיילים מאושרים</p>
          ) : (
            <ul>
              {allowed.map((a) => {
                const isUsed = registeredEmails.has(a.email);
                return (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
                    <span className="flex-1 text-sm text-gray-800">{a.email}</span>
                    {a.jobRole && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {a.jobRole.name}
                      </span>
                    )}
                    {isUsed && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">רשום</span>
                    )}
                    <button
                      onClick={() => handleRemove(a.id)}
                      className="text-xs text-red-400 hover:text-red-600"
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

      {/* Registered users */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">משתמשים רשומים</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {users.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-3">אין משתמשים</p>
          ) : (
            <ul>
              {users.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${u.role === 'MANAGER' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role === 'MANAGER' ? 'מנהל' : 'עובד'}
                  </span>
                  <select
                    value={u.jobRole?.id ?? ''}
                    onChange={(e) => handleJobRoleChange(u.id, e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
                  >
                    <option value="">ללא תפקיד</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAuthRoleToggle(u.id, u.role)}
                    className={`text-xs px-2 py-1 rounded-lg border shrink-0 transition-colors ${
                      u.role === 'MANAGER'
                        ? 'border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200'
                        : 'border-indigo-200 text-indigo-500 hover:bg-indigo-50'
                    }`}
                  >
                    {u.role === 'MANAGER' ? 'הסר מנהל' : 'הענק מנהל'}
                  </button>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(u.createdAt).toLocaleDateString('he-IL')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

    </div>
  );
}
