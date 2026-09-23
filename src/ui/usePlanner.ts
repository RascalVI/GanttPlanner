import { useEffect, useRef, useState } from 'react';
import { localToday } from '../domain/dates';
import { restoreRevision } from '../domain/history';
import { createProject, applyPlannerAction, type PlannerAction } from '../domain/plannerReducer';
import type { Employee, Project } from '../domain/types';
import { demoProject } from './demoProject';

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error' | 'preview';

function defaultEmployees(): Employee[] {
  return [
    { id: crypto.randomUUID(), name: 'Дмитрий Колтаков', role: 'Верстка', order: 0 },
    { id: crypto.randomUUID(), name: 'Сафия Гусейнова', role: 'Верстка', order: 1 },
    { id: crypto.randomUUID(), name: 'Никита Колодезнев', role: 'Дизайн', order: 2 },
  ];
}

export function usePlanner() {
  const initial = import.meta.env.DEV && location.search.includes('demo=1') ? demoProject : null;
  const [project, setProject] = useState<Project | null>(initial);
  const projectRef = useRef<Project | null>(initial);
  const [selectedId, setSelectedId] = useState(initial?.plans[0]?.id ?? '');
  const [filePath, setFilePath] = useState<string | null>(null);
  const pathRef = useRef<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>(initial ? 'preview' : 'saved');
  const [error, setError] = useState('');
  const [editorName, setEditorName] = useState(() => localStorage.getItem('ganttEditorName') ?? '');
  const queue = useRef<Promise<void>>(Promise.resolve());
  const bridge = typeof window.gantt !== 'undefined';

  function replace(next: Project, selected = selectedId) {
    projectRef.current = next;
    setProject(next);
    setSelectedId(selected);
  }

  function persist(next: Project) {
    const target = pathRef.current;
    if (!target) { setSaveState(bridge ? 'unsaved' : 'preview'); return; }
    setSaveState('saving');
    queue.current = queue.current.catch(() => undefined).then(async () => {
      const result = await window.gantt.saveProject(target, next);
      if (!result.ok) {
        setSaveState('error');
        setError(result.message);
        throw new Error(result.message);
      }
      if (projectRef.current === next) { setSaveState('saved'); setError(''); }
    });
  }

  function apply(action: PlannerAction) {
    const current = projectRef.current;
    if (!current) throw new Error('Сначала создайте проект');
    const next = applyPlannerAction(current, action, editorName);
    const nextSelected = action.type === 'copyPlan' ? next.plans[next.plans.length - 1].id : selectedId;
    replace(next, nextSelected);
    persist(next);
  }

  async function newProject() {
    const today = localToday();
    const next = createProject(today, defaultEmployees());
    replace(next, next.plans[0].id);
    pathRef.current = null; setFilePath(null);
    setSaveState('unsaved'); setError('');
    if (bridge) await saveAs(next);
  }

  async function openProject() {
    if (!bridge) { setError('Открытие файла доступно в Windows-приложении'); return; }
    if (saveState === 'error' || saveState === 'unsaved') {
      if (!window.confirm('Есть несохранённые изменения. Открыть другой проект?')) return;
    }
    let result = await window.gantt.openProject();
    if (!result.ok && result.code === 'OPEN_FAILED' && result.path &&
        window.confirm('Не удалось прочитать проект. Попробовать резервную копию?')) {
      result = await window.gantt.openProject(result.path, true);
    }
    if (!result.ok) { if (result.code !== 'CANCELLED') setError(result.message); return; }
    const next = result.value.project as Project;
    replace(next, next.plans.at(-1)?.id ?? '');
    pathRef.current = result.value.path; setFilePath(result.value.path);
    setSaveState('saved'); setError('');
  }

  async function saveAs(snapshot = projectRef.current) {
    if (!snapshot) return;
    if (!bridge) { setError('Сохранение файла доступно в Windows-приложении'); return; }
    await queue.current.catch(() => undefined);
    const latest = projectRef.current ?? snapshot;
    const result = await window.gantt.saveProjectAs(latest);
    if (!result.ok) { if (result.code !== 'CANCELLED') setError(result.message); return; }
    pathRef.current = result.value.path; setFilePath(result.value.path);
    setSaveState('saved'); setError('');
  }

  async function saveNow() {
    if (!projectRef.current) return;
    if (!pathRef.current) return saveAs();
    persist(projectRef.current);
    await queue.current.catch(() => undefined);
  }

  function restore(revisionId: string) {
    const current = projectRef.current;
    if (!current) return;
    const next = restoreRevision(current, revisionId, editorName);
    replace(next);
    persist(next);
  }

  function changeEditorName(value: string) {
    setEditorName(value);
    localStorage.setItem('ganttEditorName', value);
  }

  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (saveState === 'unsaved' || saveState === 'error' || saveState === 'saving') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [saveState]);

  return { project, selectedId, setSelectedId, filePath, saveState, error, setError,
    editorName, changeEditorName, apply, newProject, openProject, saveAs, saveNow, restore };
}
