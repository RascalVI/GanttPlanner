# Portable Gantt Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a portable Windows Gantt planner that stores editable weekly plans and their history in one transferable project file and exports matching PNG and editable PPTX reports.

**Architecture:** Electron runs a React renderer with a narrow, context-isolated IPC bridge. Pure TypeScript modules own planning rules, history and export geometry; the Electron main process owns file access and PPTX creation. A versioned JSON project file is written atomically with a backup.

**Tech Stack:** Node.js 24, TypeScript, React, Vite, Electron, Vitest, PptxGenJS, `@electron/packager`; browser Canvas for PNG generation.

**Spec:** `docs/superpowers/specs/2026-09-23-portable-gantt-design.md`

## Global Constraints

- Windows desktop application; no server, internet, subscription or sign-in at runtime.
- Portable application folder with `.exe`; project data is a separate file that can be copied on a USB drive.
- Three employees initially; employee list remains editable.
- Day precision; two tasks may touch the same date for one employee.
- Typical visible range is 1–2 weeks; arbitrary longer ranges and roughly 24 visible rows must work.
- Reference viewport and export canvas: 1920 × 1080; PPTX slide ratio: 16:9.
- History records committed actions and restores as a new version.
- Export text, bars, dates and headings as native editable PowerPoint elements.
- New plans are full independent copies; add one editable routine task per employee per Monday–Sunday week not already covered.
- No automatic dependency shifts or multi-user merging.

## File Map

| Path | Responsibility |
|---|---|
| `package.json`, `tsconfig*.json`, `vite.config.ts` | Scripts, dependency and compilation configuration |
| `electron/main.ts` | Window lifecycle and IPC registration |
| `electron/preload.ts` | Narrow renderer API with context isolation |
| `src/domain/types.ts` | Project, plan, task and history contracts |
| `src/domain/dates.ts` | ISO day arithmetic and week boundaries |
| `src/domain/plans.ts` | Pure task edits, plan copying, routine generation |
| `src/domain/history.ts` | Revision append and restore |
| `src/storage/projectFile.ts` | Validation, atomic save, backup and recovery |
| `src/ui/App.tsx` | App state, file workflow and screen composition |
| `src/ui/GanttGrid.tsx` | Calendar, adaptive rows and visible bars |
| `src/ui/TaskEditor.tsx` | Add/edit task form and relationship selection |
| `src/ui/PlanToolbar.tsx` | Plan selection, copying, date range and export |
| `src/ui/HistoryPanel.tsx` | Revision list, preview and restore |
| `src/ui/styles.css` | Responsive visual system and print-sized layout |
| `src/export/scene.ts` | Shared 16:9 export geometry as text/rect/line primitives |
| `src/export/png.ts` | Draw export scene to browser Canvas |
| `src/export/pptx.ts` | Map export scene to editable PptxGenJS objects |
| `tests/*.test.ts` | Pure rule, storage and export contract tests |

The renderer must never receive unrestricted filesystem APIs. `window.gantt` exposes only `openProject`, `saveProject`, `saveProjectAs`, `exportPptx` and `savePng`. Use `contextIsolation: true`, `nodeIntegration: false`, and no remote content.

---

### Task 1: Runnable Desktop Shell

**Files:** Create `package.json`, `package-lock.json`, `.gitignore`, `tsconfig.json`, `tsconfig.electron.json`, `vite.config.ts`, `index.html`, `electron/main.ts`, `electron/preload.ts`, `electron/windowOptions.ts`, `src/ui/main.tsx`, `src/ui/App.tsx`, `src/ui/global.d.ts`, `src/ui/styles.css`, `tests/shell.test.ts`.

**Interfaces:** Produces `window.gantt` typed in `src/ui/global.d.ts`; initially, calls may return a typed “not implemented” result. Later tasks replace each handler without widening the bridge.

