import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { buildExportScenes } from '../src/export/scene';
import { writePptx } from '../src/export/pptx';
import { demoProject } from '../src/ui/demoProject';

describe('PowerPoint export', () => {
  it('writes task bars and text as editable slide shapes', async () => {
    const folder = await mkdtemp(path.join(tmpdir(), 'gantt-pptx-'));
    try {
      const file = path.join(folder, 'report.pptx');
      const plan = demoProject.plans[0];
      await writePptx(buildExportScenes(plan, demoProject.employees, { start: plan.rangeStart, end: plan.rangeEnd }), file);
      const zip = await JSZip.loadAsync(await readFile(file));
      const slide = await zip.file('ppt/slides/slide1.xml')?.async('string');
      expect(slide).toContain('<p:sp>');
      expect(slide).toContain('Нематериальная мотивация');
      expect(slide).toContain('typeface="Century Gothic"');
      expect(slide).not.toContain('<p:pic>');
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });
});
