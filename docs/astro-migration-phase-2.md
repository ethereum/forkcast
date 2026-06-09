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

## Per-route decisions

| Route | Approach | Islands kept (directive) | Notes |
|---|---|---|---|
| `/upgrades` | fully static | none (Tooltip is static) | ✅ done |
| `/404` | fully static | none | ✅ already static |
| `/` | static shell + island | `RecentDecisions` (`client:idle`) | runtime artifact fetch stays an island; everything else (upgrades, EIPs, calls, planning, footer) is static HTML |
| `/decisions` | static shell + island | filter pills (`client:load`) | all decisions read at build time from `key_decisions.json`, rendered static; filter toggles visibility |
| `/devnets` | static shell + island | inactive-toggle (`client:load`) | active devnet cards static; toggle reveals inactive cards |
| `/devnets/[id]` | fully static | keyboard-nav `<script>` | all spec/network data resolved in frontmatter; prev/next arrow-key nav is a `define:vars` script |
| `/upgrade/pectra` | static shell + island | EIP filter/list (`client:load`) | header, timeline, notices static; the filterable EIP directory + TOC scroll-spy stays an island |
| `/upgrade/fusaka` | static shell + island | EIP filter/list (`client:load`) | same shape as pectra |
| `/upgrade/hegota` | static shell + island | overview EIP list (`client:load`) | static header + tab bar + timeline; content island |
| `/upgrade/hegota/test-complexity` | static shell + island | `TestComplexityTab` (`client:load`) | live GitHub fetch ⇒ must stay island; header/tab-bar static |
| `/upgrade/glamsterdam` | static shell + island | overview content (`client:load`) | shared `GlamsterdamPageHeader.astro` + tab bar static |
| `/upgrade/glamsterdam/stakeholders` | static shell + island | stakeholder picker (`client:load`) | header/tab-bar static |
| `/upgrade/glamsterdam/client-priority` | static shell + island | priority table (`client:load`) | header/tab-bar static |
| `/upgrade/glamsterdam/devnet-inclusion` | static shell + island | prioritization table (`client:load`) | header/tab-bar static |
| `/upgrade/glamsterdam/test-complexity` | static shell + island | `TestComplexityTab` (`client:load`) | header/tab-bar static |
| `/eips` | static shell + island | EIP table/filters (`client:load`) | static `<h1>`/shell; the filter+sort+paginate table stays one island |
| `/eips/[id]` | static shell + scoped islands | tab controller, spec tab, search (`client:load`) | static meta header + default-tab content; interactive tabs/spec/search are islands |
| `/calls` | static shell + island | filter+timeline (`client:load`) | timezone-dependent today/future split ⇒ island; static `<h1>`/shell |
| `/calls/[type]` | static shell + island | filter+timeline (`client:load`) | same as `/calls`, scoped to the type |
| `/calls/[...path]` | thin shell + island | call workspace (`client:only`/`client:load`) | static identity header; video/transcript/chat workspace stays an island |
| `/agenda` | static shell + island | agenda fetcher (`client:load`) | five runtime-fetched sections stay an island; header/scope static |
| `/rank` | thin shell + island | `RankPage` (`client:load`) | drag-and-drop tier ranking is inherently an app; static disclaimer/footer extracted |
| `/schedule` | thin shell + island | `SchedulePage` (`client:load`) | editable Gantt planner is inherently an app; static `<h1>`/subtitle extracted |

Three routes (`/calls/[...path]`, `/rank`, `/schedule`) are genuinely app-like and stay
mostly-island by design — converting their interactive cores to static HTML would not serve
the content goal and would risk behavior changes. For these we still extract the static
shell (heading, identity, disclaimers) into `.astro` and apply the cleanups below.

## Phase-1-and-beyond cleanups (from `astro-migration-phase-1.md`)

- Replace temporary `<Link to>` with `<a href>` wherever the link is plain cross-page
  navigation; keep `Link` only inside components that remain React islands and genuinely
  need it.
- Remove the React-Router compatibility props from the link helper (`state`, `replace`).
- Narrow `components/navigation.tsx` to only the browser URL state hydrated islands need.
- Move query/hash ownership into page-specific Astro/component primitives where natural.
- Drop the vestigial `loading`/`error`/`refetch` fields from `useDevnetNetworks` and the dead
  loading/error branches in `DevnetsIndexPage`.
- Move `snapshot-routes` to a scheduled committing workflow so deploys are plain `build` off
  committed data.
- Update the `<noscript>` copy and `public/llms.txt` now that route bodies render static HTML.

## Verification

Every conversion is checked against the Phase 1 baseline with an automated pixel-diff harness
(Playwright + pixelmatch) over a representative route set at three variants
(desktop-light, desktop-dark, mobile-light), plus functional spot-checks of each interactive
island (filters, search, tabs, video/timestamp sync, theme, keyboard nav, hover previews).
The bar is zero visual diff and zero behavior change.
