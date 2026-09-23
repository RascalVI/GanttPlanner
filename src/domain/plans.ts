import { addDays, daysInclusive, mondayOf } from './dates';
import type { Day, Employee, Plan, Task } from './types';

export function validateTask(task: Task): void {
  if (!task.title.trim()) throw new Error('Укажите название задачи');
  if ((task.startDay === null) !== (task.endDay === null)) {
    throw new Error('Укажите обе даты или оставьте задачу в очереди');
  }
  if (task.startDay && task.endDay) daysInclusive(task.startDay, task.endDay);
}

export function updateTask(plan: Plan, task: Task): Plan {
  validateTask(task);
  const exists = plan.tasks.some(item => item.id === task.id);
  const tasks = exists
    ? plan.tasks.map(item => item.id === task.id ? { ...task } : item)
    : [...plan.tasks, { ...task }];
  return { ...plan, tasks };
}

export function removeTask(plan: Plan, taskId: string): Plan {
  return {
    ...plan,
    tasks: plan.tasks.filter(item => item.id !== taskId).map(item =>
      item.linkedTaskId === taskId ? { ...item, linkedTaskId: null } : item,
    ),
  };
}

export function moveTask(task: Task, deltaDays: number): Task {
  if (!task.startDay || !task.endDay) throw new Error('Сначала запланируйте задачу');
  return { ...task, startDay: addDays(task.startDay, deltaDays), endDay: addDays(task.endDay, deltaDays) };
}

export function resizeTask(task: Task, edge: 'start' | 'end', deltaDays: number): Task {
  if (!task.startDay || !task.endDay) throw new Error('Сначала запланируйте задачу');
  const changed = {
    ...task,
    startDay: edge === 'start' ? addDays(task.startDay, deltaDays) : task.startDay,
    endDay: edge === 'end' ? addDays(task.endDay, deltaDays) : task.endDay,
  };
  daysInclusive(changed.startDay, changed.endDay);
  return changed;
}

function weeksInRange(start: Day, end: Day): Day[] {
  daysInclusive(start, end);
  const result: Day[] = [];
  for (let week = mondayOf(start); week <= end; week = addDays(week, 7)) result.push(week);
  return result;
}

export function copyPlan(
  source: Plan,
  reportDay: Day,
  rangeStart: Day,
  rangeEnd: Day,
  employees: Employee[],
): Plan {
  daysInclusive(rangeStart, rangeEnd);
  const weeks = weeksInRange(rangeStart, rangeEnd);
  const sourceTasks = source.tasks.filter(item => !item.routine ||
    (item.startDay && weeks.includes(mondayOf(item.startDay))));
  const idMap = new Map(sourceTasks.map(item => [item.id, crypto.randomUUID()]));
  const tasks: Task[] = sourceTasks.map(item => ({
    ...structuredClone(item),
    id: idMap.get(item.id)!,
    linkedTaskId: item.linkedTaskId ? idMap.get(item.linkedTaskId) ?? null : null,
  }));
  for (const week of weeks) {
    for (const employee of employees) {
      const exists = tasks.some(item => item.routine && item.employeeId === employee.id &&
        item.startDay && mondayOf(item.startDay) === week);
      if (exists) continue;
      const day = week < rangeStart ? rangeStart : week;
      tasks.push({
        id: crypto.randomUUID(), title: 'Текучка', shortLabel: 'Тек', employeeId: employee.id,
        startDay: day, endDay: day, status: 'waiting', linkedTaskId: null,
        routine: true, order: Math.max(-1, ...tasks.filter(item => item.employeeId === employee.id).map(item => item.order)) + 1,
      });
    }
  }
  return {
    id: crypto.randomUUID(),
    title: `План на ${reportDay.split('-').reverse().join('.')}`,
    reportDay, rangeStart, rangeEnd,
    createdAt: new Date().toISOString(),
    tasks,
  };
}
