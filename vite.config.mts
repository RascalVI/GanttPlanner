import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  test: { exclude: [...configDefaults.exclude, '**/.worktrees/**'] },
});
