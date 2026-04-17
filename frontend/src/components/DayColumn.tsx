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
  canAddOneOff: boolean;
  isEditMode: boolean;
  onToggle: (id: number) => void;
  onAdded: (date: string, instance: OrderInstance) => void;
  onTemplatesChanged?: () => void;
}

export function DayColumn({ day, isToday, isPast, isFuture, isManager, canAddOneOff, isEditMode, onToggle, onAdded, onTemplatesChanged }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const headerClass = isToday
    ? 'bg-indigo-600 text-white'
    : isPast
    ? 'bg-gray-100 text-gray-400'
    : 'bg-gray-50 text-gray-700';

  return (
    <div className={`relative flex flex-col h-full rounded-xl border shadow-sm overflow-hidden min-w-0 ${isToday ? 'border-indigo-300 bg-indigo-50' : isPast ? 'border-gray-100' : 'border-gray-200'}`}>

      {/* Faded wrapper for past days — opacity only, no pointer-events-none so items stay clickable */}
      <div className={`flex flex-col flex-1${isPast ? ' opacity-70' : ''}`}>
        {/* Day header */}
        <div className={`px-4 py-3 text-center font-semibold text-base ${headerClass}`}>
          <div>{day.label}</div>
          <div className={`text-sm font-normal ${isToday ? 'text-indigo-100' : 'text-gray-400'}`}>
            {day.date.slice(5).split('-').reverse().join('/')}
          </div>
        </div>

        {/* Orders list */}
        <ul className="flex-1 p-3 flex flex-col gap-1 min-h-16">
          {day.instances.map((inst) => (
            <OrderItem
              key={inst.id}
              instance={inst}
              disabled={isFuture}
              isEditMode={isEditMode}
              onToggle={onToggle}
            />
          ))}
        </ul>

        {/* One-off add button — MANAGER or ORDERS, normal mode only.
            Past-day gate was dropped: ORDERS users may backfill historical days. */}
        {canAddOneOff && !isEditMode && (
          <button
            onClick={() => setShowModal(true)}
            className="text-sm text-indigo-500 hover:text-indigo-700 px-4 py-2 text-right border-t border-gray-100"
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
          className={`absolute top-1 left-1 text-sm opacity-60 hover:opacity-100 leading-none px-1.5 py-1 rounded ${isToday ? 'text-white hover:bg-indigo-500' : 'text-gray-500 hover:bg-gray-200'}`}
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
