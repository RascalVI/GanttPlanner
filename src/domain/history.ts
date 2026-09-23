import type { Plan, Project, Revision } from './types';

export function commitRevision(project: Project, planId: string, action: string, editorName: string | null): Project {
  const plan = project.plans.find(item => item.id === planId);
  if (!plan) throw new Error('План для записи истории не найден');
  const revision: Revision = {
    id: crypto.randomUUID(), planId,
    at: new Date().toISOString(), action,
    editorName: editorName?.trim() || null,
    planSnapshot: structuredClone(plan),
  };
  return { ...project, revisions: [...project.revisions, revision] };
}

export function restoreRevision(project: Project, revisionId: string, editorName: string | null): Project {
  const revision = project.revisions.find(item => item.id === revisionId);
  if (!revision) throw new Error('Версия плана не найдена');
  const snapshot: Plan = structuredClone(revision.planSnapshot);
  const exists = project.plans.some(item => item.id === snapshot.id);
  const plans = exists
    ? project.plans.map(item => item.id === snapshot.id ? snapshot : item)
    : [...project.plans, snapshot];
  return commitRevision({ ...project, plans }, snapshot.id,
    `Восстановлена версия от ${new Date(revision.at).toLocaleString('ru-RU')}`, editorName);
}
