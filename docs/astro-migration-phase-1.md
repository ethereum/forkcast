# Phase 1 Astro Migration Plan

## Goal

Move Forkcast from a Vite/React Router SPA to an Astro 6 static site foundation. Astro should own routing, layouts, document head, metadata, 404s, sitemap generation, and build/preview/check commands.

Existing React page bodies should keep rendering client-side for this phase, so user-facing behavior on canonical routes stays roughly the same while the routing and document shell become Astro-native. This Phase 1 migration is setting the structure and shell, and later PRs will individually migrate each route into more idiomatic Astro primitives.

## Scope

### 1. Add the Astro static foundation

- Add Astro 6, `@astrojs/react`, `@astrojs/check`, and `@astrojs/sitemap`.
- Configure `output: 'static'` and `site: 'https://forkcast.org'`.
- Keep the output portable for GitHub Pages and Netlify.
- Do not add `@astrojs/netlify` unless a deployment feature requires it.
- Preserve the source/data compilation steps before Astro commands that need generated data:
  - `compile-eips`
  - `compile-search-corpus`
  - `compile-eip-spec-index`
- Replace post-build `dist` mutation with Astro-owned static output:
  - Move the `dist/api/eip-stage-changes.json` behavior into `src/pages/api/eip-stage-changes.json.ts` so Astro emits the API JSON during `astro build`.
  - Extract the stage-change selection logic into a pure data helper if both the endpoint and React UI need it.
  - Remove `scripts/generate-eip-stage-changes.mjs` from the build pipeline once the endpoint owns the API artifact.
  - Do not run `dist`-writing scripts before Astro builds, because `astro build` owns and may clear the output directory.
- Add a new `npm run check` script that runs the source/data compilation steps before `astro check`.
- Replace Vite `dev`, `build`, and `preview` commands with Astro equivalents, while keeping lint, tests, type checks, and source/data compilation in the pipeline.

### 2. Make canonical public URLs real Astro routes

- Add Astro pages for the canonical public routes.
- Canonical static routes include `/`, `/upgrades`, `/schedule`, `/agenda`, `/decisions`, `/devnets`, `/rank`, `/eips`, `/calls`, `/upgrade/pectra`, `/upgrade/fusaka`, `/upgrade/hegota`, `/upgrade/glamsterdam`, `/upgrade/glamsterdam/stakeholders`, `/upgrade/glamsterdam/devnet-inclusion`, `/upgrade/glamsterdam/client-priority`, and `/upgrade/glamsterdam/test-complexity`.
- Use Astro dynamic routes with `getStaticPaths()` for:
  - Canonical EIP pages, excluding pending PR-only EIPs.
  - Protocol call pages, including completed calls and any upcoming call watch URLs linked from the call index.
  - Devnet pages, including local spec IDs and active network IDs from `networks.json` that render network-only pages.
  - Canonical call index scope routes.
- Treat pending PR-only EIPs as external PR records, not canonical Forkcast EIP pages. `/eips` should link them directly to their GitHub PRs, while `/eips/{pendingId}` should use Astro configured redirects to preserve existing shared URLs.
- Use one build-time route/data snapshot for runtime-discovered routes. `getStaticPaths()` and hydrated React islands must share the same upcoming-call and active-network snapshots.
  - Snapshots (`src/data/generated/{upcoming-calls,devnet-networks}.json`) are committed generated data, like the repo's other compiled artifacts. `dev`/`build` read them as-is; `build:fresh` (used by `predeploy` and the deploy workflow) re-runs `snapshot-routes` to refresh them from the live GitHub/cartographoor endpoints first. The script writes only on a successful fetch, so a failed refresh leaves the committed snapshot untouched and exits non-zero — if the deploy's refresh fails, the deploy fails; re-run it once the upstream is reachable.
