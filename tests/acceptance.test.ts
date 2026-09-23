import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createProject, applyPlannerAction } from '../src/domain/plannerReducer';
import { restoreRevision } from '../src/domain/history';
import { buildExportScenes } from '../src/export/scene';
import { readProject, writeProject } from '../src/storage/projectFile';

describe('portable planning flow', () => {
  it('copies an independent plan, saves it, restores a version and lays out an export', async () => {
    const employees = [
      { id: 'e1', name: 'Первый', role: 'Верстка', order: 0 },
      { id: 'e2', name: 'Второй', role: 'Верстка', order: 1 },
      { id: 'e3', name: 'Третий', role: 'Дизайн', order: 2 },
    ];
    const initial = createProject('2026-09-17', employees);
    const copied = applyPlannerAction(initial, { type: 'copyPlan', sourceId: initial.plans[0].id,
      reportDay: '2026-09-24', rangeStart: '2026-09-21', rangeEnd: '2026-10-04' }, 'Редактор');
    const second = copied.plans[1];
    const edited = applyPlannerAction(copied, { type: 'saveTask', planId: second.id,
      task: { id: 'new-task', title: 'Верстка страницы', shortLabel: 'Страница', employeeId: 'e1',
        startDay: '2026-09-24', endDay: '2026-09-25', status: 'active',
        linkedTaskId: null, routine: false, order: 20 } }, 'Редактор');
    expect(edited.plans[0].tasks).toEqual(initial.plans[0].tasks);
    expect(edited.plans[1].tasks.filter(item => item.routine)).toHaveLength(6);
    const restored = restoreRevision(edited, copied.revisions.at(-1)!.id, 'Редактор');
    expect(restored.plans[1].tasks.some(item => item.id === 'new-task')).toBe(false);
    expect(restored.revisions).toHaveLength(edited.revisions.length + 1);
    const folder = await mkdtemp(path.join(tmpdir(), 'gantt-accept-'));
    try {
      const file = path.join(folder, 'project.ganttplan');
      await writeProject(file, edited);
      const reopened = await readProject(file);
      expect(reopened.plans).toHaveLength(2);
      expect(reopened.revisions).toHaveLength(edited.revisions.length);
      const scenes = buildExportScenes(reopened.plans[1], reopened.employees, {
        start: second.rangeStart, end: second.rangeEnd,
      });
      expect(scenes).toHaveLength(1);
      expect(scenes[0].taskIds).toContain('new-task');
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });
});
