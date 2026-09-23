import { useState } from 'react';
import type { Employee } from '../domain/types';

interface Props { employees: Employee[]; onClose(): void; onAdd(name: string, role: string): void; onUpdate(employee: Employee): void; onRemove(id: string): void; }

function EmployeeRow({ employee, onUpdate, onRemove }: { employee: Employee; onUpdate(employee: Employee): void; onRemove(id: string): void }) {
  const [name, setName] = useState(employee.name);
  const [role, setRole] = useState(employee.role);
  function commit() {
    const changed = { ...employee, name: name.trim() || employee.name, role: role.trim() || employee.role };
    if (changed.name !== employee.name || changed.role !== employee.role) onUpdate(changed);
  }
  return <div className="employee-edit"><input aria-label="Имя сотрудника" value={name} onChange={event => setName(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /><input aria-label="Роль сотрудника" value={role} onChange={event => setRole(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /><button title="Удалить сотрудника" onClick={() => onRemove(employee.id)}>×</button></div>;
}

export function EmployeesPanel({ employees, onClose, onAdd, onUpdate, onRemove }: Props) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Верстка');
  return <div className="drawer-scrim" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><aside className="drawer" aria-label="Сотрудники">
    <div className="drawer-heading"><div><span className="eyebrow">КОМАНДА</span><h2>Сотрудники</h2></div><button className="icon-button" onClick={onClose}>×</button></div>
    <p className="panel-intro">Имена можно менять. Удалить сотрудника с задачами нельзя.</p>
    <div className="employee-list">{employees.map(employee => <EmployeeRow key={employee.id} employee={employee} onUpdate={onUpdate} onRemove={onRemove} />)}</div>
    <div className="form-divider" /><label className="field">Новый сотрудник<input value={name} onChange={event => setName(event.target.value)} placeholder="Имя и фамилия" /></label><label className="field">Роль<input value={role} onChange={event => setRole(event.target.value)} /></label><button className="primary-button full-button" onClick={() => { if (name.trim()) { onAdd(name.trim(), role.trim()); setName(''); } }}>Добавить</button>
  </aside></div>;
}
