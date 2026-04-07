import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@law': path.resolve(__dirname, 'src/law'),
      '@lattice': path.resolve(__dirname, 'src/lattice'),
      '@mesh': path.resolve(__dirname, 'src/mesh'),
    },
  },
});
