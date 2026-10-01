import { useState } from 'react';
import type { Plan } from '../domain/types';

interface Props {
  plans: Plan[];
  selectedId: string;
  onSelect(id: string): void;
  onNew(): void;
  onOpen(): void;
  onSave(): void;
  onSaveAs(): void;
  onNewProject(): void;
  onHistory(): void;
  onExport(): void;
  onAddTask(): void;
  onBacklog(): void;
  onEmployees(): void;
  onRangeChange(start: string, end: string): void;
  onRename(title: string): void;
}

export function PlanToolbar({ plans, selectedId, onSelect, onNew, onOpen, onSave, onSaveAs, onNewProject, onHistory, onExport, onAddTask, onBacklog, onEmployees, onRangeChange, onRename }: Props) {
  const plan = plans.find(item => item.id === selectedId);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [renameError, setRenameError] = useState('');

  function saveTitle() {
    const title = draftTitle.trim();
    if (!title) { setRenameError('Укажите название плана'); return; }
    if (title !== plan?.title) onRename(title);
    setEditingPlanId(null);
    setRenameError('');
  }

  return (
    <section className="toolbar">
      <div className="toolbar-plan">
        <span className="eyebrow">ТЕКУЩИЙ ПЛАН</span>
        <div className="plan-select-row">{editingPlanId === selectedId ? <>
          <input className="plan-title-input" aria-label="Название плана" autoFocus value={draftTitle}
            onChange={event => { setDraftTitle(event.target.value); setRenameError(''); }}
            onKeyDown={event => { if (event.key === 'Enter') saveTitle(); if (event.key === 'Escape') setEditingPlanId(null); }} />
          <button className="plan-edit-action" title="Сохранить название" aria-label="Сохранить название" onClick={saveTitle}>✓</button>
          <button className="plan-edit-action" title="Отменить переименование" aria-label="Отменить переименование" onClick={() => { setEditingPlanId(null); setRenameError(''); }}>×</button>
        </> : <>
          <select value={selectedId} onChange={event => onSelect(event.target.value)} aria-label="Выбрать план">
            {plans.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select><button className="plan-rename" title="Переименовать план" aria-label="Переименовать план" onClick={() => {
            setDraftTitle(plan?.title ?? ''); setEditingPlanId(selectedId); setRenameError('');
          }}>✎</button>
        </>}</div>
        {renameError && <span className="plan-rename-error" role="alert">{renameError}</span>}
      </div>
      <div className="toolbar-range">
        <label>С <input type="date" value={plan?.rangeStart ?? ''} onChange={event => onRangeChange(event.target.value, plan?.rangeEnd ?? '')} /></label>
        <span className="range-separator">→</span>
        <label>По <input type="date" value={plan?.rangeEnd ?? ''} onChange={event => onRangeChange(plan?.rangeStart ?? '', event.target.value)} /></label>
      </div>
      <div className="toolbar-actions">
        <button className="ghost-button" onClick={onNewProject}>Новый файл</button>
        <button className="ghost-button" onClick={onOpen}>Открыть</button>
        <button className="ghost-button" onClick={onSave}>Сохранить</button>
        <button className="ghost-button" onClick={onSaveAs}>Сохранить как</button>
        <button className="ghost-button" onClick={onEmployees}>Команда</button>
        <button className="ghost-button" onClick={onBacklog}>Очередь</button>
        <button className="ghost-button" onClick={onHistory}>История</button>
        <button className="outline-button" onClick={onNew}>Новый план</button>
        <button className="outline-button" onClick={onAddTask}>+ Задача</button>
        <button className="primary-button" onClick={onExport}>Экспорт ↗</button>
      </div>
    </section>
  );
}
