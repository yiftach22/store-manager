import { useState } from 'react';
import type { RoleStatus, TaskInstance } from '../types/tasks';

interface Props {
  roleStatus: RoleStatus;
}

function ProgressBar({ done, total, color }: { done: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className={`${color} rounded-full h-2 transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-10 text-left">
        {done}/{total}
      </span>
    </div>
  );
}

function TaskList({ instances, label }: { instances: TaskInstance[]; label: string }) {
  if (instances.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-gray-400 mb-1">{label}</p>
      <ul className="space-y-1">
        {instances.map((t) => (
          <li key={t.id} className="flex items-center gap-2">
            <span className={t.status ? 'text-green-500' : 'text-gray-300'}>
              {t.status ? '✓' : '○'}
            </span>
            <span className={`text-sm ${t.status ? 'text-green-700' : 'text-gray-500'}`}>
              {t.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RoleStatusCard({ roleStatus }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { role, daily, weekly } = roleStatus;

  const dailyDone = daily.filter((t) => t.status).length;
  const weeklyDone = weekly.filter((t) => t.status).length;

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:border-gray-200 transition-colors"
      onClick={() => setExpanded((v) => !v)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">{role.name}</h3>
        <span className="text-gray-300 text-sm">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Progress bars */}
      <div className="space-y-2">
        {daily.length > 0 ? (
          <div>
            <p className="text-xs text-gray-400 mb-1">יומי</p>
            <ProgressBar done={dailyDone} total={daily.length} color="bg-blue-500" />
          </div>
        ) : (
          <p className="text-xs text-gray-300">יומי — אין משימות</p>
        )}

        {weekly.length > 0 ? (
          <div>
            <p className="text-xs text-gray-400 mb-1">שבועי</p>
            <ProgressBar done={weeklyDone} total={weekly.length} color="bg-green-500" />
          </div>
        ) : (
          <p className="text-xs text-gray-300">שבועי — אין משימות</p>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {daily.length === 0 && weekly.length === 0 && (
            <p className="text-xs text-gray-400">אין משימות לתאריך זה</p>
          )}
          <TaskList instances={daily} label="משימות יומיות" />
          <TaskList instances={weekly} label="משימות שבועיות" />
        </div>
      )}
    </div>
  );
}
