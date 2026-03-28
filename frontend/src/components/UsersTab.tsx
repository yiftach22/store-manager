import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'MANAGER' | 'WORKER';
  createdAt: string;
}

interface AllowedEmail {
  id: number;
  email: string;
  role: 'MANAGER' | 'WORKER';
  createdAt: string;
}

export function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [allowed, setAllowed] = useState<AllowedEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'WORKER' | 'MANAGER'>('WORKER');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const [u, a] = await Promise.all([
      api.get<User[]>('/api/users'),
      api.get<AllowedEmail[]>('/api/users/allowed-emails'),
    ]);
    setUsers(u.data);
    setAllowed(a.data);
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
        role: newRole,
      });
      setAllowed((prev) => [res.data, ...prev]);
      setNewEmail('');
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

  const registeredEmails = new Set(users.map((u) => u.email));

  return (
    <div className="flex flex-col gap-8" dir="rtl">

      {/* Allowed emails */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">אימיילים מאושרים להרשמה</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* Add form */}
          <form onSubmit={handleAdd} className="flex items-center gap-2 p-3 border-b border-gray-100">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="הכנס אימייל..."
              required
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'WORKER' | 'MANAGER')}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="WORKER">עובד</option>
              <option value="MANAGER">מנהל</option>
            </select>
            <button
              type="submit"
              disabled={adding}
              className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
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
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {a.role === 'MANAGER' ? 'מנהל' : 'עובד'}
                    </span>
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
        <h2 className="text-sm font-semibold text-gray-500 mb-3">משתמשים רשומים</h2>
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
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role === 'MANAGER' ? 'מנהל' : 'עובד'}
                  </span>
                  <span className="text-xs text-gray-400">
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
