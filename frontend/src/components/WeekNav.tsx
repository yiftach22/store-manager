import { format, addDays } from 'date-fns';
import { he } from 'date-fns/locale';

interface Props {
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
}

export function WeekNav({ weekStart, onPrev, onNext }: Props) {
  const weekEnd = addDays(weekStart, 5); // Friday
  const label = `${format(weekStart, 'd MMM', { locale: he })} – ${format(weekEnd, 'd MMM yyyy', { locale: he })}`;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200" dir="rtl">
      <button onClick={onPrev} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="שבוע קודם">
        ›
      </button>
      <span className="font-semibold text-gray-800 text-sm">{label}</span>
      <button onClick={onNext} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="שבוע הבא">
        ‹
      </button>
    </div>
  );
}
