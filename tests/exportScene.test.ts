import { describe, expect, it } from 'vitest';
import { buildExportScenes } from '../src/export/scene';
import { demoProject } from '../src/ui/demoProject';
import type { Task } from '../src/domain/types';

const base = demoProject.plans[0];
const range = { start: base.rangeStart, end: base.rangeEnd };

describe('shared export layout', () => {
  it('fits a typical 24-task report on one 16:9 page', () => {
    const scenes = buildExportScenes(base, demoProject.employees, range);
    expect(scenes).toHaveLength(1);
    expect(scenes[0]).toMatchObject({ width: 1920, height: 1080 });
    expect(scenes[0].items.filter(item => item.role === 'task-bar')).toHaveLength(24);
    expect(scenes[0].taskIds).toHaveLength(24);
    expect(scenes[0].items.every(item => item.x >= 0 && item.y >= 0)).toBe(true);
  });

  it('paginates many tasks without dropping any', () => {
    const tasks: Task[] = Array.from({ length: 60 }, (_, index) => ({
      ...base.tasks[0], id: `many-${index}`, title: `Задача ${index}`,
      employeeId: demoProject.employees[index % 3].id, order: index,
      startDay: base.rangeStart, endDay: base.rangeEnd,
    }));
    const scenes = buildExportScenes({ ...base, tasks }, demoProject.employees, range);
    expect(scenes.length).toBeGreaterThan(1);
    expect(scenes.flatMap(scene => scene.taskIds)).toHaveLength(60);
    expect(new Set(scenes.flatMap(scene => scene.taskIds)).size).toBe(60);
  });

  it('places bars on the correct date columns and omits backlog tasks', () => {
    const task = { ...base.tasks[0], id: 'single', startDay: '2026-09-17', endDay: '2026-09-17' };
    const backlog = { ...base.tasks[0], id: 'backlog', startDay: null, endDay: null };
    const scene = buildExportScenes({ ...base, tasks: [task, backlog] }, demoProject.employees, range)[0];
    const bar = scene.items.find(item => item.role === 'task-bar');
    expect(bar?.taskId).toBe('single');
    expect(bar?.x).toBeGreaterThan(scene.timelineLeft);
    expect(bar?.w).toBeCloseTo(scene.dayWidth - 6, 1);
  });
});
