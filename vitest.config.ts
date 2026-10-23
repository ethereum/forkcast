import { configDefaults, defineConfig } from 'vitest/config';

// Two projects so CI can run them at different points: `unit` needs only the
// compiled data (`npm run compile-data`), `dist` asserts on the output of
// `npm run build`.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          exclude: [...configDefaults.exclude, 'tests/**'],
        },
      },
      {
        test: {
          name: 'dist',
          // Mirrors the `unit` exclude below, so a test under tests/ can never
          // fall between the two projects and silently run nowhere.
          include: ['tests/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
        },
      },
    ],
  },
});
