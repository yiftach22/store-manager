import { useState } from 'react';
import type { ListData, OrderInstance } from '../types/orders';
import { OrderItem } from './OrderItem';
import { AddOrderModal } from './AddOrderModal';

interface Props {
  list: ListData;
  isManager: boolean;
  weekStart: string;  // 'YYYY-MM-DD' — used as the date for new one-off instances
  onToggle: (id: number) => void;
  onAdded: (listId: number, instance: OrderInstance) => void;
}

export function FloatingList({ list, isManager, weekStart, onToggle, onAdded }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* List header */}
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">{list.name}</span>
        <span className="text-xs text-gray-400">{list.instances.filter(i => !i.status).length} פתוחים</span>
      </div>

      {/* Orders */}
      <ul className="p-2 flex flex-col gap-0.5 min-h-10">
        {list.instances.length === 0 && (
          <li className="text-xs text-gray-400 px-2 py-2">אין פריטים</li>
        )}
        {list.instances.map((inst) => (
          <OrderItem key={inst.id} instance={inst} onToggle={onToggle} />
        ))}
      </ul>

      {/* Manager add button */}
      {isManager && (
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
    </div>
  );
}
