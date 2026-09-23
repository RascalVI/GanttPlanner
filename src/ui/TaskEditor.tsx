import { useState, type FormEvent } from 'react';
import type { Employee, Task } from '../domain/types';

interface Props {
  task?: Task;
  employeeId?: string;
  employees: Employee[];
  tasks: Task[];
  defaultDay: string;
  initialBacklog?: boolean;
  initialRoutine?: boolean;
  onClose(): void;
  onSave(task: Task): void;
  onDelete?(taskId: string): void;
  onReorder?(taskId: string, direction: -1 | 1): void;
}

export function TaskEditor({ task, employeeId, employees, tasks, defaultDay, initialBacklog = false, initialRoutine = false, onClose, onSave, onDelete, onReorder }: Props) {
  const [draft, setDraft] = useState<Task>(() => task ?? {
    id: crypto.randomUUID(), title: initialRoutine ? 'Текучка' : '', shortLabel: initialRoutine ? 'Тек' : '', employeeId: employeeId ?? employees[0]?.id ?? '',
    startDay: initialBacklog ? null : defaultDay, endDay: initialBacklog ? null : defaultDay, status: 'waiting', linkedTaskId: null,
    routine: initialRoutine, order: Math.max(-1, ...tasks.filter(item => item.employeeId === employeeId).map(item => item.order)) + 1,
  });
  const [error, setError] = useState('');
  const backlog = draft.startDay === null;

  function update<K extends keyof Task>(key: K, value: Task[K]) { setDraft(current => ({ ...current, [key]: value })); }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) { setError('Укажите название задачи'); return; }
    if (!backlog && (!draft.startDay || !draft.endDay || draft.startDay > draft.endDay)) {
      setError('Проверьте даты задачи'); return;
    }
    try { onSave({ ...draft, title: draft.title.trim(), shortLabel: draft.shortLabel.trim() || draft.title.trim() }); }
    catch (reason) { setError((reason as Error).message); }
  }

  return (
    <div className="drawer-scrim" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="drawer" aria-label="Редактор задачи">
        <div className="drawer-heading"><div><span className="eyebrow">ЗАДАЧА</span><h2>{task ? 'Редактирование' : 'Новая задача'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Закрыть">×</button></div>
        <form onSubmit={submit} className="editor-form">
          <label className="field">Название задачи<input autoFocus value={draft.title} onChange={event => update('title', event.target.value)} placeholder="Например, страница программы" /></label>
          <label className="field">Короткая подпись на полосе<input value={draft.shortLabel} onChange={event => update('shortLabel', event.target.value)} placeholder="Если пусто, используем название" /></label>
          <label className="field">Сотрудник<select value={draft.employeeId} onChange={event => update('employeeId', event.target.value)}>{employees.map(item => <option key={item.id} value={item.id}>{item.name} · {item.role}</option>)}</select></label>
          <div className="form-divider" />
          <label className="check-row"><input type="checkbox" checked={backlog} onChange={event => setDraft(current => ({ ...current, startDay: event.target.checked ? null : defaultDay, endDay: event.target.checked ? null : defaultDay }))} /><span>Оставить в очереди без срока</span></label>
          {!backlog && <div className="field-pair"><label className="field">Начало<input type="date" value={draft.startDay ?? ''} onChange={event => update('startDay', event.target.value)} /></label><label className="field">Окончание<input type="date" value={draft.endDay ?? ''} onChange={event => update('endDay', event.target.value)} /></label></div>}
          <label className="field">Состояние<select value={draft.status} onChange={event => update('status', event.target.value as Task['status'])}><option value="waiting">Ожидает</option><option value="active">В работе</option><option value="done">Выполнена</option></select></label>
          <label className="field">Связана с задачей<select value={draft.linkedTaskId ?? ''} onChange={event => update('linkedTaskId', event.target.value || null)}><option value="">Не связана</option>{tasks.filter(item => item.id !== draft.id).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="check-row"><input type="checkbox" checked={draft.routine} onChange={event => update('routine', event.target.checked)} /><span>Текучка / регулярный резерв</span></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="drawer-actions"><button className="primary-button" type="submit">Сохранить задачу</button><button className="ghost-button" type="button" onClick={onClose}>Отмена</button></div>
        </form>
        {task && <div className="drawer-bottom"><div className="reorder-actions"><button onClick={() => onReorder?.(task.id, -1)}>↑ Выше</button><button onClick={() => onReorder?.(task.id, 1)}>↓ Ниже</button></div><button className="danger-link" onClick={() => { if (window.confirm('Удалить задачу? Вернуться к ней можно через историю.')) onDelete?.(task.id); }}>Удалить задачу</button></div>}
      </aside>
    </div>
  );
}
