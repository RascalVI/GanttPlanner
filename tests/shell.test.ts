import { describe, expect, it } from 'vitest';
import { windowOptions } from '../electron/windowOptions';

describe('desktop shell', () => {
  it('isolates renderer code', () => {
    expect(windowOptions.webPreferences?.contextIsolation).toBe(true);
    expect(windowOptions.webPreferences?.nodeIntegration).toBe(false);
    expect(windowOptions.webPreferences?.sandbox).toBe(true);
  });
});