- Hydrated islands must not create internal links to runtime-only routes that were not emitted in the static build.
- Generate only canonical public URLs plus the new Astro-native call scope URLs.
- Preserve simple legacy aliases with Astro configured redirects in `astro.config.mjs`. Static meta-refresh redirect output is acceptable; Phase 1 does not require HTTP 301/302 redirects.
- Do not preserve backwards-compatibility cruft through SPA fallback, React redirect-only routes, generated legacy alias pages, or `public/_redirects`.

The intentional redirects, replacements, and removals are part of the migration, not accidental regressions. See [Intentional Route Changes](#intentional-route-changes) below.

### 3. Replace concrete call-type aliases with Astro-native scoped routes

The old SPA behavior used fallback handling for URLs like `/calls/acde`, then redirected in React to query-string filters such as `/calls?filter=acde`.

Phase 1 should remove that redirect behavior and replace it with real Astro-generated scoped call index routes. The implementation should prefer path-owned scope over query-string-owned scope:

- `/calls` renders the unfiltered call index.
- `/calls/[type]` renders a concrete call-type scope, such as `/calls/acde`, `/calls/acdc`, `/calls/acdt`, `/calls/bal`, and `/calls/epbs`.

Aggregate filters are not new public routes in Phase 1. Keep aggregate filters as query-string state for now, including `/calls?filter=acd` and `/calls?filter=breakouts`.

Every non-one-off call type gets a real `/calls/[type]` page (so `/calls/bal`, `/calls/epbs`, etc. resolve for direct and shared links). The call index's top-level filter *buttons*, however, only path-route the ACD scopes (`/calls/acde`, `/calls/acdc`, `/calls/acdt`); breakout series (`bal`, `epbs`, `focil`, …) are surfaced through the breakout-type dropdown as query-string state (`/calls?filter=breakouts&breakoutType=bal`) rather than as top-level path-scope buttons. Promoting breakout series to top-level path-scope links is left to Phase 2.

Preserve `/calls/{github-issue-number}` aliases as Astro configured redirects to the canonical `/calls/{series}/{number}` page (replacing the SPA's in-React issue-number redirect). The issue-to-call map is derived from the compiled call data at build time (`src/domain/calls/callRoutes.ts`), so it stays in sync as calls are added rather than being a hand-maintained legacy artifact — the same pattern as the pending-EIP redirects. Canonical call URLs remain `/calls/{series}/{number}`.

### 4. Keep React as the page body layer

- Hydrate current React page bodies as `client:only="react"` islands.
- Remove React Router.
- Pass route-derived values from Astro into React page bodies as props.
- Replace router links/navigation with normal links and small browser navigation helpers where needed.
- Keep browser query/hash state where Phase 1 deliberately leaves state outside Astro routes, such as:
  - Aggregate filters.
  - Tabs.
  - Search.
  - Playback timestamps.
  - Transcript navigation.
  - Selected breakouts.
  - Local filter controls within a page.
- Remove React Router `location.state` dependencies. Any route that must survive reloads needs enough information in the URL or page data.

### 5. Let Astro own document structure

- Move document shell, layout, theme bootstrapping, metadata, page titles, and crawler-visible head tags into Astro.
- Replace client-side meta tag handling and `scripts/generate-static-pages.mjs`.
- Remove SPA route side effects from React, including:
  - SPA fallback normalization.
  - React-owned pageview tracking for route changes.
- Move simple legacy redirects out of React Router and into Astro's configured redirects.
- Move initial pageview tracking into the Astro shell/layout before removing React-owned route tracking.
- Keep React-side analytics only for interaction events.
- Add a polished `src/pages/404.astro` that keeps the shared Astro navigation visible.
- Delete `public/404.html` and `public/_redirects`.

### 6. Simplify crawler and agent files

- Remove "This is a single-page app. " from `<noscript>` copy.
- Keep `public/llms.txt` for now, but rewrite it for the Astro shell. It should be honest that Phase 1 route bodies are still client-rendered React islands and point agents to raw artifacts and source data for page content.
- Use the default `@astrojs/sitemap` output (do not preserve the old hand-written `sitemap.xml` from `generate-static-pages.mjs`). Update `robots.txt` to the Astro sitemap output:

```txt
User-agent: *
Allow: /
Sitemap: https://forkcast.org/sitemap-index.xml
```

### 7. Verify the migration

Run:

- `npm run lint`
- `npm run test`
- `npm run check`
- `npm run build`
- Astro preview for the built site.

Use your built-in browser to carefully spot-check at least:

- Every route in the canonical static route inventory.
- Dynamic route reloads for EIPs, calls, devnets, and call index scopes.
- Pending PR-only EIP links and `/eips/{pendingId}` redirects.
- Network-only devnet routes backed by active `networks.json` IDs.
- Upcoming call watch routes linked from the call index.
- Navigation between pages.
- Theme switching.
- Initial pageview tracking from Astro routes.
- Rank page.
- Call pages.
- Call index scope routes.
- Astro configured redirects for simple legacy aliases.
- Search, playback, timestamp, transcript, hash, tab, and selected-breakout behavior.
- Real 404 behavior.
- The 404 page keeps the shared Astro navigation visible and looks intentionally designed, not like a bare fallback.
- Sitemap generation and robots sitemap discovery.

Confirm the final build has no:

- React Router dependency or imports.
- SPA fallback behavior.
- `public/_redirects`.
- SPA redirect `public/404.html`.
- Generated legacy alias content pages. Astro-generated redirect output for configured redirects (including the `/calls/{github-issue-number}` aliases) is allowed.
- SPA-specific noscript copy.
- SPA-specific `public/llms.txt` guidance.
- Manual `generate-static-pages.mjs` sitemap generation.
- Manual `scripts/generate-eip-stage-changes.mjs` API artifact generation.
- React-owned route/pageview side effects.

Keep this document under `docs/` intentionally.

## Intentional Route Changes

This section records public URLs and SPA-era behaviors that Phase 1 intentionally redirects, removes, or changes. These are not accidental regressions.

### Astro Redirects

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

### Removed Routes

- Unknown paths are no longer normalized into the SPA. Remove the Netlify SPA fallback in `public/_redirects` and the GitHub Pages redirect shim in `public/404.html`; unknown paths should use the real Astro 404 route at `src/pages/404.astro`.

### Changed Routes

- Pending PR-only EIPs become external GitHub PR links from `/eips`; `/eips/{pendingId}` redirects preserve existing shared Forkcast URLs.
- Concrete `/calls/{type}` paths such as `/calls/acde`, `/calls/acdc`, `/calls/acdt`, `/calls/bal`, and `/calls/epbs` become real Astro-generated scoped call index routes instead of React redirects to `/calls?filter={type}`.
- Aggregate call filters remain query-string state in Phase 1.

## Phase 2 and Beyond

Follow-up work for subsequent PRs, as routes move from React bodies into more idiomatic Astro primitives:

- Replace temporary `<Link to="...">` usages with normal `<a href="...">` where the link is just cross-page navigation.
- Remove the React Router compatibility props from the temporary link helper, such as the ignored `state` / `replace`.
- Continue narrowing the navigation helper (`src/components/navigation.tsx`) (and consider renaming) so it exposes only the browser URL state hydrated islands need, not router-shaped abstractions.
- As more routes move from React bodies into Astro, move query/hash ownership into page-specific Astro or component primitives where that becomes natural.
- Drop the now-vestigial `loading` / `error` / `refetch` fields from `useDevnetNetworks` (it derives synchronously from the committed snapshot, so they are permanently `false`/`null`/no-op) and remove the dead loading/error branches in `DevnetsIndexPage`. Kept in Phase 1 only for source-compatibility with the components that still destructure them.
- Refresh the route snapshots (`snapshot-routes`) from a scheduled workflow that commits — like `scrape-devnet-specs.yml` / `sync-call-assets.yml` already do for other generated data — instead of fetching them during the deploy build. Deploys then become plain `build` off committed data: deterministic and never blocked by a third-party outage.

## Astro Docs References

Use the Astro docs as the implementation reference: https://docs.astro.build
