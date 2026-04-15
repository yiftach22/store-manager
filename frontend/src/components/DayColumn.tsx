import { useState } from 'react';
import type { DayData, OrderInstance } from '../types/orders';
import { OrderItem } from './OrderItem';
import { AddOrderModal } from './AddOrderModal';
import { EditTemplatesModal } from './EditTemplatesModal';

interface Props {
  day: DayData;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isManager: boolean;
  isEditMode: boolean;
  onToggle: (id: number) => void;
  onAdded: (date: string, instance: OrderInstance) => void;
  onTemplatesChanged?: () => void;
}

export function DayColumn({ day, isToday, isPast, isFuture, isManager, isEditMode, onToggle, onAdded, onTemplatesChanged }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const headerClass = isToday
    ? 'bg-blue-600 text-white'
    : isPast
    ? 'bg-gray-100 text-gray-400'
    : 'bg-gray-50 text-gray-700';

  return (
    <div className={`relative flex flex-col rounded-xl border overflow-hidden min-w-0 ${isToday ? 'border-blue-300 bg-blue-50' : isPast ? 'border-gray-100' : 'border-gray-200'}`}>

      {/* Faded wrapper for past days — opacity only, no pointer-events-none so items stay clickable */}
      <div className={isPast ? 'opacity-70' : ''}>
        {/* Day header */}
        <div className={`px-3 py-2 text-center font-semibold text-sm ${headerClass}`}>
          <div>{day.label}</div>
          <div className={`text-xs font-normal ${isToday ? 'text-blue-100' : 'text-gray-400'}`}>
            {day.date.slice(5).split('-').reverse().join('/')}
          </div>
        </div>

        {/* Orders list */}
        <ul className="flex-1 p-2 flex flex-col gap-0.5 min-h-16">
          {day.instances.map((inst) => (
            <OrderItem
              key={inst.id}
              instance={inst}
              disabled={isFuture}
              onToggle={onToggle}
            />
          ))}
        </ul>

        {/* Manager add button — only in normal mode, non-past */}
        {isManager && !isPast && !isEditMode && (
          <button
            onClick={() => setShowModal(true)}
            className="text-xs text-blue-500 hover:text-blue-700 px-3 py-1.5 text-right border-t border-gray-100"
          >
            + הוסף פריט
          </button>
        )}
      </div>

      {/* Edit button — outside faded wrapper, always full opacity */}
      {isManager && isEditMode && (
        <button
          onClick={() => setShowEditModal(true)}
          title="ערוך תבניות"
          className={`absolute top-1 left-1 text-xs opacity-60 hover:opacity-100 leading-none px-1 py-0.5 rounded ${isToday ? 'text-white hover:bg-blue-500' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          ✎
        </button>
      )}

      {showModal && (
        <AddOrderModal
          date={day.date}
          onAdded={(inst) => onAdded(day.date, inst)}
          onClose={() => setShowModal(false)}
        />
      )}

      {showEditModal && (
        <EditTemplatesModal
          mode={{ type: 'day', dayOfWeek: day.dayOfWeek, label: day.label }}
          onClose={() => setShowEditModal(false)}
          onChanged={onTemplatesChanged}
        />
      )}
    </div>
  );
}
