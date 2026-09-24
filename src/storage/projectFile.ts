import * as fs from 'node:fs/promises';
import { daysInclusive } from '../domain/dates';
import { validateTask } from '../domain/plans';
import type { Employee, Plan, Project, Revision, Task } from '../domain/types';

type FileIO = Pick<typeof fs, 'open' | 'readFile' | 'copyFile' | 'rename'>;

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === 'string';
}

function requireUniqueIds(items: { id: string }[], label: string): void {
  if (new Set(items.map(item => item.id)).size !== items.length) {
    throw new Error(`Повторяется идентификатор: ${label}`);
  }
}

function validatePlan(value: unknown, employees: Employee[]): Plan {
  if (!object(value) || !text(value.id) || !text(value.title) ||
      !text(value.reportDay) || !text(value.rangeStart) || !text(value.rangeEnd) ||
      !text(value.createdAt) || !Array.isArray(value.tasks)) {
    throw new Error('Повреждены данные плана');
  }
  daysInclusive(value.rangeStart, value.rangeEnd);
  daysInclusive(value.reportDay, value.reportDay);
  const tasks = value.tasks as Task[];
  const employeeIds = new Set(employees.map(item => item.id));
  for (const task of tasks) {
    if (!object(task) || !text(task.id) || !text(task.employeeId) ||
        !text(task.title) || !text(task.shortLabel) ||
        !['waiting', 'active', 'done'].includes(task.status) ||
        !Number.isFinite(task.order) || typeof task.routine !== 'boolean' ||
        (task.linkedTaskId !== null && !text(task.linkedTaskId))) {
      throw new Error('Повреждены данные задачи');
    }
    if (!employeeIds.has(task.employeeId)) throw new Error('Не найден сотрудник задачи');
    validateTask(task);
  }
  requireUniqueIds(tasks, 'задача');
  const taskIds = new Set(tasks.map(item => item.id));
  for (const task of tasks) {
    if (task.linkedTaskId && !taskIds.has(task.linkedTaskId)) {
      throw new Error('Связанная задача не найдена');
    }
  }
  return value as unknown as Plan;
}

export function validateProject(value: unknown): Project {
  if (!object(value) || value.schemaVersion !== 1) {
    throw new Error('Неподдерживаемая версия файла проекта');
  }
  if (!Array.isArray(value.employees) || !Array.isArray(value.plans) || !Array.isArray(value.revisions)) {
    throw new Error('Повреждена структура файла проекта');
  }
  const employees = value.employees as Employee[];
  for (const employee of employees) {
    if (!object(employee) || !text(employee.id) || !text(employee.name) ||
        !text(employee.role) || !Number.isFinite(employee.order) ||
        (employee.archived !== undefined && typeof employee.archived !== 'boolean')) {
      throw new Error('Повреждены данные сотрудника');
    }
  }
  requireUniqueIds(employees, 'сотрудник');
  const plans = value.plans.map(item => validatePlan(item, employees));
  requireUniqueIds(plans, 'план');
  const revisions = value.revisions as Revision[];
  for (const revision of revisions) {
    if (!object(revision) || !text(revision.id) || !text(revision.planId) ||
        !text(revision.at) || !text(revision.action) ||
        (revision.editorName !== null && !text(revision.editorName))) {
      throw new Error('Повреждена история изменений');
    }
    validatePlan(revision.planSnapshot, employees);
  }
  requireUniqueIds(revisions, 'версия');
  return value as unknown as Project;
}

export async function readProject(file: string, io: FileIO = fs): Promise<Project> {
  let parsed: unknown;
  try { parsed = JSON.parse(await io.readFile(file, 'utf8')); }
  catch { throw new Error('Не удалось прочитать файл проекта'); }
  return validateProject(parsed);
}

export async function recoverProject(file: string, io: FileIO = fs): Promise<Project> {
  return readProject(`${file}.bak`, io);
}

export async function writeProject(file: string, project: Project, io: FileIO = fs): Promise<void> {
  validateProject(project);
  const temporary = `${file}.tmp`;
  const handle = await io.open(temporary, 'w');
  try {
    await handle.writeFile(JSON.stringify(project, null, 2), 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await io.copyFile(file, `${file}.bak`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await io.rename(temporary, file);
}
