import { addDays, daysBetween, daysInclusive, enumerateDays, mondayOf, parseDay } from '../domain/dates';
import type { Day, Employee, Plan, Task } from '../domain/types';

interface BaseItem { x: number; y: number; w: number; h: number; role?: string; taskId?: string; }
export interface RectItem extends BaseItem { type: 'rect'; fill: string; stroke?: string; radius?: number; }
export interface TextItem extends BaseItem { type: 'text'; text: string; color: string; fontSize: number; bold?: boolean; align?: 'left' | 'center' | 'right'; }
export interface LineItem extends BaseItem { type: 'line'; color: string; lineWidth?: number; }
export type ExportItem = RectItem | TextItem | LineItem;
export interface ExportScene {
  width: 1920;
  height: 1080;
  items: ExportItem[];
  taskIds: string[];
  timelineLeft: number;
  dayWidth: number;
}

type Row = { kind: 'employee'; employee: Employee } | { kind: 'task'; employee: Employee; task: Task } |
  { kind: 'routine'; employee: Employee; tasks: Task[] };
const WIDTH = 1920;
const HEIGHT = 1080;
const LEFT = 520;
const RIGHT = 1848;
const CONTENT_TOP = 227;
const ROW_HEIGHT = 26;
const MAX_ROWS = 29;
const MAX_DAYS = 35;

const colors = {
  ink: '1B2947', muted: '637590', grid: 'DCE6F4', pale: 'EAF2FE', weekend: 'F2F6FD',
  waiting: '71839F', active: '477CE3', done: '7165D9', routine: '479DBB', white: 'FFFFFF',
};

function tx(items: ExportItem[], text: string, x: number, y: number, w: number, h: number,
  fontSize: number, color = colors.ink, bold = false, align: TextItem['align'] = 'left', role?: string, taskId?: string) {
  items.push({ type: 'text', text, x, y, w, h, fontSize, color, bold, align, role, taskId });
}

function rect(items: ExportItem[], x: number, y: number, w: number, h: number, fill: string,
  role?: string, taskId?: string, radius = 0) {
  items.push({ type: 'rect', x, y, w, h, fill, role, taskId, radius });
}

function rowsFor(plan: Plan, employees: Employee[], start: Day, end: Day): Row[] {
  return [...employees].sort((a, b) => a.order - b.order).flatMap(employee => {
    const tasks = plan.tasks.filter(task => task.employeeId === employee.id && task.startDay && task.endDay &&
      task.endDay >= start && task.startDay <= end).sort((a, b) => a.order - b.order);
    const routine = tasks.filter(task => task.routine).sort((a, b) =>
      a.startDay!.localeCompare(b.startDay!) || a.order - b.order);
    return [
      { kind: 'employee' as const, employee },
      ...tasks.filter(task => !task.routine).map(task => ({ kind: 'task' as const, employee, task })),
      ...(routine.length ? [{ kind: 'routine' as const, employee, tasks: routine }] : []),
    ];
  });
}

function pagesForRows(rows: Row[]): Row[][] {
  const pages: Row[][] = [];
  let current: Row[] = [];
  for (const row of rows) {
    if (current.length >= MAX_ROWS || (row.kind === 'employee' && current.length === MAX_ROWS - 1)) {
      pages.push(current);
      current = [];
    }
    if (current.length === 0 && row.kind !== 'employee') current.push({ kind: 'employee', employee: row.employee });
    current.push(row);
  }
  if (current.length) pages.push(current);
  return pages;
}

function statusColor(task: Task): string {
  if (task.routine) return colors.routine;
  return colors[task.status];
}

