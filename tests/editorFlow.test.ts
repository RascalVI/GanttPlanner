import { describe, expect, it } from 'vitest';
import { applyPlannerAction, createProject } from '../src/domain/plannerReducer';
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

  it('refuses to remove an employee while tasks refer to them', () => {
    const initial = setup();
    expect(() => applyPlannerAction(initial, { type: 'removeEmployee', employeeId: 'e1' }, null)).toThrow('задач');
  });

  it('keeps employees referenced by an older revision', () => {
    let project = setup();
    const planId = project.plans[0].id;
    for (const routine of project.plans[0].tasks.filter(item => item.employeeId === 'e1')) {
      project = applyPlannerAction(project, { type: 'deleteTask', planId, taskId: routine.id }, null);
    }
    expect(project.plans[0].tasks.some(item => item.employeeId === 'e1')).toBe(false);
    expect(() => applyPlannerAction(project, { type: 'removeEmployee', employeeId: 'e1' }, null)).toThrow('истории');
  });

  it('adds routine reservations when the visible range extends into another week', () => {
    const initial = setup();
    const id = initial.plans[0].id;
    const extended = applyPlannerAction(initial, { type: 'changeRange', planId: id,
      rangeStart: '2026-09-14', rangeEnd: '2026-10-04' }, null);
    expect(extended.plans[0].tasks.filter(item => item.routine)).toHaveLength(6);
  });
});
