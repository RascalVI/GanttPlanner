import type { Day } from './types';

const DAY_MS = 86_400_000;

export function parseDay(day: Day): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`Неверная дата: ${day}`);
  const [year, month, date] = day.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, date));
  if (parsed.toISOString().slice(0, 10) !== day) throw new Error(`Неверная дата: ${day}`);
  return parsed;
}

export function formatDay(date: Date): Day {
  return date.toISOString().slice(0, 10);
}

export function localToday(): Day {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function addDays(day: Day, amount: number): Day {
  if (!Number.isInteger(amount)) throw new Error('Сдвиг должен быть целым числом дней');
  return formatDay(new Date(parseDay(day).getTime() + amount * DAY_MS));
}

export function daysBetween(start: Day, end: Day): number {
  return (parseDay(end).getTime() - parseDay(start).getTime()) / DAY_MS;
}

export function daysInclusive(start: Day, end: Day): number {
  const count = daysBetween(start, end) + 1;
  if (count < 1) throw new Error('Дата окончания раньше даты начала');
  return count;
}

export function mondayOf(day: Day): Day {
  const weekday = parseDay(day).getUTCDay();
  return addDays(day, -(weekday === 0 ? 6 : weekday - 1));
}

export function enumerateDays(start: Day, end: Day): Day[] {
  const length = daysInclusive(start, end);
  return Array.from({ length }, (_, index) => addDays(start, index));
}
