import { describe, expect, it } from 'vitest';
import { applyPlannerAction, createProject } from '../src/domain/plannerReducer';
import { restoreRevision } from '../src/domain/history';
import { validateProject } from '../src/storage/projectFile';
import type { Task } from '../src/domain/types';

function setup() {
  return createProject('2026-09-17', [
    { id: 'e1', name: 'Дмитрий', role: 'Верстка', order: 0 },
    { id: 'e2', name: 'Никита', role: 'Дизайн', order: 1 },
  ]);
}

function task(employeeId = 'e1'): Task {
  return { id: 't1', title: 'Страница портала', shortLabel: 'Портал', employeeId,
    startDay: '2026-09-17', endDay: '2026-09-18', status: 'waiting',
    linkedTaskId: null, routine: false, order: 0 };
}

describe('planner actions', () => {
  it('creates a first plan with weekly routine for each employee', () => {
    const project = setup();
    expect(project.plans).toHaveLength(1);
    expect(project.plans[0].tasks.filter(item => item.routine)).toHaveLength(4);
  });

  it('adds, edits and deletes a task with one revision per completed action', () => {
    const initial = setup();
    const id = initial.plans[0].id;
    const added = applyPlannerAction(initial, { type: 'saveTask', planId: id, task: task() }, 'Виктор');
    expect(added.plans[0].tasks.find(item => item.id === 't1')?.title).toBe('Страница портала');
    expect(added.revisions).toHaveLength(initial.revisions.length + 1);
    const edited = applyPlannerAction(added, { type: 'saveTask', planId: id, task: { ...task(), status: 'done' } }, 'Виктор');
    expect(edited.plans[0].tasks.find(item => item.id === 't1')?.status).toBe('done');
    const deleted = applyPlannerAction(edited, { type: 'deleteTask', planId: id, taskId: 't1' }, 'Виктор');
    expect(deleted.plans[0].tasks.some(item => item.id === 't1')).toBe(false);
    expect(deleted.revisions).toHaveLength(initial.revisions.length + 3);
  });

  it('moves and resizes a task by full days', () => {
    const initial = setup();
    const id = initial.plans[0].id;
    const added = applyPlannerAction(initial, { type: 'saveTask', planId: id, task: task() }, null);
    const moved = applyPlannerAction(added, { type: 'moveTask', planId: id, taskId: 't1', deltaDays: 2 }, null);
    expect(moved.plans[0].tasks.find(item => item.id === 't1')?.startDay).toBe('2026-09-19');
    const resized = applyPlannerAction(moved, { type: 'resizeTask', planId: id, taskId: 't1', edge: 'end', deltaDays: 1 }, null);
    expect(resized.plans[0].tasks.find(item => item.id === 't1')?.endDay).toBe('2026-09-21');
  });

  it('transfers a task to another employee without changing its dates and records the change', () => {
    const initial = setup();
    const planId = initial.plans[0].id;
    const added = applyPlannerAction(initial, { type: 'saveTask', planId, task: task() }, null);
    const assigned = applyPlannerAction(added, { type: 'assignTask', planId, taskId: 't1', employeeId: 'e2' }, null);
    expect(assigned.plans[0].tasks.find(item => item.id === 't1')).toMatchObject({
      employeeId: 'e2', startDay: '2026-09-17', endDay: '2026-09-18', status: 'waiting',
    });
    expect(assigned.revisions.at(-1)?.action).toBe('Задача передана другому сотруднику');
    expect(assigned.revisions).toHaveLength(added.revisions.length + 1);
    expect(applyPlannerAction(assigned, { type: 'assignTask', planId, taskId: 't1', employeeId: 'e2' }, null))
      .toBe(assigned);
    expect(() => applyPlannerAction(added, { type: 'assignTask', planId, taskId: 't1', employeeId: 'missing' }, null))
      .toThrow('Сотрудник не найден');
  });

  it('keeps backlog tasks unscheduled until dates are entered and preserves links', () => {
    const initial = setup();
    const id = initial.plans[0].id;
    const first = applyPlannerAction(initial, { type: 'saveTask', planId: id, task: task('e2') }, null);
    const backlog = { ...task(), id: 't2', title: 'Верстка макета', startDay: null, endDay: null, linkedTaskId: 't1' };
    const second = applyPlannerAction(first, { type: 'saveTask', planId: id, task: backlog }, null);
    expect(second.plans[0].tasks.find(item => item.id === 't2')).toMatchObject({ startDay: null, linkedTaskId: 't1' });
    const scheduled = applyPlannerAction(second, { type: 'saveTask', planId: id, task: { ...backlog, startDay: '2026-09-21', endDay: '2026-09-22' } }, null);
    expect(scheduled.plans[0].tasks.find(item => item.id === 't2')?.startDay).toBe('2026-09-21');
  });

  it('adds a participant with routine reservations for each displayed week', () => {
    const initial = setup();
    const next = applyPlannerAction(initial, { type: 'addEmployee', employee: {
      id: 'e3', name: 'София', role: 'Дизайн', order: 2,
    } }, null);
    expect(next.employees.some(item => item.id === 'e3')).toBe(true);
    expect(next.plans[0].tasks.filter(item => item.routine && item.employeeId === 'e3')).toHaveLength(2);
  });

  it('copies a plan independently and does not re-add deleted routine in it', () => {
    const initial = setup();
    const copied = applyPlannerAction(initial, { type: 'copyPlan', sourceId: initial.plans[0].id,
      reportDay: '2026-09-24', rangeStart: '2026-09-21', rangeEnd: '2026-10-04' }, null);
    expect(copied.plans).toHaveLength(2);
    const newPlan = copied.plans[1];
    const routine = newPlan.tasks.find(item => item.routine)!;
    const deleted = applyPlannerAction(copied, { type: 'deleteTask', planId: newPlan.id, taskId: routine.id }, null);
    expect(deleted.plans[1].tasks.some(item => item.id === routine.id)).toBe(false);
    expect(deleted.plans[0].tasks).toEqual(initial.plans[0].tasks);
  });

  it('requires a replacement before removing a participant with work tasks', () => {
    const initial = setup();
    const planId = initial.plans[0].id;
    const withTask = applyPlannerAction(initial, { type: 'saveTask', planId, task: task() }, null);
    expect(() => applyPlannerAction(withTask, { type: 'removeEmployee', employeeId: 'e1' }, null))
      .toThrow('Выберите участника');
    const removed = applyPlannerAction(withTask, { type: 'removeEmployee', employeeId: 'e1', replacementEmployeeId: 'e2' }, null);
    expect(removed.employees.find(item => item.id === 'e1')?.archived).toBe(true);
    expect(removed.plans[0].tasks.find(item => item.id === 't1')?.employeeId).toBe('e2');
    expect(removed.plans[0].tasks.some(item => item.employeeId === 'e1')).toBe(false);
    expect(() => validateProject(removed)).not.toThrow();
  });

  it('keeps an old participant in history and restores them with an older plan', () => {
    let project = setup();
    const planId = project.plans[0].id;
    const initialRevision = project.revisions.find(item => item.planId === planId)!;
    project = applyPlannerAction(project, { type: 'removeEmployee', employeeId: 'e1' }, null);
    expect(project.plans[0].tasks.some(item => item.employeeId === 'e1')).toBe(false);
    expect(project.revisions.some(item => item.planSnapshot.tasks.some(task => task.employeeId === 'e1'))).toBe(true);
    const restored = restoreRevision(project, initialRevision.id, null);
    expect(restored.employees.find(item => item.id === 'e1')?.archived).toBe(false);
    expect(restored.plans[0].tasks.some(item => item.employeeId === 'e1')).toBe(true);
  });

  it('does not add routine for removed participants in copied or extended plans', () => {
    const initial = setup();
    const removed = applyPlannerAction(initial, { type: 'removeEmployee', employeeId: 'e1' }, null);
    const copied = applyPlannerAction(removed, { type: 'copyPlan', sourceId: removed.plans[0].id,
      reportDay: '2026-09-24', rangeStart: '2026-09-21', rangeEnd: '2026-10-04' }, null);
    expect(copied.plans[1].tasks.some(item => item.employeeId === 'e1')).toBe(false);
    const extended = applyPlannerAction(copied, { type: 'changeRange', planId: copied.plans[1].id,
      rangeStart: '2026-09-21', rangeEnd: '2026-10-11' }, null);
    expect(extended.plans[1].tasks.some(item => item.employeeId === 'e1')).toBe(false);
  });

  it('adds routine reservations when the visible range extends into another week', () => {
    const initial = setup();
    const id = initial.plans[0].id;
    const extended = applyPlannerAction(initial, { type: 'changeRange', planId: id,
      rangeStart: '2026-09-14', rangeEnd: '2026-10-04' }, null);
    expect(extended.plans[0].tasks.filter(item => item.routine)).toHaveLength(6);
  });
});
