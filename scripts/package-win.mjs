import { packager } from '@electron/packager';
import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const paths = await packager({
  dir: root,
  name: 'GanttPlanner',
  out: path.join(root, 'release'),
  icon: path.join(root, 'assets/app.ico'),
  platform: 'win32',
  arch: 'x64',
  overwrite: true,
  asar: true,
  prune: true,
  ignore: [
    /^\/\.git($|\/)/,
    /^\/\.worktrees($|\/)/,
    /^\/\.npm-cache($|\/)/,
    /^\/\.electron-cache($|\/)/,
    /^\/docs($|\/)/,
    /^\/examples($|\/)/,
    /^\/release($|\/)/,
    /^\/scripts($|\/)/,
    /^\/src($|\/)/,
    /^\/tests($|\/)/,
  ],
});
for (const result of paths) {
  await copyFile(path.join(root, 'README.md'), path.join(result, 'README.md'));
  process.stdout.write(`Windows application: ${result}\n`);
}
