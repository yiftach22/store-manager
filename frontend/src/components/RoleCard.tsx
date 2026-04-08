import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import type { JobRole, TaskTemplate } from '../types/tasks';

interface Props {
  role: JobRole;
  templates: TaskTemplate[];
  isEditMode: boolean;
  onChanged: () => void;
}

type Section = 'daily' | 'weekly';

export function RoleCard({ role, templates, isEditMode, onChanged }: Props) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(role.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newTitle, setNewTitle] = useState<Record<Section, string>>({ daily: '', weekly: '' });
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) renameRef.current?.focus();
  }, [renaming]);

  async function handleRename() {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === role.name) { setRenaming(false); return; }
    await api.patch(`/api/roles/${role.id}`, { name: trimmed });
    setRenaming(false);
    onChanged();
  }

  async function handleDelete() {
    await api.delete(`/api/roles/${role.id}`);
    onChanged();
  }

  async function handleAddTemplate(freq: Section) {
    const title = newTitle[freq].trim();
    if (!title) return;
    await api.post(`/api/roles/${role.id}/templates`, { title, frequency: freq });
    setNewTitle((prev) => ({ ...prev, [freq]: '' }));
    onChanged();
  }

  async function handleToggleTemplate(t: TaskTemplate) {
    await api.patch(`/api/roles/${role.id}/templates/${t.id}`);
    onChanged();
  }

  async function handleDeleteTemplate(t: TaskTemplate) {
    await api.delete(`/api/roles/${role.id}/templates/${t.id}`);
    onChanged();
  }

  const daily = templates.filter((t) => t.frequency === 'daily');
  const weekly = templates.filter((t) => t.frequency === 'weekly');
  const activeDaily = daily.filter((t) => t.isActive);
  const activeWeekly = weekly.filter((t) => t.isActive);

  function renderSection(label: string, freq: Section, all: TaskTemplate[], active: TaskTemplate[]) {
    const list = isEditMode ? all : active;
    return (
      <div className="mt-3">
        <p className="text-xs font-semibold text-gray-400 mb-1">{label}</p>
        {list.length === 0 && !isEditMode && (
          <p className="text-xs text-gray-300 italic">אין משימות</p>
        )}
        <ul className="space-y-1">
          {list.map((t) => (
            <li key={t.id} className="flex items-center gap-2 group">
              <span
                className={`flex-1 text-sm ${
                  t.isActive ? 'text-gray-700' : 'line-through text-gray-400'
                }`}
              >
                {t.title}
              </span>
              {isEditMode && (
                <>
                  <button
                    onClick={() => handleToggleTemplate(t)}
                    title={t.isActive ? 'השבת' : 'הפעל'}
                    className="text-xs text-gray-400 hover:text-gray-600 px-1"
                  >
                    {t.isActive ? '✓' : '✗'}
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(t)}
                    title="מחק"
                    className="text-xs text-red-300 hover:text-red-500 px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        {isEditMode && (
          <div className="flex gap-1 mt-2">
            <input
              value={newTitle[freq]}
              onChange={(e) => setNewTitle((prev) => ({ ...prev, [freq]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTemplate(freq); }}
              placeholder="+ משימה חדשה"
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
            />
            <button
              onClick={() => handleAddTemplate(freq)}
              disabled={!newTitle[freq].trim()}
              className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-30 px-2"
            >
              הוסף
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 min-h-[2rem]">
        {renaming ? (
          <>
            <input
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
              className="flex-1 text-base font-semibold border-b border-blue-400 focus:outline-none"
            />
            <button onClick={handleRename} className="text-xs text-blue-500 hover:text-blue-700">שמור</button>
            <button onClick={() => setRenaming(false)} className="text-xs text-gray-400 hover:text-gray-600">ביטול</button>
          </>
        ) : confirmDelete ? (
          <>
            <span className="flex-1 text-sm text-red-500">למחוק את "{role.name}"?</span>
            <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700 font-medium">כן</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 hover:text-gray-600">ביטול</button>
          </>
        ) : (
          <>
            <h3 className="flex-1 text-base font-semibold text-gray-800">{role.name}</h3>
            {isEditMode && (
              <>
                <button
                  onClick={() => { setRenameValue(role.name); setRenaming(true); }}
                  title="שנה שם"
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  ✎
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  title="מחק תפקיד"
                  className="text-gray-300 hover:text-red-400 text-sm"
                >
                  🗑
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Template sections */}
      {renderSection('יומי', 'daily', daily, activeDaily)}
      {renderSection('שבועי', 'weekly', weekly, activeWeekly)}
    </div>
  );
}
