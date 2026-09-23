import type { ExportScene } from './scene';

export async function drawScene(canvas: HTMLCanvasElement, scene: ExportScene): Promise<Blob> {
  canvas.width = scene.width;
  canvas.height = scene.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Не удалось создать изображение');
  context.textBaseline = 'middle';

  for (const item of scene.items) {
    if (item.type === 'rect') {
      context.fillStyle = `#${item.fill}`;
      if (item.radius) {
        context.beginPath();
        context.roundRect(item.x, item.y, item.w, item.h, item.radius);
        context.fill();
      } else context.fillRect(item.x, item.y, item.w, item.h);
      if (item.stroke) { context.strokeStyle = `#${item.stroke}`; context.strokeRect(item.x, item.y, item.w, item.h); }
    } else if (item.type === 'line') {
      context.beginPath();
      context.moveTo(item.x, item.y);
      context.lineTo(item.x + item.w, item.y + item.h);
      context.strokeStyle = `#${item.color}`;
      context.lineWidth = item.lineWidth ?? 1;
      context.stroke();
    } else {
      context.fillStyle = `#${item.color}`;
      context.font = `${item.bold ? '700' : '400'} ${item.fontSize}px Helvetica, Arial, sans-serif`;
      context.textAlign = item.align ?? 'left';
      const x = item.align === 'center' ? item.x + item.w / 2 : item.align === 'right' ? item.x + item.w : item.x;
      let shown = item.text;
      while (shown.length > 1 && context.measureText(shown).width > item.w) shown = `${shown.slice(0, -2)}…`;
      context.fillText(shown, x, item.y + item.h / 2);
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не удалось сохранить PNG')), 'image/png');
  });
}

export async function sceneDataUrl(scene: ExportScene): Promise<string> {
  const canvas = document.createElement('canvas');
  await drawScene(canvas, scene);
  return canvas.toDataURL('image/png');
}
