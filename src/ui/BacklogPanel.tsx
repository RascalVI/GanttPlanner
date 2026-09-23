import type { Employee, Task } from '../domain/types';

interface Props { tasks: Task[]; employees: Employee[]; onClose(): void; onOpen(task: Task): void; onAdd(): void; }

export function BacklogPanel({ tasks, employees, onClose, onOpen, onAdd }: Props) {
  const backlog = tasks.filter(task => !task.startDay);
  return <div className="drawer-scrim" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="drawer" aria-label="Очередь задач">
      <div className="drawer-heading"><div><span className="eyebrow">БЕЗ ДАТЫ</span><h2>Очередь задач</h2></div><button className="icon-button" onClick={onClose} aria-label="Закрыть">×</button></div>
      <p className="panel-intro">Готовые макеты и другие задачи, которым ещё не назначен срок.</p>
      <button className="primary-button full-button" onClick={onAdd}>+ Добавить в очередь</button>
      <div className="backlog-list">{backlog.length ? backlog.map(task => <button key={task.id} className="backlog-card" onClick={() => onOpen(task)}><strong>{task.title}</strong><small>{employees.find(item => item.id === task.employeeId)?.name ?? 'Сотрудник не найден'}</small></button>) : <p className="empty-list">Очередь пуста.</p>}</div>
    </aside>
  </div>;
}
