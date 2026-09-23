import { useEffect, useMemo, useRef, useState } from 'react';
import { enumerateDays, localToday, mondayOf, parseDay } from '../domain/dates';
import type { Employee, Plan, Task } from '../domain/types';
import { buildVisibleRows, getBarGeometry, rowHeight } from './ganttGeometry';

export interface GanttGridProps {
  plan: Plan;
  employees: Employee[];
  onOpenTask(task: Task): void;
  onAddTask?(employeeId: string): void;
  onMoveTask?(task: Task, deltaDays: number): void;
  onResizeTask?(task: Task, edge: 'start' | 'end', deltaDays: number): void;
}

const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'UTC' });
const month = new Intl.DateTimeFormat('ru-RU', { month: 'long', timeZone: 'UTC' });

function dateLabel(day: string): string {
  return weekday.format(parseDay(day)).replace('.', '');
}

export function GanttGrid({ plan, employees, onOpenTask, onAddTask, onMoveTask, onResizeTask }: GanttGridProps) {
  const days = useMemo(() => enumerateDays(plan.rangeStart, plan.rangeEnd), [plan.rangeStart, plan.rangeEnd]);
  const rows = useMemo(() => buildVisibleRows(plan, employees), [plan, employees]);
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1500);
  const [height, setHeight] = useState(window.innerHeight - 260);
  const dragRef = useRef<{ task: Task; x: number; mode: 'move' | 'start' | 'end' } | null>(null);
  const skipClick = useRef(false);

  function endDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const delta = Math.round((event.clientX - drag.x) / dayWidth);
    if (!delta) return;
    skipClick.current = true;
    if (drag.mode === 'move') onMoveTask?.(drag.task, delta);
    else onResizeTask?.(drag.task, drag.mode, delta);
  }

  useEffect(() => {
    const update = () => {
      setWidth(container.current?.clientWidth ?? window.innerWidth);
      setHeight(container.current?.clientHeight ?? window.innerHeight - 260);
    };
    update();
    window.addEventListener('resize', update);
    const observer = new ResizeObserver(update);
    if (container.current) observer.observe(container.current);
    return () => { window.removeEventListener('resize', update); observer.disconnect(); };
  }, []);

  const labelWidth = Math.max(310, Math.min(440, Math.round(width * 0.28)));
  const dayWidth = Math.max(32, Math.floor((width - labelWidth) / days.length));
  const tableWidth = labelWidth + dayWidth * days.length;
  const lineHeight = rowHeight(height, rows.length);
  const weeks = days.reduce<{ monday: string; count: number; first: string; last: string }[]>((result, day) => {
    const monday = mondayOf(day);
    const previous = result[result.length - 1];
    if (previous?.monday === monday) { previous.count++; previous.last = day; }
    else result.push({ monday, count: 1, first: day, last: day });
    return result;
  }, []);
  const today = localToday();

  return (
    <div className="gantt-shell" ref={container}>
      <div className="gantt-scroll" aria-label="График задач">
        <div className="gantt-content" style={{ width: tableWidth, ['--label-width' as string]: `${labelWidth}px`, ['--day-width' as string]: `${dayWidth}px` }}>
          <div className="gantt-week-row">
            <div className="gantt-corner">КОМАНДА И ЗАДАЧИ <span>{rows.filter(row => row.kind === 'task').length}</span></div>
            {weeks.map(week => (
              <div key={week.monday} className="gantt-week" style={{ width: week.count * dayWidth }}>
                {Number(week.first.slice(-2))}–{Number(week.last.slice(-2))} {month.format(parseDay(week.last))}
              </div>
            ))}
          </div>
          <div className="gantt-day-row">
            <div className="gantt-day-label">ПЛАН РАБОТ</div>
            {days.map(day => (
              <div key={day} className={`gantt-day ${[0, 6].includes(parseDay(day).getUTCDay()) ? 'weekend' : ''} ${day === today ? 'today' : ''}`} style={{ width: dayWidth }}>
                <span>{dateLabel(day)}</span><b>{Number(day.slice(-2))}</b>
              </div>
            ))}
          </div>
          {rows.map(row => {
            const employeeRow = row.kind === 'employee';
            const geometry = employeeRow ? null : getBarGeometry(row.task, plan.rangeStart, plan.rangeEnd, dayWidth);
            return (
              <div key={row.key} className={`gantt-row ${employeeRow ? 'is-employee' : 'is-task'}`} style={{ height: lineHeight }}>
                <div className="gantt-row-label" style={{ width: labelWidth }}>
                  {employeeRow ? (
                    <><span className="employee-dot" /><strong>{row.employee.name}</strong><small>{row.employee.role}</small><button className="employee-add" title={`Добавить задачу: ${row.employee.name}`} onClick={() => onAddTask?.(row.employee.id)}>+</button></>
                  ) : (
                    <><span className="task-indent" /><button title={row.task.title} onClick={() => onOpenTask(row.task)}>{row.task.title}</button>{row.task.linkedTaskId && <span className="link-mark" title="Связанная задача">↗</span>}</>
                  )}
                </div>
                <div className="gantt-row-days" style={{ width: days.length * dayWidth }}>
                  {days.map(day => <span key={day} className={`${[0, 6].includes(parseDay(day).getUTCDay()) ? 'weekend' : ''} ${day === today ? 'today' : ''}`} style={{ width: dayWidth }} />)}
                  {!employeeRow && geometry && (
                    <button className={`task-bar status-${row.task.status} ${row.task.routine ? 'is-routine' : ''}`}
                      style={{ left: geometry.left + 3, width: Math.max(geometry.width - 6, 12) }}
                      title={`${row.task.title} · ${row.task.startDay}—${row.task.endDay}`}
                      onPointerDown={event => { dragRef.current = { task: row.task, x: event.clientX, mode: (event.target as HTMLElement).dataset.edge as 'start' | 'end' || 'move' }; event.currentTarget.setPointerCapture(event.pointerId); }}
                      onPointerUp={endDrag}
                      onClick={() => { if (skipClick.current) { skipClick.current = false; return; } onOpenTask(row.task); }}>
                      <span className="resize-handle start" data-edge="start" />
                      <span>{row.task.shortLabel || row.task.title}</span>
                      <span className="resize-handle end" data-edge="end" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
