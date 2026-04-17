// Auth role — mirrors backend enum `Role` in prisma schema.
// MANAGER  — full admin
// ORDERS   — orders-board operator (no tasks, no template/list/user mgmt)
// WORKER   — task-checklist user
export type Role = 'MANAGER' | 'WORKER' | 'ORDERS';

export const ROLE_LABELS: Record<Role, string> = {
  MANAGER: 'מנהל',
  ORDERS: 'הזמנות',
  WORKER: 'עובד',
};

// Landing path per role — used on login redirect and by the router catch-all.
export function homePathFor(role: Role): string {
  switch (role) {
    case 'MANAGER':
      return '/tasks/status';
    case 'ORDERS':
      return '/';
    case 'WORKER':
      return '/my-tasks';
  }
}
