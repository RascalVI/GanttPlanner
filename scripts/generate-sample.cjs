const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { buildExportScenes } = require('../dist-electron/src/export/scene.js');
const { writePptx } = require('../dist-electron/src/export/pptx.js');

async function main() {
  const root = path.resolve(__dirname, '..');
  const project = JSON.parse(await readFile(path.join(root, 'examples/sample.ganttplan'), 'utf8'));
  const plan = project.plans[0];
  const scenes = buildExportScenes(plan, project.employees, { start: plan.rangeStart, end: plan.rangeEnd });
  await writePptx(scenes, path.join(root, 'examples/sample-export.pptx'));
  process.stdout.write(`Создано слайдов: ${scenes.length}\n`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
