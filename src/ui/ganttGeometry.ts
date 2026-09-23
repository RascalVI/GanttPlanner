import { daysBetween, daysInclusive } from '../domain/dates';
import type { Day, Employee, Plan, Task } from '../domain/types';

export type VisibleRow =
  | { key: string; kind: 'employee'; employee: Employee }
  | { key: string; kind: 'task'; employee: Employee; task: Task }
  | { key: string; kind: 'routine'; employee: Employee; tasks: Task[] };

export function isTaskInRange(task: Task, rangeStart: Day, rangeEnd: Day): boolean {
  return Boolean(task.startDay && task.endDay && task.endDay >= rangeStart && task.startDay <= rangeEnd);
}

export function buildVisibleRows(plan: Plan, employees: Employee[], onlyInRange = false): VisibleRow[] {
  return [...employees].sort((a, b) => a.order - b.order).flatMap(employee => {
    const tasks = plan.tasks.filter(task => task.employeeId === employee.id && task.startDay && task.endDay &&
      (!onlyInRange || isTaskInRange(task, plan.rangeStart, plan.rangeEnd)))
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ru'));
    const routine = tasks.filter(task => task.routine).sort((a, b) =>
      a.startDay!.localeCompare(b.startDay!) || a.order - b.order);
    return [
      { key: `employee:${employee.id}`, kind: 'employee' as const, employee },
      ...tasks.filter(task => !task.routine).map(task => ({ key: `task:${task.id}`, kind: 'task' as const, employee, task })),
      ...(routine.length ? [{ key: `routine:${employee.id}`, kind: 'routine' as const, employee, tasks: routine }] : []),
    ];
  });
}

export function getBarGeometry(
  task: Task, rangeStart: Day, rangeEnd: Day, dayWidth: number,
): { left: number; width: number } | null {
  if (!task.startDay || !task.endDay) return null;
  daysInclusive(rangeStart, rangeEnd);
  if (task.endDay < rangeStart || task.startDay > rangeEnd) return null;
  const visibleStart = task.startDay < rangeStart ? rangeStart : task.startDay;
  const visibleEnd = task.endDay > rangeEnd ? rangeEnd : task.endDay;
  return {
    left: daysBetween(rangeStart, visibleStart) * dayWidth,
    width: daysInclusive(visibleStart, visibleEnd) * dayWidth,
  };
}

export function rowHeight(gridHeight: number, rowCount: number): number {
  if (rowCount === 0) return 46;
  return Math.max(26, Math.min(46, Math.floor((gridHeight - 84) / rowCount)));
}
