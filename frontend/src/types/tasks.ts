export interface TaskInstance {
  id: number;
  title: string;
  frequency: 'daily' | 'weekly';
  status: boolean;
  date: string;
  roleId: number;
  templateId: number | null;
  completedAt: string | null;
  completedByName: string | null;
}

export interface RoleStatus {
  role: { id: number; name: string };
  daily: TaskInstance[];
  weekly: TaskInstance[];
}

export interface JobRole {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface TaskTemplate {
  id: number;
  title: string;
  frequency: 'daily' | 'weekly';
  isActive: boolean;
  roleId: number;
}
