import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

// `base` is left at its default here. The deploy workflow passes `--base` with
// the path GitHub Pages reports, so a project path and a custom domain both work.
export default defineConfig({
  plugins: [svelte()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
