import { describe, expect, it } from 'vitest';
import { savedZoom, zoomStep } from '../src/ui/zoom';

describe('interface zoom', () => {
  it('moves through browser-like levels with fixed bounds', () => {
    expect(zoomStep(1, 1)).toBe(1.1);
    expect(zoomStep(1, -1)).toBe(.9);
    expect(zoomStep(1.5, 1)).toBe(1.5);
    expect(zoomStep(.75, -1)).toBe(.75);
  });

  it('ignores invalid saved values', () => {
    expect(savedZoom('1.25')).toBe(1.25);
    expect(savedZoom('oops')).toBe(1);
    expect(savedZoom(null)).toBe(1);
  });
});
