import { useState } from 'react';
import type { Employee } from '../domain/types';

interface Props { employees: Employee[]; taskCounts: Record<string, number>; onClose(): void; onAdd(name: string, role: string): void; onUpdate(employee: Employee): void; onRemove(id: string, replacementId?: string): boolean; }

function EmployeeRow({ employee, onUpdate, onRemove }: { employee: Employee; onUpdate(employee: Employee): void; onRemove(id: string): void }) {
  const [name, setName] = useState(employee.name);
  const [role, setRole] = useState(employee.role);
  function commit() {
    const changed = { ...employee, name: name.trim() || employee.name, role: role.trim() || employee.role };
    if (changed.name !== employee.name || changed.role !== employee.role) onUpdate(changed);
  }
  return <div className="employee-edit"><input aria-label="Имя сотрудника" value={name} onChange={event => setName(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /><input aria-label="Роль сотрудника" value={role} onChange={event => setRole(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /><button title="Удалить сотрудника" onClick={() => onRemove(employee.id)}>×</button></div>;
}

export function EmployeesPanel({ employees, taskCounts, onClose, onAdd, onUpdate, onRemove }: Props) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Верстка');
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [replacementId, setReplacementId] = useState('');
  const target = employees.find(employee => employee.id === pendingRemove);
  const alternatives = employees.filter(employee => employee.id !== pendingRemove);
  const workCount = pendingRemove ? taskCounts[pendingRemove] ?? 0 : 0;
  return <div className="drawer-scrim" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><aside className="drawer" aria-label="Сотрудники">
    <div className="drawer-heading"><div><span className="eyebrow">КОМАНДА</span><h2>Сотрудники</h2></div><button className="icon-button" onClick={onClose}>×</button></div>
    <p className="panel-intro">Добавляйте участников и меняйте их имена. При удалении рабочие задачи можно передать коллеге.</p>
    <div className="employee-list">{employees.map(employee => <EmployeeRow key={employee.id} employee={employee} onUpdate={onUpdate} onRemove={id => { setPendingRemove(id); setReplacementId(''); }} />)}</div>
    {target && <div className="employee-removal">
      <strong>Удалить: {target.name}</strong>
      {workCount > 0 ? <><p>{workCount} задач в планах будут переданы другому участнику. Текучка удаляемого участника исчезнет.</p>
        <label className="field">Передать задачи<select value={replacementId} onChange={event => setReplacementId(event.target.value)}><option value="">Выберите участника</option>{alternatives.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label></>
        : <p>Текучка участника будет удалена из текущих планов. Старые версии останутся в истории.</p>}
      {alternatives.length === 0 && <p>Сначала добавьте другого участника.</p>}
      <div className="employee-removal-actions"><button className="ghost-button" onClick={() => setPendingRemove(null)}>Отмена</button><button className="danger-button" disabled={!alternatives.length || (workCount > 0 && !replacementId)} onClick={() => {
        if (onRemove(target.id, workCount > 0 ? replacementId : undefined)) setPendingRemove(null);
      }}>Удалить участника</button></div>
    </div>}
    <div className="form-divider" /><label className="field">Новый сотрудник<input value={name} onChange={event => setName(event.target.value)} placeholder="Имя и фамилия" /></label><label className="field">Роль<input value={role} onChange={event => setRole(event.target.value)} /></label><button className="primary-button full-button" onClick={() => { if (name.trim()) { onAdd(name.trim(), role.trim()); setName(''); } }}>Добавить</button>
  </aside></div>;
}
