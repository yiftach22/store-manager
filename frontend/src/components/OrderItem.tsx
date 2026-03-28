import type { OrderInstance } from '../types/orders';

interface Props {
  instance: OrderInstance;
  disabled?: boolean;
  onToggle: (id: number) => void;
}

export function OrderItem({ instance, disabled = false, onToggle }: Props) {
  const isDone = instance.status;
  const isOverdue = instance.isOverdue && !isDone;

  return (
    <li
      className={`flex items-center gap-2 py-1.5 px-2 rounded-lg text-sm transition-opacity
        ${isDone ? 'opacity-50' : ''}
        ${isOverdue ? 'bg-red-50 border border-red-200' : ''}
        ${disabled ? 'pointer-events-none' : ''}
      `}
    >
      <input
        type="checkbox"
        checked={isDone}
        onChange={() => onToggle(instance.id)}
        disabled={disabled}
        className="w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0"
      />
      <span className={`flex-1 ${isDone ? 'line-through text-gray-400' : isOverdue ? 'text-red-700 font-medium' : 'text-gray-800'}`}>
        {instance.title}
      </span>
      {isOverdue && <span className="text-xs text-red-500 shrink-0">מועבר</span>}
    </li>
  );
}
