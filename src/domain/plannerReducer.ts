import { addDays, daysInclusive, mondayOf } from './dates';
import { commitRevision } from './history';
import { addRoutineTasks, copyPlan, moveTask, removeTask, resizeTask, updateTask, weeksInRange } from './plans';
import type { Employee, Plan, Project, Task } from './types';

export type PlannerAction =
  | { type: 'saveTask'; planId: string; task: Task }
  | { type: 'deleteTask'; planId: string; taskId: string }
  | { type: 'moveTask'; planId: string; taskId: string; deltaDays: number }
  | { type: 'resizeTask'; planId: string; taskId: string; edge: 'start' | 'end'; deltaDays: number }
  | { type: 'reorderTask'; planId: string; taskId: string; direction: -1 | 1 }
  | { type: 'copyPlan'; sourceId: string; reportDay: string; rangeStart: string; rangeEnd: string }
  | { type: 'changeRange'; planId: string; rangeStart: string; rangeEnd: string }
  | { type: 'renamePlan'; planId: string; title: string }
  | { type: 'addEmployee'; employee: Employee }
  | { type: 'updateEmployee'; employee: Employee }
  | { type: 'removeEmployee'; employeeId: string };

export function createProject(reportDay: string, employees: Employee[]): Project {
  const start = mondayOf(reportDay);
  const empty: Plan = {
    id: 'blank', title: 'Новый проект', reportDay,
    rangeStart: start, rangeEnd: addDays(start, 13),
    createdAt: new Date().toISOString(), tasks: [],
  };
  const plan = copyPlan(empty, reportDay, start, addDays(start, 13), employees);
  return commitRevision({ schemaVersion: 1, employees: structuredClone(employees), plans: [plan], revisions: [] },
    plan.id, 'Создан первый план', null);
}

function editPlan(project: Project, planId: string, action: string, editorName: string | null,
  transform: (plan: Plan) => Plan): Project {
  const current = project.plans.find(plan => plan.id === planId);
  if (!current) throw new Error('План не найден');
  const changed = transform(current);
  return commitRevision({ ...project, plans: project.plans.map(plan => plan.id === planId ? changed : plan) },
    planId, action, editorName);
}

function findTask(plan: Plan, taskId: string): Task {
  const task = plan.tasks.find(item => item.id === taskId);
  if (!task) throw new Error('Задача не найдена');
  return task;
}

export function applyPlannerAction(project: Project, action: PlannerAction, editorName: string | null): Project {
  switch (action.type) {
    case 'saveTask': {
      if (!project.employees.some(item => item.id === action.task.employeeId)) throw new Error('Сотрудник не найден');
      if (action.task.linkedTaskId === action.task.id) throw new Error('Задача не может ссылаться на себя');
      const plan = project.plans.find(item => item.id === action.planId);
      if (action.task.linkedTaskId && !plan?.tasks.some(item => item.id === action.task.linkedTaskId)) {
        throw new Error('Связанная задача не найдена');
      }
      return editPlan(project, action.planId, 'Сохранена задача', editorName,
        current => updateTask(current, action.task));
    }
    case 'deleteTask':
      return editPlan(project, action.planId, 'Удалена задача', editorName, current => {
        findTask(current, action.taskId);
        return removeTask(current, action.taskId);
      });
    case 'moveTask':
      return editPlan(project, action.planId, 'Передвинута задача', editorName, current =>
        updateTask(current, moveTask(findTask(current, action.taskId), action.deltaDays)));
    case 'resizeTask':
      return editPlan(project, action.planId, 'Изменён срок задачи', editorName, current =>
        updateTask(current, resizeTask(findTask(current, action.taskId), action.edge, action.deltaDays)));
    case 'reorderTask':
      return editPlan(project, action.planId, 'Изменён порядок задач', editorName, current => {
        const task = findTask(current, action.taskId);
        const ordered = current.tasks.filter(item => item.employeeId === task.employeeId && item.startDay)
          .sort((a, b) => a.order - b.order);
        const index = ordered.findIndex(item => item.id === task.id);
        const target = ordered[index + action.direction];
        if (!target) return current;
        return { ...current, tasks: current.tasks.map(item => {
          if (item.id === task.id) return { ...item, order: target.order };
          if (item.id === target.id) return { ...item, order: task.order };
          return item;
        }) };
      });
    case 'copyPlan': {
      const source = project.plans.find(item => item.id === action.sourceId);
      if (!source) throw new Error('Исходный план не найден');
      const next = copyPlan(source, action.reportDay, action.rangeStart, action.rangeEnd, project.employees);
      return commitRevision({ ...project, plans: [...project.plans, next] }, next.id, 'Создана копия плана', editorName);
    }
    case 'changeRange':
      return editPlan(project, action.planId, 'Изменён диапазон дат', editorName, current => {
        daysInclusive(action.rangeStart, action.rangeEnd);
        const existingWeeks = new Set(weeksInRange(current.rangeStart, current.rangeEnd));
        const addedWeeks = weeksInRange(action.rangeStart, action.rangeEnd).filter(week => !existingWeeks.has(week));
        return { ...current, rangeStart: action.rangeStart, rangeEnd: action.rangeEnd,
          tasks: addRoutineTasks(current.tasks, addedWeeks, project.employees, action.rangeStart) };
      });
    case 'renamePlan':
      return editPlan(project, action.planId, 'Переименован план', editorName, current => {
        if (!action.title.trim()) throw new Error('Укажите название плана');
        return { ...current, title: action.title.trim() };
      });
    case 'addEmployee':
      if (project.employees.some(item => item.id === action.employee.id)) throw new Error('Сотрудник уже существует');
      return { ...project, employees: [...project.employees, action.employee] };
    case 'updateEmployee':
      if (!project.employees.some(item => item.id === action.employee.id)) throw new Error('Сотрудник не найден');
      return { ...project, employees: project.employees.map(item => item.id === action.employee.id ? action.employee : item) };
    case 'removeEmployee':
      if (project.plans.some(plan => plan.tasks.some(task => task.employeeId === action.employeeId)) ||
          project.revisions.some(revision => revision.planSnapshot.tasks.some(task => task.employeeId === action.employeeId))) {
        throw new Error('Нельзя удалить сотрудника, у которого есть задачи в планах или истории');
      }
      return { ...project, employees: project.employees.filter(item => item.id !== action.employeeId) };
  }
}
