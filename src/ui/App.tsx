import { useState } from 'react';
import type { Task } from '../domain/types';
import { BacklogPanel } from './BacklogPanel';
import { EmployeesPanel } from './EmployeesPanel';
import { ExportDialog } from './ExportDialog';
import { GanttGrid } from './GanttGrid';
import { HistoryPanel } from './HistoryPanel';
import { PlanCopyDialog } from './PlanCopyDialog';
import { PlanToolbar } from './PlanToolbar';
import { TaskEditor } from './TaskEditor';
import { usePlanner } from './usePlanner';
import { sceneDataUrl } from '../export/png';
import type { ExportScene } from '../export/scene';

type Panel = 'backlog' | 'history' | 'employees' | null;

export function App() {
  const planner = usePlanner();
  const { project, selectedId, setSelectedId, saveState, filePath, error, setError } = planner;
  const plan = project?.plans.find(item => item.id === selectedId);
  const [panel, setPanel] = useState<Panel>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editedTask, setEditedTask] = useState<Task | undefined>();
  const [newTaskEmployee, setNewTaskEmployee] = useState<string>();
  const [newBacklog, setNewBacklog] = useState(false);
  const [notice, setNotice] = useState('');

  function showTask(task?: Task, employeeId?: string, backlog = false) {
    setPanel(null);
    setEditedTask(task);
    setNewTaskEmployee(employeeId);
    setNewBacklog(backlog);
    setEditorOpen(true);
  }

  function act(action: Parameters<typeof planner.apply>[0]) {
    try { planner.apply(action); setError(''); }
    catch (reason) { setError((reason as Error).message); throw reason; }
  }

  function tryAct(action: Parameters<typeof planner.apply>[0]) {
    try { act(action); } catch { /* error banner is shown by act */ }
  }

  function updateRange(start: string, end: string) {
    if (!plan || !start || !end || start > end) return;
    tryAct({ type: 'changeRange', planId: plan.id, rangeStart: start, rangeEnd: end });
  }

  async function exportScenes(scenes: ExportScene[]) {
    if (!window.gantt) throw new Error('Сохранение экспорта доступно в Windows-приложении');
    const pptx = await window.gantt.exportPptx(scenes);
    if (!pptx.ok) throw new Error(pptx.code === 'CANCELLED' ? 'Сохранение отменено' : pptx.message);
    const dataUrls = await Promise.all(scenes.map(sceneDataUrl));
    const png = await window.gantt.savePng({ path: pptx.value.path, dataUrls });
    if (!png.ok) throw new Error(`PPTX сохранён, но PNG не создан: ${png.message}`);
    setNotice(`Сохранены PPTX и ${png.value.paths.length} PNG`);
  }

  const reportDate = plan?.reportDay ? new Date(`${plan.reportDay}T00:00:00Z`).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup"><span className="app-mark">П<span>•</span></span><div><span className="brand-overline">ПЛАНИРОВАНИЕ КОМАНДЫ</span><h1>Разработка страниц портала</h1></div></div>
        <div className="header-side"><span className={`offline-pill save-${saveState}`}><i />{saveState === 'saved' ? 'Сохранено' : saveState === 'saving' ? 'Сохранение…' : saveState === 'error' ? 'Ошибка записи' : saveState === 'preview' ? 'Предпросмотр' : 'Не сохранено'}</span><span className="header-date">{reportDate.toUpperCase()}</span></div>
      </header>

      {project && plan ? (
        <>
          <PlanToolbar plans={project.plans} selectedId={selectedId} onSelect={setSelectedId}
            onNew={() => setCopyOpen(true)} onOpen={() => void planner.openProject()}
            onSave={() => void planner.saveNow()} onSaveAs={() => void planner.saveAs()}
            onNewProject={() => { if (window.confirm('Создать новый файл проекта? Текущий проект можно открыть позже.')) void planner.newProject(); }}
            onHistory={() => setPanel('history')}
            onExport={() => setExportOpen(true)} onRangeChange={updateRange}
            onRename={title => tryAct({ type: 'renamePlan', planId: plan.id, title })}
            onAddTask={() => showTask(undefined, project.employees[0]?.id)}
            onBacklog={() => setPanel('backlog')} onEmployees={() => setPanel('employees')} />
          <div className="plan-summary">
            <div><span className="summary-kicker">ОБЗОР</span><strong>{plan.title}</strong><span className="summary-muted" title={filePath ?? ''}>{filePath ? filePath.split(/[\\/]/).at(-1) : 'Файл не выбран'}</span></div>
            <div className="summary-stats"><span><b>{project.employees.length}</b> сотрудника</span><span><b>{plan.tasks.filter(task => task.startDay).length}</b> задачи</span><span><b>{plan.tasks.filter(task => task.status === 'active').length}</b> в работе</span></div>
            <div className="legend"><span><i className="legend-dot waiting" />Ожидает</span><span><i className="legend-dot active" />В работе</span><span><i className="legend-dot done" />Готово</span></div>
          </div>
          <GanttGrid plan={plan} employees={project.employees} onOpenTask={task => showTask(task)}
            onAddTask={employeeId => showTask(undefined, employeeId)}
            onMoveTask={(task, deltaDays) => tryAct({ type: 'moveTask', planId: plan.id, taskId: task.id, deltaDays })}
            onResizeTask={(task, edge, deltaDays) => tryAct({ type: 'resizeTask', planId: plan.id, taskId: task.id, edge, deltaDays })} />
        </>
      ) : (
        <section className="empty-state">
          <span className="empty-symbol">▦</span>
          <span className="eyebrow">ВАШЕ РАБОЧЕЕ ПРОСТРАНСТВО</span>
          <strong>Планы всегда под рукой</strong>
          <p>Создайте проект для команды или откройте файл с флешки.</p>
          <div className="empty-actions"><button className="primary-button" onClick={() => void planner.newProject()}>Создать проект</button><button className="outline-button" onClick={() => void planner.openProject()}>Открыть файл</button></div>
        </section>
      )}

      {copyOpen && plan && <PlanCopyDialog source={plan} onClose={() => setCopyOpen(false)} onCreate={(reportDay, rangeStart, rangeEnd) => { act({ type: 'copyPlan', sourceId: plan.id, reportDay, rangeStart, rangeEnd }); setCopyOpen(false); }} />}
      {exportOpen && project && plan && <ExportDialog plan={plan} employees={project.employees} onClose={() => setExportOpen(false)} onExport={exportScenes} />}
      {editorOpen && project && plan && <TaskEditor key={editedTask?.id ?? `new-${newTaskEmployee}-${newBacklog}`} task={editedTask} employeeId={newTaskEmployee}
        employees={project.employees} tasks={plan.tasks} defaultDay={plan.rangeStart} initialBacklog={newBacklog}
        onClose={() => setEditorOpen(false)} onSave={task => { act({ type: 'saveTask', planId: plan.id, task }); setEditorOpen(false); }}
        onDelete={taskId => { act({ type: 'deleteTask', planId: plan.id, taskId }); setEditorOpen(false); }}
        onReorder={(taskId, direction) => tryAct({ type: 'reorderTask', planId: plan.id, taskId, direction })} />}
      {panel === 'backlog' && project && plan && <BacklogPanel tasks={plan.tasks} employees={project.employees} onClose={() => setPanel(null)} onOpen={task => showTask(task)} onAdd={() => showTask(undefined, project.employees[0]?.id, true)} />}
      {panel === 'history' && project && plan && <HistoryPanel revisions={project.revisions.filter(revision => revision.planId === plan.id)} editorName={planner.editorName}
        onEditorName={planner.changeEditorName} onClose={() => setPanel(null)} onRestore={revisionId => { planner.restore(revisionId); setPanel(null); }} />}
      {panel === 'employees' && project && <EmployeesPanel employees={project.employees} onClose={() => setPanel(null)}
        onAdd={(name, role) => tryAct({ type: 'addEmployee', employee: { id: crypto.randomUUID(), name, role, order: project.employees.length } })}
        onUpdate={employee => tryAct({ type: 'updateEmployee', employee })}
        onRemove={employeeId => { try { act({ type: 'removeEmployee', employeeId }); } catch { /* error banner explains refusal */ } }} />}

      {(notice || error) && <div className={`notice ${error ? 'is-error' : ''}`} role="status" onClick={() => { setNotice(''); setError(''); }}><span>{error || notice}</span>{saveState === 'error' && <button onClick={event => { event.stopPropagation(); void planner.saveNow(); }}>Повторить</button>}<span className="notice-close">×</span></div>}
    </main>
  );
}