- [ ] **Step 1: Install dependencies and write a failing security test.** Run `npm init -y`, `npm install react react-dom electron pptxgenjs` and `npm install -D typescript vite vitest @types/react @types/react-dom @electron/packager`. Commit the generated lockfile. Set `package.json` scripts to `"test": "vitest"`, `"typecheck": "tsc --noEmit"`, `"build": "vite build && tsc -p tsconfig.electron.json"`, plus working `dev:electron` and `package:win` scripts. Ignore `node_modules/`, `dist/`, `dist-electron/` and `release/`. In `tests/shell.test.ts`, verify that the desktop window cannot expose Node or unrestricted filesystem APIs to the renderer:

```ts
import { describe, expect, it } from 'vitest';
import { windowOptions } from '../electron/windowOptions';

describe('desktop shell', () => {
  it('isolates renderer code', () => {
    expect(windowOptions.webPreferences?.contextIsolation).toBe(true);
    expect(windowOptions.webPreferences?.nodeIntegration).toBe(false);
    expect(windowOptions.webPreferences?.sandbox).toBe(true);
  });
});
```

- [ ] **Step 2: Run `npm test -- --run tests/shell.test.ts`; confirm it fails because `windowOptions` does not exist.**
- [ ] **Step 3: Add the minimal React/Vite/Electron shell.** `electron/windowOptions.ts` exports the tested options. `electron/main.ts` creates one window and loads Vite in development or `dist/index.html` when packaged:

```ts
const win = new BrowserWindow(windowOptions);
await (isDevelopment ? win.loadURL(devServerUrl) : win.loadFile(join(__dirname, '../dist/index.html')));
```

Set `width: 1440`, `height: 900`, `minWidth: 1100`, `minHeight: 700` and the `webPreferences` values above in `windowOptions`, with a preload path resolved from the compiled Electron directory. Use React `createRoot` to render `App`; initially show a toolbar and an empty planning workspace. Declare the five IPC methods on `window.gantt` explicitly in `src/ui/global.d.ts`; give them typed response unions, not `any`. During development, launch Vite and Electron together after Vite's local port is ready; the packaged build loads only local files.
- [ ] **Step 4: Run `npm test -- --run tests/shell.test.ts`, `npm run typecheck`, and `npm run build`; expect all to pass.** Start the app once with `npm run dev:electron` and confirm the window renders without a console error.
- [ ] **Step 5: Commit the shell:** `git add package.json package-lock.json .gitignore tsconfig*.json vite.config.ts index.html electron src/ui tests/shell.test.ts && git commit -m "feat: create portable Gantt desktop shell"`.

### Task 2: Planning Rules and Project Model

**Files:** Create `src/domain/types.ts`, `src/domain/dates.ts`, `src/domain/plans.ts`, `tests/plans.test.ts`.

**Interfaces:** `Project { schemaVersion: 1; employees: Employee[]; plans: Plan[]; revisions: Revision[] }`. `Task` has `id`, `title`, `shortLabel`, `employeeId`, `startDay`, `endDay`, `status`, `linkedTaskId`, `routine`, `order`; unscheduled tasks have both day fields `null`. Export `copyPlan(source, reportDay, rangeStart, rangeEnd, employees): Plan`, `updateTask(plan, task): Plan`, `removeTask(plan, taskId): Plan`, `moveTask(task, deltaDays): Task`, `resizeTask(task, edge, deltaDays): Task`.

- [ ] **Step 1: Write failing tests for inclusive day lengths, Monday week starts, independent copying, routine insertion, same-day overlap and resizing.** Use concrete expectations:

```ts
expect(daysInclusive('2026-09-17', '2026-09-18')).toBe(2);
expect(mondayOf('2026-09-17')).toBe('2026-09-14');
const next = copyPlan(source, '2026-09-21', '2026-09-21', '2026-10-04', employees);
expect(next.tasks.filter(t => t.routine)).toHaveLength(6);
expect(source.tasks).toEqual(originalSourceTasks);
expect(moveTask(task, 1).startDay).toBe('2026-09-18');
expect(resizeTask(task, 'end', -1).endDay).toBe('2026-09-18');
```

