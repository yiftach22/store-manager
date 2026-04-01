import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import type { OrderTemplate, OrderList } from '../types/orders';

type ModalMode =
  | { type: 'day'; dayOfWeek: number; label: string }
  | { type: 'list'; listId: number; listName: string }
  | { type: 'new-list' };

interface Props {
  mode: ModalMode;
  onClose: () => void;
  onChanged?: () => void;
  onListDeleted?: (listId: number) => void;
  onListCreated?: () => void;
  onListRenamed?: (listId: number, name: string) => void;
}

export function EditTemplatesModal({ mode, onClose, onChanged, onListDeleted, onListCreated, onListRenamed }: Props) {
  const [templates, setTemplates] = useState<OrderTemplate[]>([]);
  const [loading, setLoading] = useState(mode.type !== 'new-list');

  // For new-list and list rename
  const [listName, setListName] = useState(mode.type === 'list' ? mode.listName : '');
  const [renaming, setRenaming] = useState(false);

  // Add item form
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // New-list submit
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Pending items for new-list mode (not yet saved)
  const [pendingItems, setPendingItems] = useState<string[]>([]);
  const [pendingInput, setPendingInput] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode.type === 'new-list') return;
    setLoading(true);
    api.get<OrderTemplate[]>('/api/orders/templates').then((res) => {
      const filtered = mode.type === 'day'
        ? res.data.filter((t) => t.dayOfWeek === mode.dayOfWeek && t.listId === null)
        : res.data.filter((t) => t.listId === mode.listId);
      setTemplates(filtered);
      setLoading(false);
    });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleToggle(id: number) {
    const res = await api.patch<OrderTemplate>(`/api/orders/templates/${id}/toggle`);
    setTemplates((prev) => prev.map((t) => (t.id === id ? res.data : t)));
    onChanged?.();
  }

  async function handleAddToExisting() {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const body = mode.type === 'day'
        ? { title: newTitle.trim(), dayOfWeek: mode.dayOfWeek, category: 'daily' }
        : { title: newTitle.trim(), category: 'floating', listId: (mode as { type: 'list'; listId: number }).listId };
      const res = await api.post<OrderTemplate>('/api/orders/templates', body);
      setTemplates((prev) => [...prev, res.data]);
      setNewTitle('');
      inputRef.current?.focus();
      onChanged?.();
    } finally {
      setAdding(false);
    }
  }

  async function handleRename() {
    if (mode.type !== 'list' || !listName.trim()) return;
    setRenaming(true);
    try {
      await api.patch<OrderList>(`/api/orders/lists/${mode.listId}`, { name: listName.trim() });
      onListRenamed?.(mode.listId, listName.trim());
    } finally {
      setRenaming(false);
    }
  }

  async function handleDeleteList() {
    if (mode.type !== 'list') return;
    setDeleting(true);
    await api.delete(`/api/orders/lists/${mode.listId}`);
    onListDeleted?.(mode.listId);
    onClose();
  }

  async function handleCreateList() {
    if (mode.type !== 'new-list' || !listName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const listRes = await api.post<OrderList>('/api/orders/lists', { name: listName.trim() });
      const listId = listRes.data.id;
      for (const title of pendingItems) {
        await api.post('/api/orders/templates', { title, category: 'floating', listId });
      }
      onListCreated?.();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setCreateError(msg ?? 'שגיאה ביצירת הרשימה');
    } finally {
      setCreating(false);
    }
  }

  function addPendingItem() {
    if (!pendingInput.trim()) return;
    setPendingItems((prev) => [...prev, pendingInput.trim()]);
    setPendingInput('');
  }

  function removePendingItem(i: number) {
    setPendingItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  const title =
    mode.type === 'day' ? `יום ${mode.label}` :
    mode.type === 'list' ? mode.listName :
    'רשימה חדשה';

  const activeTemplates = templates.filter((t) => t.isActive);
  const inactiveTemplates = templates.filter((t) => !t.isActive);

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" dir="rtl">

        {/* Warning banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 rounded-t-2xl">
          <p className="text-xs text-amber-700 font-medium">⚠️ שינויים בתבניות ישפיעו על שבועות עתידיים</p>
        </div>

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          {mode.type === 'day' && (
            <h2 className="flex-1 font-bold text-gray-800">{title}</h2>
          )}

          {mode.type === 'list' && (
            <>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleRename}
                disabled={renaming || listName.trim() === mode.listName}
                className="text-xs bg-gray-100 hover:bg-gray-200 rounded-lg px-2.5 py-1 disabled:opacity-40"
              >
                שמור שם
              </button>
            </>
          )}

          {mode.type === 'new-list' && (
            <>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="שם הרשימה..."
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </>
          )}

          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1">×</button>
        </div>

        {/* Template list — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {loading && <p className="text-sm text-gray-400 px-4 py-4 text-center">טוען...</p>}

          {/* New-list pending items */}
          {mode.type === 'new-list' && pendingItems.length > 0 && (
            <ul>
              {pendingItems.map((item, i) => (
                <li key={i} className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50">
                  <span className="flex-1 text-sm text-gray-800">{item}</span>
                  <button
                    onClick={() => removePendingItem(i)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    הסר
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Active templates */}
          {activeTemplates.length > 0 && (
            <ul>
              {activeTemplates.map((t) => (
                <li key={t.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50">
                  <span className="flex-1 text-sm text-gray-800">{t.title}</span>
                  <button
                    onClick={() => handleToggle(t.id)}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    כבה
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Inactive templates */}
          {inactiveTemplates.length > 0 && (
            <>
              <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                <span className="text-xs text-gray-400">כבויים</span>
              </div>
              <ul>
                {inactiveTemplates.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50">
                    <span className="flex-1 text-sm text-gray-400 line-through">{t.title}</span>
                    <button
                      onClick={() => handleToggle(t.id)}
                      className="text-xs text-blue-400 hover:text-blue-600"
                    >
                      הפעל
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!loading && activeTemplates.length === 0 && inactiveTemplates.length === 0 && mode.type !== 'new-list' && (
            <p className="text-sm text-gray-400 px-4 py-4 text-center">אין פריטים</p>
          )}

          {/* Add item form */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={mode.type === 'new-list' ? pendingInput : newTitle}
              onChange={(e) => mode.type === 'new-list' ? setPendingInput(e.target.value) : setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  mode.type === 'new-list' ? addPendingItem() : handleAddToExisting();
                }
              }}
              placeholder="הוסף פריט..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={mode.type === 'new-list' ? addPendingItem : handleAddToExisting}
              disabled={adding}
              className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              הוסף
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
          {/* New list: create button */}
          {mode.type === 'new-list' && (
            <>
              {createError && <p className="text-xs text-red-500 flex-1">{createError}</p>}
              {!createError && <span className="flex-1" />}
              <button
                onClick={handleCreateList}
                disabled={creating || !listName.trim()}
                className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'יוצר...' : 'צור רשימה'}
              </button>
            </>
          )}

          {/* List mode: delete */}
          {mode.type === 'list' && (
            <>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  מחק רשימה
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-red-600 flex-1">בטוח? פעולה זו תמחק את הרשימה</span>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleDeleteList}
                    disabled={deleting}
                    className="text-xs bg-red-500 text-white rounded-lg px-3 py-1.5 hover:bg-red-600 disabled:opacity-50"
                  >
                    מחק
                  </button>
                </div>
              )}
              <span className="flex-1" />
            </>
          )}

          {mode.type === 'day' && <span className="flex-1" />}

          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">סגור</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
