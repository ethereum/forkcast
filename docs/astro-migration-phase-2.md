# Phase 2 Astro Migration Plan

## Goal

Phase 1 set up the Astro routing/shell and hydrated each existing React page body as a
single `client:only="react"` island, so the server-rendered HTML was essentially empty.
Phase 2 finishes the migration: every route is rebuilt as **idiomatic Astro** — static
structure and content render as real HTML at build time (`.astro`), and only genuinely
interactive widgets remain as React islands, each scoped as narrowly as possible with the
correct hydration directive.

The motivation is unchanged from Phase 1: **useful static HTML for LLMs and crawlers**, plus
a codebase that feels built with Astro from the ground up. Phase 2 changes **no** visual UI
and **no** functionality — every route is verified pixel-for-pixel against its Phase 1
rendering (see [Verification](#verification)).

## Constraints that shape every decision

- The site is `output: 'static'` (GitHub Pages / Netlify). There is **no SSR adapter**, so
  Astro **server islands (`server:defer`) are not available**. Every component is therefore
  either build-time static HTML or a client island — there is no third option.
- An undirected framework component renders to static HTML at build time with zero JS, but
  only if it renders safely without a browser. Content that only appears after a
  `useEffect`/fetch, or that reads `window`/`localStorage` during render, cannot be
  server-rendered and must either move to the `.astro` frontmatter (if the data is known at
  build time) or stay in a client island.
- Hydration directives, by intent:
  - `client:load` — interactivity that must work immediately / above the fold.
  - `client:idle` — lower-priority interactivity that can wait for the browser to settle.
  - `client:visible` — below-the-fold / heavy widgets, hydrated on scroll.
  - `client:only="react"` — last resort, only when a component genuinely cannot render
    without a browser (and fixing that is out of scope for a no-behavior-change phase).

## Two conversion strategies

Phase 1 deliberately used `client:only="react"` everywhere to defer SSR-enablement.
Phase 2 applies one of two idiomatic approaches per route, both of which produce real
static HTML for crawlers:

1. **Static `.astro` rewrite** — for pure-content routes, the page body is rewritten as
   `.astro` (zero client JS), with small `<script>`s for any leaf interactivity (filter
   toggles, hover previews, keyboard nav). Used for `/`, `/upgrades`, `/decisions`,
   `/devnets`, `/devnets/[id]`, `/404`.

2. **SSR-rendered island (`client:load`)** — for routes whose content is interactive but
   SSR-safe, the existing React component is server-rendered to static HTML at build time
   and hydrated for interactivity (a normal Astro client island, not `client:only`). The
   recipe: (a) derive build-time data synchronously (`useMemo`/lazy init instead of a
   data-loading `useEffect`); (b) gate URL-param-derived state behind an `isHydrated` flag
   so the client's first render matches the server HTML (no hydration mismatch on deep
   links); (c) flip `client:only` → `client:load`. Used for every `/upgrade/...` page,
   `/eips`, and `/eips/[id]`. (`formatDate` on `/eips` reads the calendar date straight
   from the date string rather than via `new Date()` + local getters, which would shift
   date-only values off-by-one across timezones.)

A few genuinely runtime-dependent routes remain `client:only` islands by design (the user
expected some pages to stay islands): the protocol call pages (`/calls`, `/calls/[type]`,
`/calls/[...path]`) split their timeline by the **viewer's** timezone/clock and the call
viewer reads `window.matchMedia` at init; `/agenda` is driven by runtime artifact fetches
keyed off the current time; `/rank` is a drag-and-drop tier ranker and `/schedule` is a
planning sandbox — both derive their "today" marker / overdue state from `new Date()` during
render. SSR-rendering these would bake a stale build-time date into the HTML and drift across
timezones / past midnight, so they stay client-rendered, exactly as Phase 1 left them.

## Shared primitives

A small set of reusable Astro pieces replace the per-island React equivalents on the
static surfaces. React components that **stay** islands keep using their React versions; the
Astro versions exist only for the static-rendered surfaces.

- `components/ui/Tooltip.astro` — hover tooltip; trigger renders as HTML, the body is cloned
  into a body-level layer on hover and positioned `fixed` (matching the React portal). Text
  via `text`, rich content via the `tooltip` slot.
- `components/ui/StatusBadge.astro`, `components/ui/MacroPhaseBar.astro`,
  `components/ui/UpgradeCard.astro` — faithful static ports of the leaf presentational
  components.
- The decisions / EIP-hover-preview subsystem (`components/decisions/*`) — renders ACD key
  decisions as static HTML with an EIP hover-preview mechanism, shared by `/`, `/decisions`,
  `/agenda`, and call pages.
- A tiny analytics helper for the static surfaces: custom Matomo events (`window._paq`) that
  used to fire from React `onClick`/mount handlers are preserved with `data-` attributes plus
  a small `<script>`, since the layout's `enableLinkTracking()` only covers generic outlinks.
- Cross-page navigation links become plain `<a>` (the Phase 1 `Link` shim is only kept where
  a component remains a React island).

## Per-route outcomes

| Route | Strategy | Notes |
|---|---|---|
| `/` | static `.astro` | upgrades / EIPs / calls / planning / footer + build-time "Recent Decisions" all static; analytics link events via a small script |
| `/upgrades` | static `.astro` | `UpgradeCard.astro` + `MacroPhaseBar.astro` (static `Tooltip.astro`) |
| `/decisions` | static `.astro` | all ACD key decisions read at build time, rendered static; type filter is a visibility-toggle script |
| `/devnets` | static `.astro` | active cards static; "Active only" toggle is a script |
| `/devnets/[id]` | static `.astro` | spec/network data resolved in frontmatter; arrow-key nav via `define:vars` script |
| `/404` | static `.astro` | already static in Phase 1 |
| `/upgrade/pectra` | SSR island (`client:load`) | full EIP directory + timeline server-rendered; `eips` via `useMemo`, filters gated behind `isHydrated` |
| `/upgrade/fusaka` | SSR island (`client:load`) | same as pectra (shared `PublicNetworkUpgradePage`) |
| `/upgrade/hegota` | SSR island (`client:load`) | overview tab server-rendered; tab bar + header in the React shell |
| `/upgrade/hegota/test-complexity` | SSR island (`client:load`) | shell + tab bar server-rendered; live STEEL data still fetches on the client |
| `/upgrade/glamsterdam` | SSR island (`client:load`) | overview tab server-rendered |
| `/upgrade/glamsterdam/stakeholders` | SSR island (`client:load`) | EIP list server-rendered; `?view=` applied after mount (`isHydrated`) |
| `/upgrade/glamsterdam/client-priority` | SSR island (`client:load`) | shell server-rendered; client-stance data fetches on the client |
| `/upgrade/glamsterdam/devnet-inclusion` | SSR island (`client:load`) | prioritization table server-rendered; complexity fetches on the client |
| `/upgrade/glamsterdam/test-complexity` | SSR island (`client:load`) | shell server-rendered; live STEEL data fetches on the client |
| `/eips` | SSR island (`client:load`) | full EIP directory table server-rendered (default sort/filters are deterministic) |
| `/eips/[id]` | SSR island (`client:load`) | default tab content + meta header server-rendered; `?tab=`/`#anchor` applied after mount |
| `/calls` | island (`client:only`) | timeline split by **viewer** timezone/clock + filter URL state — stays client-rendered |
| `/calls/[type]` | island (`client:only`) | same as `/calls`, scoped to the type |
| `/calls/[...path]` | island (`client:only`) | call viewer reads `window.matchMedia` at init + YouTube player; stays client-rendered |
| `/agenda` | island (`client:only`) | five runtime artifact fetches keyed off the current time |
| `/rank` | island (`client:only`) | drag-and-drop tier ranker derived from `new Date()` |
| `/schedule` | island (`client:only`) | planning Gantt + overdue cells read `new Date()` during render — stays client-rendered |

17 of the 23 routes now render their full content as static HTML (6 as `.astro`, 11 as
SSR-rendered `client:load` islands). The remaining 6 are the genuinely runtime/timezone/clock
dependent routes and stay `client:only` by design.

## Phase-1-and-beyond cleanups (from `astro-migration-phase-1.md`)

- ✅ Removed the React-Router compatibility props (`state`, `replace`) from the `Link` helper
  and the dead `state` `NavigateOption`; narrowed `components/navigation.tsx`.
- ✅ Dropped the now-vestigial `useDevnetNetworks` hook entirely (its only caller,
  `DevnetsIndexPage`, was rewritten as `.astro`) — removing the dead loading/error branches.
- ✅ Moved `snapshot-routes` to a scheduled committing workflow (`snapshot-routes.yml`);
  `deploy.yml` and `predeploy` now run plain `build` off the committed snapshots.
- ✅ Updated the `<noscript>` copy and `public/llms.txt` to reflect that most route bodies
  now render as static HTML.
- ✅ Within the routes converted to `.astro`, cross-page `<Link to>` became plain `<a href>`.
  Remaining: routes still rendered as React islands continue to use `Link`/the navigation
  helper (they genuinely read browser URL state); narrowing those further is left for when
  each is converted. Likewise, query/hash ownership stays in the islands that remain.

## Verification

Every conversion is checked against the Phase 1 baseline with an automated pixel-diff harness
(Playwright + pixelmatch) over a representative route set at three variants
(desktop-light, desktop-dark, mobile-light), plus functional spot-checks of each interactive
island (filters, search, tabs, video/timestamp sync, theme, keyboard nav, hover previews).
The bar is zero visual diff and zero behavior change.
