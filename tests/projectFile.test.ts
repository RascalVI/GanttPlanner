import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readProject, recoverProject, writeProject } from '../src/storage/projectFile';
import type { Project } from '../src/domain/types';

const project: Project = {
  schemaVersion: 1,
  employees: [{ id: 'e1', name: 'Никита', role: 'Дизайн', order: 0 }],
  plans: [{ id: 'p1', title: 'Спринт', reportDay: '2026-09-17', rangeStart: '2026-09-14',
    rangeEnd: '2026-09-27', createdAt: '2026-09-17T10:00:00Z', tasks: [
      { id: 't1', title: 'Верстка портала', shortLabel: 'Портал', employeeId: 'e1',
        startDay: '2026-09-17', endDay: '2026-09-18', status: 'active',
        linkedTaskId: null, routine: false, order: 0 },
    ] }],
  revisions: [],
};

async function inTemp(run: (file: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), 'gantt-test-'));
  try { await run(path.join(directory, 'project.ganttplan')); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

describe('project file', () => {
  it('round trips Cyrillic text and writes a backup before replacement', async () => inTemp(async file => {
    await writeProject(file, project);
    expect((await readProject(file)).plans[0].tasks[0].title).toBe('Верстка портала');
    await writeProject(file, { ...project, plans: [{ ...project.plans[0], title: 'Новый план' }] });
    expect((await readProject(file)).plans[0].title).toBe('Новый план');
    expect((await recoverProject(file)).plans[0].title).toBe('Спринт');
  }));

  it('rejects corrupt data and can recover a valid backup', async () => inTemp(async file => {
    await writeProject(file, project);
    await writeFile(`${file}.bak`, await readFile(file));
    await writeFile(file, '{broken', 'utf8');
    await expect(readProject(file)).rejects.toThrow();
    expect((await recoverProject(file)).plans[0].title).toBe('Спринт');
  }));

  it('leaves the original readable when replacement fails', async () => inTemp(async file => {
    await writeProject(file, project);
    const failing = { ...fs, rename: async (...args: Parameters<typeof rename>) => {
      if (String(args[1]) === file) throw new Error('USB removed');
      return rename(...args);
    } };
    await expect(writeProject(file, { ...project, plans: [] }, failing)).rejects.toThrow('USB removed');
    expect((await readProject(file)).plans).toHaveLength(1);
  }));

  it('rejects unsupported schema and dangling task employee', async () => inTemp(async file => {
    await writeFile(file, JSON.stringify({ ...project, schemaVersion: 2 }), 'utf8');
    await expect(readProject(file)).rejects.toThrow('версия');
    await writeFile(file, JSON.stringify({ ...project, employees: [] }), 'utf8');
    await expect(readProject(file)).rejects.toThrow('сотрудник');
  }));
});
