import { useState } from 'react';
import type { ListData, OrderInstance } from '../types/orders';
import { OrderItem } from './OrderItem';
import { AddOrderModal } from './AddOrderModal';
import { EditTemplatesModal } from './EditTemplatesModal';

interface Props {
  list: ListData;
  isManager: boolean;
  canAddOneOff: boolean;
  isEditMode: boolean;
  isFuture: boolean;
  weekStart: string;  // 'YYYY-MM-DD' — used as the date for new one-off instances
  onToggle: (id: number) => void;
  onAdded: (listId: number, instance: OrderInstance) => void;
  onListDeleted: (listId: number) => void;
  onListRenamed: (listId: number, name: string) => void;
  onTemplatesChanged?: () => void;
}

export function FloatingList({ list, isManager, canAddOneOff, isEditMode, isFuture, weekStart, onToggle, onAdded, onListDeleted, onListRenamed, onTemplatesChanged }: Props) {
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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* List header */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
        <span className="flex-1 font-semibold text-gray-800 text-base">{displayName}</span>
        <span className="text-sm text-gray-400">{list.instances.filter(i => !i.status).length} פתוחים</span>
        {isManager && isEditMode && !showDeleteConfirm && (
          <>
            <button
              onClick={() => setShowEditModal(true)}
              className="text-sm text-indigo-500 hover:text-indigo-700"
            >
              ערוך
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-400 hover:text-red-600"
            >
              מחק
            </button>
          </>
        )}
        {isManager && isEditMode && showDeleteConfirm && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">בטוח?</span>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              ביטול
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm bg-red-500 text-white rounded px-2.5 py-1 hover:bg-red-600 disabled:opacity-50"
            >
              מחק
            </button>
          </div>
        )}
      </div>

      {/* Orders */}
      <ul className="flex-1 p-3 flex flex-col gap-1 min-h-10">
        {list.instances.length === 0 && (
          <li className="text-sm text-gray-400 px-2 py-2">אין פריטים</li>
        )}
        {list.instances.map((inst) => (
          <OrderItem key={inst.id} instance={inst} disabled={isFuture} isEditMode={isEditMode} onToggle={onToggle} />
        ))}
      </ul>

      {/* One-off add button — MANAGER or ORDERS, normal mode only */}
      {canAddOneOff && !isEditMode && (
        <button
          onClick={() => setShowModal(true)}
          className="w-full text-sm text-indigo-500 hover:text-indigo-700 px-5 py-2.5 text-right border-t border-gray-100"
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