- [ ] **Step 2: Run `npm test -- --run tests/plans.test.ts`; confirm missing imports or failed expectations.**
- [ ] **Step 3: Implement dates with UTC-only parsing and formatting.** Reject invalid ISO days and end dates before start dates; use `Date.UTC` and `setUTCDate` to avoid daylight-saving shifts. Implement `copyPlan` with `structuredClone`, new IDs, unchanged dates for copied ordinary tasks, and one routine per employee per ISO week in the new range. Treat an existing routine as covering a week when its start day lies in that week. Keep routine deletion local to that plan.
- [ ] **Step 4: Run the planning tests and typecheck; expect all cases to pass.**
- [ ] **Step 5: Commit:** `git add src/domain tests/plans.test.ts && git commit -m "feat: add planning model and date rules"`.

### Task 3: History and Safe Project Files

**Files:** Create `src/domain/history.ts`, `src/storage/projectFile.ts`, `tests/history.test.ts`, `tests/projectFile.test.ts`. Modify `electron/main.ts`, `electron/preload.ts`, `src/ui/global.d.ts`.

**Interfaces:** `commitRevision(project, planId, action, editorName): Project`; `restoreRevision(project, revisionId, editorName): Project`. `readProject(path): Promise<Project>` validates `schemaVersion` and data invariants. `writeProject(path, project, io = fs): Promise<void>` writes `<path>.tmp`, maintains `<path>.bak`, then replaces the main file. `recoverProject(path): Promise<Project>` reads a valid backup. IPC returns `{ ok: true, project, path } | { ok: false, code, message }`.

- [ ] **Step 1: Write failing tests with a temporary directory and injectable filesystem failure.** Include round-trip Cyrillic text, old plan independence, revision restore as a new revision, unsupported schema, corrupt main file and valid backup, and failed rename that leaves the original intact:

```ts
await writeProject(file, project);
expect((await readProject(file)).plans[0].tasks[0].title).toBe('Верстка портала');
const restored = restoreRevision(changed, firstRevision.id, 'Виктор');
expect(restored.revisions).toHaveLength(changed.revisions.length + 1);
expect(restored.plans[0].tasks).toEqual(firstRevision.planSnapshot.tasks);
```

- [ ] **Step 2: Run `npm test -- --run tests/history.test.ts tests/projectFile.test.ts`; confirm failure.**
- [ ] **Step 3: Implement full plan snapshots per committed action and strict project validation.** Persist a revision only after form save, drag end, plan creation/deletion or restoration. Save with `writeFile(tmp)`, flush and close, copy the valid old main file to `.bak`, then rename the temporary file into place. On Windows, account for destination replacement by using a safe replace sequence and prove the failure path in the test; never delete the only valid copy. Reject malformed dates, duplicate IDs and unknown `schemaVersion` with actionable errors.
- [ ] **Step 4: Connect open/save/save-as IPC.** Use native file dialogs. Keep the current unsaved project in the renderer after a failed save and offer Retry/Save As. For corrupt files, offer recovery from `.bak`. Do not show a successful-save indicator until the main process confirms success.
- [ ] **Step 5: Run both tests, typecheck and build; expect all to pass. Commit:** `git add src/domain/history.ts src/storage electron src/ui/global.d.ts tests && git commit -m "feat: persist plans with history and recovery"`.

### Task 4: Readable Adaptive Gantt Workspace

**Files:** Create `src/ui/GanttGrid.tsx`, `src/ui/PlanToolbar.tsx`, `src/ui/ganttGeometry.ts`, `tests/ganttGeometry.test.ts`; modify `src/ui/App.tsx`, `src/ui/styles.css`.

**Interfaces:** `buildVisibleRows(plan, employees): Row[]`; `getBarGeometry(task, rangeStart, dayWidth): { left: number; width: number } | null`; `rowHeight(viewportHeight, rowCount): number` clamps to a readable minimum. `GanttGrid` receives `plan`, `employees`, `onOpenTask`, `onMoveTask`, `onResizeTask` props.

- [ ] **Step 1: Write failing geometry tests.** Check one-day width, clipped bars at range edges, two bars touching the same day without hiding each other, and 24 rows fitting the 1080px reference viewport:

