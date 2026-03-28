import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import type { OrderInstance } from '../types/orders';

interface Props {
  /** date string 'YYYY-MM-DD' — used as the instance date */
  date: string;
  /** if set, creates a floating instance for this list */
  listId?: number;
  onAdded: (instance: OrderInstance) => void;
  onClose: () => void;
}

export function AddOrderModal({ date, listId, onAdded, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post<OrderInstance>('/api/orders/instances', {
        title: title.trim(),
        date,
        listId: listId ?? null,
      });
      onAdded(res.data);
      onClose();
    } catch {
      setError('שגיאה ביצירת הפריט');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" dir="rtl" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">הוספת פריט חד-פעמי</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            placeholder="שם הפריט"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              ביטול
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              הוסף
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
