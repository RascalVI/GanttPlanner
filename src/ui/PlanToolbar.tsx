import type { Plan } from '../domain/types';

interface Props {
  plans: Plan[];
  selectedId: string;
  onSelect(id: string): void;
  onNew(): void;
  onOpen(): void;
  onSave(): void;
  onHistory(): void;
  onExport(): void;
  onRangeChange(start: string, end: string): void;
}

export function PlanToolbar({ plans, selectedId, onSelect, onNew, onOpen, onSave, onHistory, onExport, onRangeChange }: Props) {
  const plan = plans.find(item => item.id === selectedId);
  return (
    <section className="toolbar">
      <div className="toolbar-plan">
        <span className="eyebrow">ТЕКУЩИЙ ПЛАН</span>
        <select value={selectedId} onChange={event => onSelect(event.target.value)} aria-label="Выбрать план">
          {plans.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </div>
      <div className="toolbar-range">
        <label>С <input type="date" value={plan?.rangeStart ?? ''} onChange={event => onRangeChange(event.target.value, plan?.rangeEnd ?? '')} /></label>
        <span className="range-separator">→</span>
        <label>По <input type="date" value={plan?.rangeEnd ?? ''} onChange={event => onRangeChange(plan?.rangeStart ?? '', event.target.value)} /></label>
      </div>
      <div className="toolbar-actions">
        <button className="ghost-button" onClick={onOpen}>Открыть</button>
        <button className="ghost-button" onClick={onSave}>Сохранить</button>
        <button className="ghost-button" onClick={onHistory}>История</button>
        <button className="outline-button" onClick={onNew}>Новый план</button>
        <button className="primary-button" onClick={onExport}>Экспорт ↗</button>
      </div>
    </section>
  );
}
