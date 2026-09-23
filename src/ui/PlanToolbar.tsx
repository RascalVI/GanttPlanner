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
  return (
    <section className="toolbar">
      <div className="toolbar-plan">
        <span className="eyebrow">ТЕКУЩИЙ ПЛАН</span>
        <div className="plan-select-row"><select value={selectedId} onChange={event => onSelect(event.target.value)} aria-label="Выбрать план">
          {plans.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select><button className="plan-rename" title="Переименовать план" aria-label="Переименовать план" onClick={() => {
          const title = window.prompt('Название плана', plan?.title ?? '');
          if (title !== null && title.trim()) onRename(title);
        }}>✎</button></div>
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
