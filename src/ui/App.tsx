import { useState } from 'react';
import type { Project, Task } from '../domain/types';
import { demoProject } from './demoProject';
import { GanttGrid } from './GanttGrid';
import { PlanToolbar } from './PlanToolbar';

export function App() {
  const [project, setProject] = useState<Project | null>(import.meta.env.DEV && location.search.includes('demo=1') ? demoProject : null);
  const [selectedId, setSelectedId] = useState(project?.plans[0]?.id ?? '');
  const plan = project?.plans.find(item => item.id === selectedId);
  const [notice, setNotice] = useState('');

  function placeholder(action: string) { setNotice(`${action}: подключим на следующем этапе`); }
  function rangeChange(start: string, end: string) {
    if (!project || !plan || !start || !end || start > end) return;
    setProject({ ...project, plans: project.plans.map(item => item.id === plan.id ? { ...item, rangeStart: start, rangeEnd: end } : item) });
  }
  function openTask(task: Task) { setNotice(`Задача: ${task.title}`); }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup"><span className="app-mark">П<span>•</span></span><div><span className="brand-overline">ПЛАНИРОВАНИЕ КОМАНДЫ</span><h1>Разработка страниц портала</h1></div></div>
        <div className="header-side"><span className="offline-pill"><i />Локальная работа</span><span className="header-date">СЕНТЯБРЬ 2026</span></div>
      </header>

      {project && plan ? (
        <>
          <PlanToolbar plans={project.plans} selectedId={selectedId} onSelect={setSelectedId}
            onNew={() => placeholder('Новый план')} onOpen={() => placeholder('Открыть')}
            onSave={() => placeholder('Сохранить')} onHistory={() => placeholder('История')}
            onExport={() => placeholder('Экспорт')} onRangeChange={rangeChange} />
          <div className="plan-summary">
            <div><span className="summary-kicker">ОБЗОР</span><strong>{plan.title}</strong><span className="summary-muted">Редактируемый план команды</span></div>
            <div className="summary-stats"><span><b>{project.employees.length}</b> сотрудника</span><span><b>{plan.tasks.filter(task => task.startDay).length}</b> задачи</span><span><b>{plan.tasks.filter(task => task.status === 'active').length}</b> в работе</span></div>
            <div className="legend"><span><i className="legend-dot waiting" />Ожидает</span><span><i className="legend-dot active" />В работе</span><span><i className="legend-dot done" />Готово</span></div>
          </div>
          <GanttGrid plan={plan} employees={project.employees} onOpenTask={openTask} />
        </>
      ) : (
        <section className="empty-state">
          <span className="empty-symbol">▦</span>
          <span className="eyebrow">ВАШЕ РАБОЧЕЕ ПРОСТРАНСТВО</span>
          <strong>Планы всегда под рукой</strong>
          <p>Создайте проект для команды или откройте файл с флешки.</p>
          <div className="empty-actions"><button className="primary-button" onClick={() => placeholder('Новый проект')}>Создать проект</button><button className="outline-button" onClick={() => placeholder('Открыть проект')}>Открыть файл</button></div>
        </section>
      )}
      {notice && <div className="notice" role="status" onClick={() => setNotice('')}>{notice}<span>×</span></div>}
    </main>
  );
}
