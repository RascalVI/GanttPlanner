import { describe, expect, it } from 'vitest';
import { buildVisibleRows, getBarGeometry, rowHeight } from '../src/ui/ganttGeometry';
import type { Employee, Plan, Task } from '../src/domain/types';

const employee: Employee = { id: 'e1', name: 'Дмитрий', role: 'Верстка', order: 0 };
const task: Task = {
  id: 't1', title: 'Портал', shortLabel: 'Портал', employeeId: 'e1',
  startDay: '2026-09-17', endDay: '2026-09-17', status: 'active',
  linkedTaskId: null, routine: false, order: 0,
};
const plan: Plan = {
  id: 'p1', title: 'План', reportDay: '2026-09-17',
  rangeStart: '2026-09-14', rangeEnd: '2026-09-27', createdAt: '2026-09-17T10:00:00Z',
  tasks: [task],
};

describe('Gantt geometry', () => {
  it('uses one full cell for a one-day task', () => {
    expect(getBarGeometry(task, '2026-09-14', '2026-09-20', 48)).toEqual({ left: 144, width: 48 });
  });

  it('clips bars at visible range edges', () => {
    const long = { ...task, startDay: '2026-09-12', endDay: '2026-09-16' };
    expect(getBarGeometry(long, '2026-09-14', '2026-09-20', 48)).toEqual({ left: 0, width: 144 });
    expect(getBarGeometry({ ...task, startDay: '2026-09-30', endDay: '2026-10-01' }, '2026-09-14', '2026-09-20', 48)).toBeNull();
  });

  it('keeps same-day tasks in their own rows', () => {
    const second = { ...task, id: 't2', startDay: '2026-09-17', endDay: '2026-09-18', order: 1 };
    const rows = buildVisibleRows({ ...plan, tasks: [task, second] }, [employee]);
    expect(rows.map(row => row.key)).toEqual(['employee:e1', 'task:t1', 'task:t2']);
  });

  it('shows weekly routine reservations on one row per employee', () => {
    const first = { ...task, id: 'r1', title: 'Текучка', routine: true, startDay: '2026-09-14', endDay: '2026-09-14' };
    const second = { ...first, id: 'r2', startDay: '2026-09-21', endDay: '2026-09-21', order: 2 };
    const rows = buildVisibleRows({ ...plan, tasks: [task, first, second] }, [employee]);
    expect(rows.map(row => row.key)).toEqual(['employee:e1', 'task:t1', 'routine:e1']);
    const routine = rows.find(row => row.kind === 'routine');
    expect(routine?.kind === 'routine' && routine.tasks.map(item => item.id)).toEqual(['r1', 'r2']);
  });

  it('fits a typical plan without making rows unreadable', () => {
    expect(rowHeight(820, 27)).toBeGreaterThanOrEqual(26);
    expect(rowHeight(820, 27) * 27 + 76).toBeLessThanOrEqual(820);
    expect(rowHeight(700, 40)).toBe(26);
  });
});
