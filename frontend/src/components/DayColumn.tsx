import { useState } from 'react';
import type { DayData, OrderInstance } from '../types/orders';
import { OrderItem } from './OrderItem';
import { AddOrderModal } from './AddOrderModal';

interface Props {
  day: DayData;
  isToday: boolean;
  isPast: boolean;
  isManager: boolean;
  onToggle: (id: number) => void;
  onAdded: (date: string, instance: OrderInstance) => void;
}

export function DayColumn({ day, isToday, isPast, isManager, onToggle, onAdded }: Props) {
  const [showModal, setShowModal] = useState(false);

  const headerClass = isToday
    ? 'bg-blue-600 text-white'
    : isPast
    ? 'bg-gray-100 text-gray-400'
    : 'bg-gray-50 text-gray-700';

  return (
    <div className={`flex flex-col rounded-xl border ${isPast ? 'border-gray-100 opacity-70' : 'border-gray-200'} overflow-hidden min-w-0`}>
      {/* Day header */}
      <div className={`px-3 py-2 text-center font-semibold text-sm ${headerClass}`}>
        <div>{day.label}</div>
        <div className={`text-xs font-normal ${isToday ? 'text-blue-100' : 'text-gray-400'}`}>
          {day.date.slice(5).replace('-', '/')}
        </div>
      </div>

      {/* Orders list */}
      <ul className={`flex-1 p-2 flex flex-col gap-0.5 min-h-16 ${isPast ? 'pointer-events-none' : ''}`}>
        {day.instances.map((inst) => (
          <OrderItem
            key={inst.id}
            instance={inst}
            disabled={isPast}
            onToggle={onToggle}
          />
        ))}
      </ul>

      {/* Manager add button */}
      {isManager && !isPast && (
        <button
          onClick={() => setShowModal(true)}
          className="text-xs text-blue-500 hover:text-blue-700 px-3 py-1.5 text-right border-t border-gray-100"
        >
          + הוסף פריט
        </button>
      )}

      {showModal && (
        <AddOrderModal
          date={day.date}
          onAdded={(inst) => onAdded(day.date, inst)}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
