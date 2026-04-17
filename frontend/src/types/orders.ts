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
  completedAt?: string | null;
  completedByName?: string | null;
  virtual?: boolean;  // true = derived from template, no DB instance yet
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

export interface OrderTemplate {
  id: number;
  title: string;
  dayOfWeek: number | null;
  category: string;
  isActive: boolean;
  listId: number | null;
}

export interface OrderList {
  id: number;
  name: string;
  isActive: boolean;
}
