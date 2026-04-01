import { useState } from 'react';
import type { ListData, OrderInstance } from '../types/orders';
import { OrderItem } from './OrderItem';
import { AddOrderModal } from './AddOrderModal';
import { EditTemplatesModal } from './EditTemplatesModal';

interface Props {
  list: ListData;
  isManager: boolean;
  isEditMode: boolean;
  isFuture: boolean;
  weekStart: string;  // 'YYYY-MM-DD' — used as the date for new one-off instances
  onToggle: (id: number) => void;
  onAdded: (listId: number, instance: OrderInstance) => void;
  onListDeleted: (listId: number) => void;
  onListRenamed: (listId: number, name: string) => void;
  onTemplatesChanged?: () => void;
}

export function FloatingList({ list, isManager, isEditMode, isFuture, weekStart, onToggle, onAdded, onListDeleted, onListRenamed, onTemplatesChanged }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [displayName, setDisplayName] = useState(list.name);

  async function handleDelete() {
    setDeleting(true);
    try {
      const { api } = await import('../lib/api');
      await api.delete(`/api/orders/lists/${list.id}`);
      onListDeleted(list.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* List header */}
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <span className="flex-1 font-semibold text-gray-800 text-sm">{displayName}</span>
        <span className="text-xs text-gray-400">{list.instances.filter(i => !i.status).length} פתוחים</span>
        {isManager && isEditMode && !showDeleteConfirm && (
          <>
            <button
              onClick={() => setShowEditModal(true)}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              ערוך
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              מחק
            </button>
          </>
        )}
        {isManager && isEditMode && showDeleteConfirm && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-red-600">בטוח?</span>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ביטול
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs bg-red-500 text-white rounded px-2 py-0.5 hover:bg-red-600 disabled:opacity-50"
            >
              מחק
            </button>
          </div>
        )}
      </div>

      {/* Orders */}
      <ul className="p-2 flex flex-col gap-0.5 min-h-10">
        {list.instances.length === 0 && (
          <li className="text-xs text-gray-400 px-2 py-2">אין פריטים</li>
        )}
        {list.instances.map((inst) => (
          <OrderItem key={inst.id} instance={inst} disabled={isFuture} onToggle={onToggle} />
        ))}
      </ul>

      {/* Manager add button — only in normal mode */}
      {isManager && !isEditMode && (
        <button
          onClick={() => setShowModal(true)}
          className="w-full text-xs text-blue-500 hover:text-blue-700 px-4 py-2 text-right border-t border-gray-100"
        >
          + הוסף פריט לשבוע זה
        </button>
      )}

      {showModal && (
        <AddOrderModal
          date={weekStart}
          listId={list.id}
          onAdded={(inst) => onAdded(list.id, inst)}
          onClose={() => setShowModal(false)}
        />
      )}

      {showEditModal && (
        <EditTemplatesModal
          mode={{ type: 'list', listId: list.id, listName: displayName }}
          onClose={() => setShowEditModal(false)}
          onChanged={onTemplatesChanged}
          onListDeleted={(id) => { onListDeleted(id); }}
          onListRenamed={(id, name) => { setDisplayName(name); onListRenamed(id, name); }}
        />
      )}
    </div>
  );
}
