# Intentional Route Changes

This file records public URLs and SPA-era behaviors that Phase 1 of the Astro migration intentionally redirects, removes, or changes. These are not accidental regressions.

Keep this document and [astro-migration-phase-1.md](./astro-migration-phase-1.md) under `docs/` intentionally.

## Astro Redirects

Use [Astro configured redirects](https://docs.astro.build/en/reference/configuration-reference/#redirects) for simple legacy aliases. Static meta-refresh redirect output is acceptable; Phase 1 does not require HTTP 301/302 redirects. Do not keep these as React Router routes, generated content pages, `public/_redirects`, or `public/404.html` fallback behavior.

- `/feedback` -> `https://ethereum-magicians.org/t/community-feedback-on-non-headlining-features-in-glamsterdam/26410`
- `/planner` -> `/schedule`
- `/glamsterdam` -> `/upgrade/glamsterdam`
- `/glamsterdam/priority` -> `/upgrade/glamsterdam/client-priority`
- `/glamsterdam/complexity` -> `/upgrade/glamsterdam/test-complexity`
- `/priority` -> `/upgrade/glamsterdam/client-priority`
- `/complexity` -> `/upgrade/glamsterdam/test-complexity`
- `/upgrade/glamsterdam/candidates` -> `/upgrade/glamsterdam/devnet-inclusion`
- `/upgrade/glamsterdam/priority` -> `/upgrade/glamsterdam/client-priority`
- `/upgrade/glamsterdam/complexity` -> `/upgrade/glamsterdam/test-complexity`
- `/upgrade/glamsterdam/devnets` -> `/upgrade/glamsterdam/devnet-inclusion`
- `/upgrade/glamsterdam/devnets/priority` -> `/upgrade/glamsterdam/client-priority`
- `/upgrade/glamsterdam/devnets/complexity` -> `/upgrade/glamsterdam/test-complexity`
- `/calls/{github-issue-number}` -> `/calls/{series}/{number}` for every completed call. This replaces the SPA's in-React issue-number redirect; the alias map is derived from `src/data/protocol-calls.generated.json` at build time (see `src/domain/calls/callRoutes.ts`), so it stays in sync as calls are added rather than being a hand-maintained legacy artifact. One-off calls follow the same rule (e.g. `/calls/1954` -> `/calls/one-off-1954/001`).

## Removed Routes

- Unknown paths are no longer normalized into the SPA. Remove the Netlify SPA fallback in `public/_redirects` and the GitHub Pages redirect shim in `public/404.html`; unknown paths should use the real Astro 404 route at `src/pages/404.astro`.

## Changed Routes

- Pending PR-only EIPs become external GitHub PR links from `/eips`; `/eips/{pendingId}` redirects preserve existing shared Forkcast URLs.
- Concrete `/calls/{type}` paths such as `/calls/acde`, `/calls/acdc`, `/calls/acdt`, `/calls/bal`, and `/calls/epbs` become real Astro-generated scoped call index routes instead of React redirects to `/calls?filter={type}`.
- Aggregate call filters remain query-string state in Phase 1.
