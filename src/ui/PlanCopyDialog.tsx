import { useState, type FormEvent } from 'react';
import { nextPlanDefaults } from '../domain/plans';
import type { Plan } from '../domain/types';

interface Props { source: Plan; onClose(): void; onCreate(reportDay: string, start: string, end: string): void; }

export function PlanCopyDialog({ source, onClose, onCreate }: Props) {
  const defaults = nextPlanDefaults(source);
  const [reportDay, setReportDay] = useState(defaults.reportDay);
  const [start, setStart] = useState(defaults.rangeStart);
  const [end, setEnd] = useState(defaults.rangeEnd);
  const [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    if (start > end) { setError('Конец диапазона должен быть после начала'); return; }
    onCreate(reportDay, start, end);
  }
  return <div className="modal-scrim" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><form className="modal" onSubmit={submit}>
    <div className="drawer-heading"><div><span className="eyebrow">КОПИЯ ТЕКУЩЕГО ПЛАНА</span><h2>Новый отчёт</h2></div><button className="icon-button" type="button" onClick={onClose}>×</button></div>
    <p className="panel-intro">Задачи и даты скопируются. Вы сможете передвинуть их в новом плане.</p>
    <label className="field">Дата отчёта<input type="date" required value={reportDay} onChange={event => setReportDay(event.target.value)} /></label>
    <div className="field-pair"><label className="field">Показать с<input type="date" required value={start} onChange={event => setStart(event.target.value)} /></label><label className="field">По<input type="date" required value={end} onChange={event => setEnd(event.target.value)} /></label></div>
    {error && <p className="form-error">{error}</p>}
    <div className="drawer-actions"><button className="primary-button" type="submit">Создать план</button><button className="ghost-button" type="button" onClick={onClose}>Отмена</button></div>
  </form></div>;
}
