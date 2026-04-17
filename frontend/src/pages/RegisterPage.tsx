import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { homePathFor } from '../lib/roles';

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password }).catch(err => {
        const status = err.response?.status;
        const msg = err.response?.data?.error;
        setError(
          status === 403 ? 'האימייל אינו מורשה להרשמה. פנה למנהל.'
          : status === 409 ? 'כתובת אימייל זו כבר רשומה'
          : msg ?? 'שגיאה בהרשמה'
        );
        return null;
      });
      if (!res) return;
      // Log in with the new account
      const role = await login(email, password);
      navigate(homePathFor(role));
    } catch {
      setError('שגיאה בהרשמה');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-100 flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="text-3xl font-bold text-indigo-700 tracking-tight mb-1">ניצת</p>
          <p className="text-sm text-gray-500">הרשמה למערכת</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white rounded-lg py-2 font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'נרשם...' : 'הרשמה'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          כבר רשום?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">כניסה</Link>
        </p>
      </div>
    </div>
  );
}