function drawPage(plan: Plan, rows: Row[], start: Day, end: Day, page: number, total: number): ExportScene {
  const items: ExportItem[] = [];
  const taskIds: string[] = [];
  const days = enumerateDays(start, end);
  const dayWidth = (RIGHT - LEFT) / days.length;
  rect(items, 0, 0, WIDTH, HEIGHT, 'F2F7FD');
  rect(items, 32, 24, 1856, 1032, 'DDE9F8', undefined, undefined, 30);
  rect(items, 56, 48, 1808, 108, 'C5D8F6', undefined, undefined, 24);
  rect(items, 70, 61, 1150, 82, 'D5E3FA', undefined, undefined, 19);
  tx(items, 'ПЛАН РАЗРАБОТКИ СТРАНИЦ ПОРТАЛА', 90, 66, 1150, 23, 14, '526B9E', true);
  tx(items, plan.title, 90, 91, 1290, 43, 34, colors.ink, true);
  rect(items, 1463, 69, 368, 67, 'EDF4FE', undefined, undefined, 19);
  tx(items, `ОТЧЁТ ОТ ${plan.reportDay.split('-').reverse().join('.')}`, 1483, 78, 327, 22, 16, colors.ink, true, 'right');
  tx(items, `${start.split('-').reverse().join('.')} — ${end.split('-').reverse().join('.')}`, 1483, 105, 327, 20, 14, colors.muted, false, 'right');
  rect(items, 56, 169, 1808, 833, 'F9FBFF', undefined, undefined, 24);
  rect(items, 70, 181, 1780, 42, 'E9F1FD', undefined, undefined, 13);
  tx(items, 'СОТРУДНИК / ЗАДАЧА', 88, 187, 400, 28, 15, colors.muted, true);

  for (let index = 0; index < days.length; index++) {
    const day = days[index];
    const x = LEFT + index * dayWidth;
    const weekend = [0, 6].includes(parseDay(day).getUTCDay());
    if (weekend) rect(items, x, 224, dayWidth, 772, colors.weekend);
    if (index === 0 || mondayOf(day) !== mondayOf(days[index - 1])) {
      const until = days.slice(index).findIndex(next => mondayOf(next) !== mondayOf(day));
      const count = until === -1 ? days.length - index : until;
      tx(items, `${Number(day.slice(-2))}–${Number(days[index + count - 1].slice(-2))} ${new Intl.DateTimeFormat('ru-RU', { month: 'long', timeZone: 'UTC' }).format(parseDay(days[index + count - 1]))}`,
        x + 4, 184, dayWidth * count - 8, 17, 12, colors.ink, true);
    }
    tx(items, String(Number(day.slice(-2))), x + 2, 204, dayWidth - 4, 19, 15,
      weekend ? '8C9CB4' : colors.ink, true, 'center');
    items.push({ type: 'line', x, y: 224, w: 0, h: rows.length * ROW_HEIGHT + 3, color: colors.grid, lineWidth: 1 });
  }
  items.push({ type: 'line', x: RIGHT, y: 224, w: 0, h: rows.length * ROW_HEIGHT + 3, color: colors.grid, lineWidth: 1 });
  items.push({ type: 'line', x: 70, y: 224, w: 1780, h: 0, color: 'CEDDF0', lineWidth: 1 });

  function drawTask(task: Task, y: number) {
    taskIds.push(task.id);
    const visibleStart = task.startDay! < start ? start : task.startDay!;
    const visibleEnd = task.endDay! > end ? end : task.endDay!;
    const x = LEFT + daysBetween(start, visibleStart) * dayWidth + 3;
    const width = daysInclusive(visibleStart, visibleEnd) * dayWidth - 6;
    rect(items, x, y + 4, width, 18, statusColor(task), 'task-bar', task.id, 8);
    if (width >= 48) tx(items, task.shortLabel || task.title, x + 8, y + 5, width - 16, 17, 11, colors.white, true, 'left', 'bar-label', task.id);
  }

  rows.forEach((row, index) => {
    const y = CONTENT_TOP + index * ROW_HEIGHT;
    if (row.kind === 'employee') {
      rect(items, 70, y, 1780, ROW_HEIGHT, colors.pale);
      rect(items, 84, y + 9, 7, 7, '5E83DF', undefined, undefined, 4);
      tx(items, row.employee.name, 102, y + 2, 305, 22, 15, colors.ink, true);
      tx(items, row.employee.role.toUpperCase(), 367, y + 3, 120, 20, 10, colors.muted, true, 'right');
    } else if (row.kind === 'task') {
      tx(items, row.task.title, 101, y + 3, 392, 20, 14, colors.ink, false, 'left', 'task-title', row.task.id);
      drawTask(row.task, y);
    } else {
      tx(items, 'Текучка', 101, y + 3, 392, 20, 14, '337F9D', true, 'left', 'task-title');
      row.tasks.forEach(task => drawTask(task, y));
    }
    items.push({ type: 'line', x: 70, y: y + ROW_HEIGHT, w: 1780, h: 0, color: colors.grid, lineWidth: .6 });
  });

  const legendY = 1018;
  tx(items, 'СОСТОЯНИЕ ЗАДАЧ', 80, legendY, 200, 22, 12, colors.muted, true);
  ([['Ожидает', colors.waiting], ['В работе', colors.active], ['Выполнена', colors.done], ['Текучка', colors.routine]] as const).forEach(([label, color], index) => {
    const x = 300 + index * 195;
    rect(items, x, legendY + 4, 13, 13, color, undefined, undefined, 6);
    tx(items, label, x + 20, legendY, 150, 23, 13, colors.ink);
  });
  tx(items, `${page} / ${total}`, 1760, legendY, 105, 23, 14, colors.muted, false, 'right');
  return { width: WIDTH, height: HEIGHT, items, taskIds, timelineLeft: LEFT, dayWidth };
}

export function buildExportScenes(plan: Plan, employees: Employee[], range: { start: Day; end: Day }): ExportScene[] {
  const count = daysInclusive(range.start, range.end);
  const dateSegments = Array.from({ length: Math.ceil(count / MAX_DAYS) }, (_, index) => {
    const start = addDays(range.start, index * MAX_DAYS);
    const end = addDays(start, Math.min(MAX_DAYS, count - index * MAX_DAYS) - 1);
    return { start, end };
  });
  const pages = dateSegments.flatMap(segment => pagesForRows(rowsFor(plan, employees, segment.start, segment.end))
    .map(rows => ({ ...segment, rows })));
  return pages.map((item, index) => drawPage(plan, item.rows, item.start, item.end, index + 1, pages.length));
}
