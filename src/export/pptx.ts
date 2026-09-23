import pptxgen from 'pptxgenjs';
import type { ExportScene } from './scene';

const UNITS_PER_INCH = 144;

export async function writePptx(scenes: ExportScene[], file: string): Promise<void> {
  const presentation = new pptxgen();
  presentation.layout = 'LAYOUT_WIDE';
  presentation.author = 'Планы разработки страниц';
  presentation.subject = 'План разработки страниц портала';
  presentation.title = 'График задач команды';
  for (const scene of scenes) {
    const slide = presentation.addSlide();
    slide.background = { color: 'FFFFFF' };
    for (const item of scene.items) {
      const x = item.x / UNITS_PER_INCH;
      const y = item.y / UNITS_PER_INCH;
      const w = item.w / UNITS_PER_INCH;
      const h = item.h / UNITS_PER_INCH;
      if (item.type === 'rect') {
        slide.addShape(item.radius ? presentation.ShapeType.roundRect : presentation.ShapeType.rect, {
          x, y, w, h, rectRadius: item.radius ? item.radius / UNITS_PER_INCH : undefined,
          fill: { color: item.fill },
          line: item.stroke ? { color: item.stroke, width: .5 } : { color: item.fill, transparency: 100 },
          shapeName: item.taskId ? `Задача ${item.taskId}` : undefined,
        });
      } else if (item.type === 'line') {
        slide.addShape(presentation.ShapeType.line, {
          x, y, w, h, line: { color: item.color, width: item.lineWidth ?? 1 },
        });
      } else {
        slide.addText(item.text, {
          x, y, w, h, margin: 0, fontFace: 'Arial', fontSize: item.fontSize * .75,
          bold: item.bold ?? false, color: item.color, align: item.align ?? 'left',
          breakLine: false, valign: 'middle',
        });
      }
    }
  }
  await presentation.writeFile({ fileName: file });
}
