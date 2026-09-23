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
const RIGHT = 1870;
const CONTENT_TOP = 218;
const ROW_HEIGHT = 28;
const MAX_ROWS = 28;
const MAX_DAYS = 35;

const colors = {
  ink: '183A30', muted: '6E8678', grid: 'E3ECE5', pale: 'F1F6F2', weekend: 'F7F9F7',
  waiting: '9AAEA4', active: '3979A9', done: '50A075', routine: 'A98959', white: 'FFFFFF',
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
  rect(items, 0, 0, WIDTH, HEIGHT, colors.white);
  tx(items, 'ПЛАН РАЗРАБОТКИ СТРАНИЦ ПОРТАЛА', 68, 31, 1200, 25, 15, colors.muted, true);
  tx(items, plan.title, 68, 61, 1330, 53, 36, colors.ink, true);
  tx(items, `ОТЧЁТ ОТ ${plan.reportDay.split('-').reverse().join('.')}`, 1430, 56, 425, 30, 17, colors.ink, true, 'right');
  tx(items, `${start.split('-').reverse().join('.')} — ${end.split('-').reverse().join('.')}`, 1430, 88, 425, 28, 16, colors.muted, false, 'right');
  items.push({ type: 'line', x: 68, y: 127, w: 1802, h: 0, color: 'D9E5DB', lineWidth: 1 });
  tx(items, 'СОТРУДНИК / ЗАДАЧА', 80, 165, 400, 30, 16, colors.muted, true);

  for (let index = 0; index < days.length; index++) {
    const day = days[index];
    const x = LEFT + index * dayWidth;
    const weekend = [0, 6].includes(parseDay(day).getUTCDay());
    if (weekend) rect(items, x, 159, dayWidth, 850, colors.weekend);
    if (index === 0 || mondayOf(day) !== mondayOf(days[index - 1])) {
      const until = days.slice(index).findIndex(next => mondayOf(next) !== mondayOf(day));
      const count = until === -1 ? days.length - index : until;
      tx(items, `${Number(day.slice(-2))}–${Number(days[index + count - 1].slice(-2))} ${new Intl.DateTimeFormat('ru-RU', { month: 'long', timeZone: 'UTC' }).format(parseDay(days[index + count - 1]))}`,
        x + 4, 138, dayWidth * count - 8, 23, 14, colors.ink, true);
    }
    tx(items, String(Number(day.slice(-2))), x + 2, 177, dayWidth - 4, 28, 17,
      weekend ? '8EA094' : colors.ink, true, 'center');
    items.push({ type: 'line', x, y: 207, w: 0, h: rows.length * ROW_HEIGHT + 4, color: colors.grid, lineWidth: 1 });
  }
  items.push({ type: 'line', x: RIGHT, y: 207, w: 0, h: rows.length * ROW_HEIGHT + 4, color: colors.grid, lineWidth: 1 });
  items.push({ type: 'line', x: 68, y: 210, w: 1802, h: 0, color: 'CADBCD', lineWidth: 1 });

  function drawTask(task: Task, y: number) {
    taskIds.push(task.id);
    const visibleStart = task.startDay! < start ? start : task.startDay!;
    const visibleEnd = task.endDay! > end ? end : task.endDay!;
    const x = LEFT + daysBetween(start, visibleStart) * dayWidth + 3;
    const width = daysInclusive(visibleStart, visibleEnd) * dayWidth - 6;
    rect(items, x, y + 5, width, 19, statusColor(task), 'task-bar', task.id, 4);
    if (width >= 45) tx(items, task.shortLabel || task.title, x + 7, y + 7, width - 14, 15, 12, colors.white, true, 'left', 'bar-label', task.id);
  }

  rows.forEach((row, index) => {
    const y = CONTENT_TOP + index * ROW_HEIGHT;
    if (row.kind === 'employee') {
      rect(items, 68, y, 1802, ROW_HEIGHT, colors.pale);
      tx(items, row.employee.name, 80, y + 4, 330, 22, 17, colors.ink, true);
      tx(items, row.employee.role.toUpperCase(), 370, y + 5, 120, 20, 12, colors.muted, true, 'right');
    } else if (row.kind === 'task') {
      tx(items, row.task.title, 98, y + 5, 398, 21, 16, colors.ink, false, 'left', 'task-title', row.task.id);
      drawTask(row.task, y);
    } else {
      tx(items, 'Текучка', 98, y + 5, 398, 21, 16, '866941', true, 'left', 'task-title');
      row.tasks.forEach(task => drawTask(task, y));
    }
    items.push({ type: 'line', x: 68, y: y + ROW_HEIGHT, w: 1802, h: 0, color: colors.grid, lineWidth: .6 });
  });

  const legendY = 1025;
  tx(items, 'СОСТОЯНИЕ ЗАДАЧ', 80, legendY, 200, 22, 13, colors.muted, true);
  ([['Ожидает', colors.waiting], ['В работе', colors.active], ['Выполнена', colors.done], ['Текучка', colors.routine]] as const).forEach(([label, color], index) => {
    const x = 300 + index * 195;
    rect(items, x, legendY + 4, 13, 13, color, undefined, undefined, 3);
    tx(items, label, x + 20, legendY, 150, 23, 14, colors.muted);
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
