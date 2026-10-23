import { configDefaults, defineConfig } from 'vitest/config';

const FRESHNESS = '**/*.freshness.test.?(c|m)[jt]s?(x)';

// Three projects so CI can run them at different points: `unit` needs only the
// compiled data (`npm run compile-data`), `dist` asserts on the output of
// `npm run build`, and `freshness` compares checked-in data against sources that
// move on their own.
//
// `freshness` is deliberately outside the deploy gate, and outside the PR check
// too. Its tests fail when ACD moves an EIP rather than when anyone's code is
// wrong, and `deploy.yml` runs on a daily schedule as well as on push — so
// gating on them would let a routine stage change stop the site rebuilding, on a
// commit that need not have touched either. Run `npm run test:freshness` after a
// stage change: a failure means a checked-in figure needs updating, not fixing.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          exclude: [...configDefaults.exclude, 'tests/**', FRESHNESS],
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
      {
        test: {
          name: 'freshness',
          include: [FRESHNESS],
        },
      },
    ],
  },
});
