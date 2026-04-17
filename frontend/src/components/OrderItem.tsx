import type { OrderInstance } from '../types/orders';

interface Props {
  instance: OrderInstance;
  disabled?: boolean;
  isEditMode?: boolean;
  onToggle: (id: number) => void;
}

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function completionHint(instance: OrderInstance): string | null {
  if (!instance.status || !instance.completedAt) return null;
  const d = new Date(instance.completedAt);
  const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const who = instance.completedByName;

  // Show the day name when:
  //  • the item belongs to a floating/weekly list (listId !== null), or
  //  • the item was completed on a different calendar date than its scheduled day.
  const isFloating = instance.listId != null;
  // Compare in local time — toISOString() would give UTC which drifts in IL timezone.
  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocalDate = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const completedDate = toLocalDate(d);
  const scheduled = new Date(instance.currentDate);
  const scheduledDate = toLocalDate(scheduled);
  const differentDay = completedDate !== scheduledDate;

  // Floating/weekly: always show which day it was completed.
  // Daily: show only when completed on a different day than scheduled.
  const showDay = isFloating || differentDay;
  const dayLabel = showDay ? `יום ${DAY_NAMES[d.getDay()]}` : null;

  const parts = [dayLabel, time].filter(Boolean).join(' ');
  return who ? `${parts} — ${who}` : parts;
}

export function OrderItem({ instance, disabled = false, isEditMode = false, onToggle }: Props) {
  // In edit mode show a clean template view — no completion state, no overdue highlights
  const isDone = isEditMode ? false : instance.status;
  const isOverdue = isEditMode ? false : (instance.isOverdue && !instance.status);
  const hint = isEditMode ? null : completionHint(instance);

  return (
    <li
      className={`flex items-center gap-3 py-2 px-3 rounded-lg text-base transition-opacity
        ${isDone ? 'opacity-50' : ''}
        ${isOverdue ? 'bg-red-50 border border-red-200' : ''}
        ${disabled || isEditMode ? 'pointer-events-none' : ''}
      `}
    >
      <input
        type="checkbox"
        checked={isDone}
        onChange={() => onToggle(instance.id)}
        disabled={disabled || isEditMode}
        className="w-5 h-5 rounded accent-indigo-600 cursor-pointer shrink-0"
      />
      <span className={`flex-1 ${isDone ? 'line-through text-gray-400' : isOverdue ? 'text-red-700 font-medium' : 'text-gray-800'}`}>
        {instance.title}
      </span>
      {hint && (
        <span className="text-sm text-gray-400 shrink-0" title={hint}>{hint}</span>
      )}
      {isOverdue && <span className="text-sm text-red-500 shrink-0">מועבר</span>}
    </li>
  );
}
