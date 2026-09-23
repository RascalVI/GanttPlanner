import { describe, expect, it } from 'vitest';
import { commitRevision, restoreRevision } from '../src/domain/history';
import type { Project } from '../src/domain/types';

const project: Project = {
  schemaVersion: 1,
  employees: [{ id: 'e1', name: 'Дмитрий', role: 'Верстка', order: 0 }],
  plans: [{
    id: 'p1', title: 'Первый план', reportDay: '2026-09-17',
    rangeStart: '2026-09-14', rangeEnd: '2026-09-20', createdAt: '2026-09-17T10:00:00Z',
    tasks: [{ id: 't1', title: 'Портал', shortLabel: 'Портал', employeeId: 'e1',
      startDay: '2026-09-17', endDay: '2026-09-18', status: 'waiting', linkedTaskId: null, routine: false, order: 0 }],
  }],
  revisions: [],
};

describe('plan history', () => {
  it('records committed plan snapshots and restores one as a new revision', () => {
    const first = commitRevision(project, 'p1', 'Создан план', 'Виктор');
    const changed: Project = { ...first, plans: [{ ...first.plans[0], tasks: [
      { ...first.plans[0].tasks[0], title: 'Другой заголовок' },
    ] }] };
    const second = commitRevision(changed, 'p1', 'Переименована задача', 'Виктор');
    const restored = restoreRevision(second, first.revisions[0].id, 'Виктор');
    expect(restored.plans[0].tasks[0].title).toBe('Портал');
    expect(restored.revisions).toHaveLength(3);
    expect(restored.revisions[2].action).toContain('Восстановлена');
    expect(second.plans[0].tasks[0].title).toBe('Другой заголовок');
  });
});
