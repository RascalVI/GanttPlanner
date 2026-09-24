import path from 'node:path';
import type { BrowserWindowConstructorOptions } from 'electron';

export const windowOptions: BrowserWindowConstructorOptions = {
  width: 1440,
  height: 900,
  minWidth: 1100,
  minHeight: 700,
  backgroundColor: '#eff5fc',
  icon: path.join(__dirname, '../../assets/app-icon.png'),
  show: false,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  },
};