```ts
expect(getBarGeometry(oneDayTask, '2026-09-14', 48)).toEqual({ left: 144, width: 48 });
expect(rowHeight(1080, 24)).toBeGreaterThanOrEqual(28);
```

- [ ] **Step 2: Run `npm test -- --run tests/ganttGeometry.test.ts`; confirm failure.**
- [ ] **Step 3: Implement a responsive two-column workspace.** Keep the task column fixed enough for full names, use CSS grid for day columns, shade weekends subtly, mark today, group employees, and show neutral/active/done colors with a legend. Use `ResizeObserver` for available height and `rowHeight`; switch to vertical scrolling at the minimum row height. Use tooltips for clipped short labels. At 1920 × 1080 with a 24-row fixture, no vertical scroll should appear.
- [ ] **Step 4: Run geometry tests and build.** Open the renderer at 1920 × 1080 and 2560 × 1600; inspect the grid, text clipping, row density and horizontal date range.
- [ ] **Step 5: Commit:** `git add src/ui tests/ganttGeometry.test.ts && git commit -m "feat: show adaptive Gantt workspace"`.

### Task 5: Editing Tasks and Plans

**Files:** Create `src/ui/TaskEditor.tsx`, `src/ui/BacklogPanel.tsx`, `src/ui/HistoryPanel.tsx`, `src/ui/usePlanner.ts`, `tests/editorFlow.test.ts`; modify `src/ui/App.tsx`, `src/ui/GanttGrid.tsx`, `src/ui/PlanToolbar.tsx`, `src/ui/styles.css`.

**Interfaces:** `usePlanner` exposes `createPlan`, `saveTask`, `deleteTask`, `moveTask`, `resizeTask`, `reorderTask`, `restoreRevision`, `saveProject`. Each completed edit calls pure domain functions, commits one revision and requests one save. The editor accepts tasks with no dates for backlog and optional `linkedTaskId`.

- [ ] **Step 1: Write failing reducer/flow tests for add, edit, delete, status change, backlog scheduling, linkage, reorder, drag and edge resize.** Assert one revision per completed action and no revision while a pointer is merely moving:

```ts
const after = applyPlannerAction(before, { type: 'moveTask', taskId, deltaDays: 2 });
expect(after.revisions).toHaveLength(before.revisions.length + 1);
expect(after.plans[0].tasks.find(t => t.id === taskId)?.startDay).toBe('2026-09-19');
```

- [ ] **Step 2: Run `npm test -- --run tests/editorFlow.test.ts`; confirm failure.**
- [ ] **Step 3: Implement the reducer and UI.** Add a New Project action that starts with three editable employee records and a first blank plan. Forms use full title, short label, employee, dates, status and optional linked task. Add employee add/rename/remove controls; refuse removal while tasks still reference that employee. The backlog panel lists tasks with null dates and lets the user schedule them. Dragging a bar moves whole-day dates; dragging left/right handles changes one edge and cannot invert the interval. A task remains in its own row even if another task of that employee shares a date. Add plan copy flow with report date and visible range; expose history preview and restore with a confirmation showing the target version's date. Store a locally configured editor name with each revision.
- [ ] **Step 4: Connect automatic saving with a visible unsaved/error state.** On write failure, keep project edits in memory and display Retry and Save As; never silently discard edits when the user switches plans or closes the window.
- [ ] **Step 5: Run editor tests, typecheck and build.** Manually exercise mouse and keyboard entry, including a routine task moved and deleted in the new plan. Commit: `git add src/ui tests/editorFlow.test.ts && git commit -m "feat: edit plans tasks and history"`.

### Task 6: Shared Export Layout, Editable PPTX and PNG

**Files:** Create `src/export/scene.ts`, `src/export/png.ts`, `src/export/pptx.ts`, `tests/exportScene.test.ts`, `tests/exportFiles.test.ts`; modify `electron/main.ts`, `electron/preload.ts`, `src/ui/PlanToolbar.tsx`, `src/ui/global.d.ts`.

