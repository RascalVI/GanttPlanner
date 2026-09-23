import { daysBetween, daysInclusive } from '../domain/dates';
import type { Day, Employee, Plan, Task } from '../domain/types';

export type VisibleRow =
  | { key: string; kind: 'employee'; employee: Employee }
  | { key: string; kind: 'task'; employee: Employee; task: Task };

export function buildVisibleRows(plan: Plan, employees: Employee[]): VisibleRow[] {
  return [...employees].sort((a, b) => a.order - b.order).flatMap(employee => {
    const tasks = plan.tasks.filter(task => task.employeeId === employee.id && task.startDay && task.endDay)
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ru'));
    return [
      { key: `employee:${employee.id}`, kind: 'employee' as const, employee },
      ...tasks.map(task => ({ key: `task:${task.id}`, kind: 'task' as const, employee, task })),
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

export function rowHeight(viewportHeight: number, rowCount: number): number {
  if (rowCount === 0) return 46;
  return Math.max(26, Math.min(46, Math.floor((viewportHeight - 300) / rowCount)));
}
