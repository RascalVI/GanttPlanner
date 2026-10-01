import { addDays, daysInclusive, mondayOf } from './dates';
import { commitRevision } from './history';
import { addRoutineTasks, copyPlan, moveTask, planRangeTitle, removeTask, resizeTask, updateTask, weeksInRange } from './plans';
import type { Employee, Plan, Project, Task } from './types';

export type PlannerAction =
  | { type: 'saveTask'; planId: string; task: Task }
  | { type: 'deleteTask'; planId: string; taskId: string }
  | { type: 'moveTask'; planId: string; taskId: string; deltaDays: number }
  | { type: 'assignTask'; planId: string; taskId: string; employeeId: string }
  | { type: 'resizeTask'; planId: string; taskId: string; edge: 'start' | 'end'; deltaDays: number }
  | { type: 'reorderTask'; planId: string; taskId: string; direction: -1 | 1 }
  | { type: 'copyPlan'; sourceId: string; reportDay: string; rangeStart: string; rangeEnd: string }
  | { type: 'changeRange'; planId: string; rangeStart: string; rangeEnd: string }
  | { type: 'renamePlan'; planId: string; title: string }
  | { type: 'addEmployee'; employee: Employee }
  | { type: 'updateEmployee'; employee: Employee }
  | { type: 'removeEmployee'; employeeId: string; replacementEmployeeId?: string };

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
      if (!project.employees.some(item => item.id === action.task.employeeId && !item.archived)) throw new Error('Сотрудник не найден');
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
    case 'assignTask': {
      if (!project.employees.some(item => item.id === action.employeeId && !item.archived)) throw new Error('Сотрудник не найден');
      const plan = project.plans.find(item => item.id === action.planId);
      if (!plan) throw new Error('План не найден');
      const existingTask = findTask(plan, action.taskId);
      if (existingTask.routine) throw new Error('Текучку перенесите через редактор задачи');
      if (existingTask.employeeId === action.employeeId) return project;
      return editPlan(project, action.planId, 'Задача передана другому сотруднику', editorName, current => {
        const order = Math.max(-1, ...current.tasks.filter(item => item.employeeId === action.employeeId)
          .map(item => item.order)) + 1;
        return updateTask(current, { ...existingTask, employeeId: action.employeeId, order });
      });
    }
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
      const next = copyPlan(source, action.reportDay, action.rangeStart, action.rangeEnd,
        project.employees.filter(employee => !employee.archived));
      return commitRevision({ ...project, plans: [...project.plans, next] }, next.id, 'Создана копия плана', editorName);
    }
    case 'changeRange':
      return editPlan(project, action.planId, 'Изменён диапазон дат', editorName, current => {
        daysInclusive(action.rangeStart, action.rangeEnd);
        const existingWeeks = new Set(weeksInRange(current.rangeStart, current.rangeEnd));
        const addedWeeks = weeksInRange(action.rangeStart, action.rangeEnd).filter(week => !existingWeeks.has(week));
        const legacyTitle = `План на ${current.reportDay.split('-').reverse().join('.')}`;
        const automaticTitle = current.title === planRangeTitle(current.rangeStart, current.rangeEnd) ||
          current.title === legacyTitle;
        return { ...current, rangeStart: action.rangeStart, rangeEnd: action.rangeEnd,
          title: automaticTitle ? planRangeTitle(action.rangeStart, action.rangeEnd) : current.title,
          tasks: addRoutineTasks(current.tasks, addedWeeks, project.employees.filter(employee => !employee.archived), action.rangeStart) };
      });
    case 'renamePlan':
      return editPlan(project, action.planId, 'Переименован план', editorName, current => {
        if (!action.title.trim()) throw new Error('Укажите название плана');
        return { ...current, title: action.title.trim() };
      });
    case 'addEmployee': {
      if (project.employees.some(item => item.id === action.employee.id)) throw new Error('Сотрудник уже существует');
      if (!action.employee.name.trim() || !action.employee.role.trim()) throw new Error('Укажите имя и роль участника');
      const next = {
        ...project,
        employees: [...project.employees, action.employee],
        plans: project.plans.map(plan => ({ ...plan, tasks: addRoutineTasks(
          plan.tasks, weeksInRange(plan.rangeStart, plan.rangeEnd), [action.employee], plan.rangeStart,
        ) })),
      };
      return next.plans.reduce((current, plan) => commitRevision(current, plan.id,
        `Добавлен участник ${action.employee.name}`, editorName), next);
    }
    case 'updateEmployee':
      if (!project.employees.some(item => item.id === action.employee.id)) throw new Error('Сотрудник не найден');
      return { ...project, employees: project.employees.map(item => item.id === action.employee.id ? action.employee : item) };
    case 'removeEmployee': {
      const employee = project.employees.find(item => item.id === action.employeeId && !item.archived);
      if (!employee) throw new Error('Участник не найден');
      if (project.employees.filter(item => !item.archived).length < 2) {
        throw new Error('Сначала добавьте другого участника');
      }
      const hasWork = project.plans.some(plan => plan.tasks.some(task =>
        task.employeeId === employee.id && !task.routine));
      const replacement = project.employees.find(item => item.id === action.replacementEmployeeId &&
        !item.archived && item.id !== employee.id);
      if (hasWork && !replacement) throw new Error('Выберите участника для передачи задач');
      if (action.replacementEmployeeId && !replacement) throw new Error('Участник для передачи задач не найден');
      const next = {
        ...project,
        employees: project.employees.map(item => item.id === employee.id ? { ...item, archived: true } : item),
        plans: project.plans.map(plan => {
          const routineIds = new Set(plan.tasks.filter(task => task.employeeId === employee.id && task.routine)
            .map(task => task.id));
          let order = replacement ? Math.max(-1, ...plan.tasks.filter(task => task.employeeId === replacement.id)
            .map(task => task.order)) + 1 : 0;
          return { ...plan, tasks: plan.tasks.filter(task => !routineIds.has(task.id)).map(task => ({
            ...task,
            employeeId: task.employeeId === employee.id ? replacement!.id : task.employeeId,
            order: task.employeeId === employee.id ? order++ : task.order,
            linkedTaskId: task.linkedTaskId && routineIds.has(task.linkedTaskId) ? null : task.linkedTaskId,
          })) };
        }),
      };
      return next.plans.reduce((current, plan) => commitRevision(current, plan.id,
        `Удалён участник ${employee.name}`, editorName), next);
    }
  }
}