**Interfaces:** `buildExportScenes(plan, employees, range): ExportScene[]` returns 1920 × 1080 pages of `{ type: 'rect' | 'line' | 'text', ... }` primitives. `drawScene(canvas, scene): Promise<Blob>` renders PNG. `writePptx(scenes, path): Promise<void>` maps each primitive to a native PowerPoint shape or text box; no flattened Gantt image is inserted.

- [ ] **Step 1: Write failing export contract tests.** Check 24 rows fit on one scene, excess rows paginate without dropping task IDs, day positions match UI arithmetic, and every task bar yields a native editable shape:

```ts
const scenes = buildExportScenes(plan24, employees, range);
expect(scenes).toHaveLength(1);
expect(scenes[0].items.filter(i => i.role === 'task-bar')).toHaveLength(24);
expect(buildExportScenes(plan60, employees, range).flatMap(s => s.taskIds)).toHaveLength(60);
```

- [ ] **Step 2: Run `npm test -- --run tests/exportScene.test.ts tests/exportFiles.test.ts`; confirm failure.**
- [ ] **Step 3: Implement a single layout engine.** Use fixed 1920 × 1080 scene units and map them to a wide PowerPoint slide. Include title, report date, employee groups, full task names, days, status legend and short bar labels. Choose legible minimum type sizes; split into pages when that limit is reached. Use Arial for predictable PowerPoint rendering.
- [ ] **Step 4: Implement both renderers.** Canvas draws the primitives at 1920 × 1080 and returns PNG bytes. PptxGenJS creates native `addShape` and `addText` objects for each primitive. The Electron main process asks for output paths and writes the PPTX; the renderer sends only PNG bytes to the bridge for saving. For multi-page export, name PNGs with page suffixes.
- [ ] **Step 5: Run export tests, typecheck and build.** Generate a sample report, validate the PPTX package, open it in Microsoft PowerPoint, move one task bar, edit one label and one day heading, and compare the slide visually with PNG. Commit: `git add src/export electron src/ui tests/exportScene.test.ts tests/exportFiles.test.ts && git commit -m "feat: export editable PowerPoint and PNG"`.

### Task 7: Portable Windows Release and Acceptance

**Files:** Modify `package.json`, `README.md`; create `scripts/package-win.mjs`, `tests/acceptance.test.ts` and a small non-sensitive sample project in `examples/sample.ganttplan`.

**Interfaces:** `npm run package:win` produces `release/GanttPlanner-win32-x64/` with the executable and bundled app assets. `README.md` explains launching, copying the project file, backups, exports and recovery.

- [ ] **Step 1: Write a failing acceptance test that loads the sample project, creates a copied plan, edits a task, restores a revision and generates export scenes.** Assert the old plan remains unchanged and the new plan has routine tasks for every employee/week.
- [ ] **Step 2: Run `npm test -- --run tests/acceptance.test.ts`; confirm failure.**
- [ ] **Step 3: Complete packaging.** Build renderer and Electron code, then call `@electron/packager` for `win32`/`x64` with runtime assets inside the app. Keep the project file outside the application folder. Document that an unsigned executable may trigger a Windows reputation prompt; no paid code-signing service is required to run it.
- [ ] **Step 4: Run `npm test -- --run`, `npm run typecheck`, `npm run build` and `npm run package:win`.** Start the packaged `.exe` on Windows, create a project in one directory, copy the project file to another directory (simulated USB transfer), reopen it and verify plans/history. Repeat the export edit check in PowerPoint. Check the 1920 × 1080 screen capture for legibility and no clipping.
- [ ] **Step 5: Commit:** `git add package.json package-lock.json scripts README.md examples tests/acceptance.test.ts && git commit -m "build: package portable Windows planner"`.

## Self-Review Checklist

- [x] Every spec section maps to a task: model and routine (2), history and file safety (3), screen (4), editing and backlog (5), export (6), portability and acceptance (7).
- [x] All paths and interface names referenced by later tasks are introduced earlier or in the File Map.
- [x] Search the plan for placeholders and ambiguous verbs before execution.
- [ ] Confirm package installation and Windows packaging work in the execution environment before depending on them.
