import { useState } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import type { RoleStatus, TaskInstance } from '../types/tasks';

interface Props {
  roleStatus: RoleStatus;
}

function ProgressBar({ done, total, color }: { done: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-3.5">
        <div
          className={`${color} rounded-full h-3.5 transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm text-gray-500 w-10 text-left">
        {done}/{total}
      </span>
    </div>
  );
}

function completionLabel(t: TaskInstance): string {
  if (!t.status || !t.completedAt) return '';
  const d = new Date(t.completedAt);
  const time = format(d, 'HH:mm', { locale: he });
  const who = t.completedByName ?? '';
  if (t.frequency === 'weekly') {
    const day = format(d, 'EEEE', { locale: he });
    return `${day} ${time}${who ? ` — ${who}` : ''}`;
  }
  return `${time}${who ? ` — ${who}` : ''}`;
}

function TaskList({ instances, label }: { instances: TaskInstance[]; label: string }) {
  if (instances.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold text-gray-400 mb-1.5">{label}</p>
      <ul className="space-y-2">
        {instances.map((t) => (
          <li key={t.id} className="flex items-center gap-2">
            <span className={t.status ? 'text-green-500' : 'text-gray-300'}>
              {t.status ? '✓' : '○'}
            </span>
            <span className={`text-base ${t.status ? 'text-green-700' : 'text-gray-500'}`}>
              {t.title}
            </span>
            {t.status && (
              <span className="text-sm text-gray-400 mr-auto">{completionLabel(t)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RoleStatusCard({ roleStatus }: Props) {
  const { role, daily, weekly } = roleStatus;

  const dailyDone = daily.filter((t) => t.status).length;
  const weeklyDone = weekly.filter((t) => t.status).length;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
      <h3 className="text-base font-semibold text-gray-800 mb-3">{role.name}</h3>

      <div className="space-y-2.5">
        {daily.length > 0 ? (
          <div>
            <p className="text-sm text-gray-400 mb-1">יומי</p>
            <ProgressBar done={dailyDone} total={daily.length} color="bg-indigo-500" />
          </div>
        ) : (
          <p className="text-sm text-gray-300">יומי — אין משימות</p>
        )}

        {weekly.length > 0 ? (
          <div>
            <p className="text-sm text-gray-400 mb-1">שבועי</p>
            <ProgressBar done={weeklyDone} total={weekly.length} color="bg-green-500" />
          </div>
        ) : (
          <p className="text-sm text-gray-300">שבועי — אין משימות</p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        {daily.length === 0 && weekly.length === 0 && (
          <p className="text-sm text-gray-400">אין משימות לתאריך זה</p>
        )}
        <TaskList instances={daily} label="משימות יומיות" />
        <TaskList instances={weekly} label="משימות שבועיות" />
      </div>
    </div>
  );
}
