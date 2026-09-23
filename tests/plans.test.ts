import { describe, expect, it } from 'vitest';
import { addDays, daysInclusive, mondayOf } from '../src/domain/dates';
import { copyPlan, moveTask, resizeTask, updateTask, removeTask } from '../src/domain/plans';
import type { Employee, Plan, Task } from '../src/domain/types';

const employees: Employee[] = [
  { id: 'e1', name: 'Дмитрий', role: 'Верстка', order: 0 },
  { id: 'e2', name: 'Сафия', role: 'Верстка', order: 1 },
  { id: 'e3', name: 'Никита', role: 'Дизайн', order: 2 },
];

const task: Task = {
  id: 't1', title: 'Верстка портала', shortLabel: 'Портал', employeeId: 'e1',
  startDay: '2026-09-17', endDay: '2026-09-19', status: 'waiting',
  linkedTaskId: null, routine: false, order: 0,
};

const source: Plan = {
  id: 'p1', title: 'Отчёт 17.09', reportDay: '2026-09-17',
  rangeStart: '2026-09-14', rangeEnd: '2026-09-20', createdAt: '2026-09-17T10:00:00.000Z',
  tasks: [task],
};

describe('planning dates', () => {
  it('counts inclusive days and finds Monday in UTC', () => {
    expect(daysInclusive('2026-09-17', '2026-09-18')).toBe(2);
    expect(mondayOf('2026-09-17')).toBe('2026-09-14');
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
  });

  it('rejects invalid dates and reversed intervals', () => {
    expect(() => daysInclusive('2026-02-30', '2026-03-01')).toThrow();
    expect(() => daysInclusive('2026-09-19', '2026-09-18')).toThrow();
  });
});

describe('plan operations', () => {
  it('copies the old plan independently and adds weekly routine for each employee', () => {
    const next = copyPlan(source, '2026-09-21', '2026-09-21', '2026-10-04', employees);
    expect(next.id).not.toBe(source.id);
    expect(next.tasks.filter(item => item.routine)).toHaveLength(6);
    expect(next.tasks.find(item => !item.routine)?.startDay).toBe('2026-09-17');
    expect(next.tasks.find(item => !item.routine)?.id).not.toBe('t1');
    expect(source.tasks).toEqual([task]);
  });

  it('does not duplicate an existing routine for the same employee and week', () => {
    const routine: Task = { ...task, id: 'r1', title: 'Текучка', routine: true, startDay: '2026-09-21', endDay: '2026-09-21' };
    const next = copyPlan({ ...source, tasks: [routine] }, '2026-09-21', '2026-09-21', '2026-09-27', employees);
    expect(next.tasks.filter(item => item.routine && item.employeeId === 'e1')).toHaveLength(1);
  });

  it('drops routine reservations from weeks before the copied plan range', () => {
    const routine: Task = { ...task, id: 'r1', title: 'Текучка', routine: true, startDay: '2026-09-14', endDay: '2026-09-14' };
    const next = copyPlan({ ...source, tasks: [routine] }, '2026-09-21', '2026-09-21', '2026-09-27', employees);
    expect(next.tasks.filter(item => item.routine)).toHaveLength(3);
    expect(next.tasks.some(item => item.startDay === '2026-09-14')).toBe(false);
  });

  it('moves and resizes whole days without changing the input', () => {
    expect(moveTask(task, 1)).toMatchObject({ startDay: '2026-09-18', endDay: '2026-09-20' });
    expect(resizeTask(task, 'end', -1).endDay).toBe('2026-09-18');
    expect(() => resizeTask(task, 'end', -3)).toThrow();
    expect(task.startDay).toBe('2026-09-17');
  });

  it('allows two tasks on the same day and keeps edits within the selected plan', () => {
    const second: Task = { ...task, id: 't2', title: 'Статьи', startDay: '2026-09-19', endDay: '2026-09-20', order: 1 };
    const changed = updateTask(source, second);
    expect(changed.tasks).toHaveLength(2);
    expect(changed.tasks[0].endDay).toBe(changed.tasks[1].startDay);
    expect(removeTask(changed, 't1').tasks.map(item => item.id)).toEqual(['t2']);
    expect(source.tasks).toHaveLength(1);
  });
});
