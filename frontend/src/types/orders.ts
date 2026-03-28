export interface OrderInstance {
  id: number;
  title: string;
  originalDate: string;
  currentDate: string;
  status: boolean;
  category: string;
  isOverdue: boolean;
  templateId: number | null;
  listId: number | null;
}

export interface DayData {
  date: string;       // 'YYYY-MM-DD'
  dayOfWeek: number;  // 0=Sun … 5=Fri
  label: string;      // Hebrew day name
  instances: OrderInstance[];
}

export interface ListData {
  id: number;
  name: string;
  instances: OrderInstance[];
}

export interface WeekData {
  weekStart: string;
  days: DayData[];
  lists: ListData[];
}
