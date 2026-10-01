export const ZOOM_LEVELS = [0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5] as const;

export function zoomStep(current: number, direction: -1 | 1): number {
  if (direction > 0) return ZOOM_LEVELS.find(level => level > current + 0.001) ?? ZOOM_LEVELS.at(-1)!;
  return [...ZOOM_LEVELS].reverse().find(level => level < current - 0.001) ?? ZOOM_LEVELS[0];
}

export function savedZoom(value: string | null): number {
  const parsed = Number(value);
  return ZOOM_LEVELS.find(level => level === parsed) ?? 1;
}
