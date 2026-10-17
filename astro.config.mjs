// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCallIssueRedirects } from './src/domain/calls/callRoutes';
import { getStageChanges } from './src/domain/eips/stageChanges';
import { buildLastmodMap, toLastmod } from './src/domain/sitemap/lastmod';
import { legacyDevnetId } from './scripts/lib/devnet-renames.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Read a file `npm run compile-data` generates. A missing file yields `[]` so a
 * bare editor check still loads the config; a corrupt one (any non-ENOENT error)
 * fails loud rather than silently emptying whatever it feeds.
 */
function readGenerated(relPath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, relPath), 'utf-8'));
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'ENOENT') throw err;
    return [];
  }
}

/** Ids of the scraped devnet specs, which are also their `/networks/{id}` routes. */
function devnetSpecIds() {
  try {
    return fs
      .readdirSync(path.join(__dirname, 'src/data/devnets'))
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace(/\.json$/, ''));
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'ENOENT') throw err;
    return [];
  }
}

// `/calls/{githubIssue}` aliases -> canonical `/calls/{series}/{number}`, derived
// from the compiled call data (run a call sync first). Derivation + invariant test
// live in src/domain/calls/callRoutes.ts.
function callIssueRedirects() {
  try {
    const calls = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'src/data/protocol-calls.generated.json'), 'utf-8'),
    );
    return buildCallIssueRedirects(calls);
  } catch (err) {
    // Skip rather than fail config load if the compiled call data is missing (e.g. a
    // bare editor check). A corrupt file (any non-ENOENT error) fails loud instead of
    // silently dropping every /calls/{issue} redirect.
    if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'ENOENT') throw err;
    return {};
  }
}

// Legacy path and URL aliases (still extended as routes are renamed or retired).
// Static builds emit these as `<meta http-equiv="refresh">` pages. See the
// "Intentional Route Changes" section of docs/astro-migration-phase-1.md.
// Internal targets carry the trailing slash the site serves pages at, so a stub
// lands on the canonical URL rather than one GitHub Pages redirects again.
const legacyRedirects = {
  '/feedback':
    'https://ethereum-magicians.org/t/community-feedback-on-non-headlining-features-in-glamsterdam/26410',
  '/planner': '/schedule/',
  '/glamsterdam': '/upgrade/glamsterdam/',
  '/glamsterdam/priority': '/upgrade/glamsterdam/client-priority/',
  '/glamsterdam/complexity': '/upgrade/glamsterdam/test-complexity/',
  '/priority': '/upgrade/glamsterdam/client-priority/',
  '/complexity': '/upgrade/glamsterdam/test-complexity/',
  '/upgrade/glamsterdam/candidates': '/upgrade/glamsterdam/devnet-inclusion/',
  '/upgrade/glamsterdam/priority': '/upgrade/glamsterdam/client-priority/',
  '/upgrade/glamsterdam/complexity': '/upgrade/glamsterdam/test-complexity/',
  '/upgrade/glamsterdam/devnets': '/upgrade/glamsterdam/devnet-inclusion/',
  '/upgrade/glamsterdam/devnets/priority': '/upgrade/glamsterdam/client-priority/',
  '/upgrade/glamsterdam/devnets/complexity': '/upgrade/glamsterdam/test-complexity/',
  '/devnets': '/networks/',
  // No trailing slash here: Astro matches a dynamic destination against the route
  // itself, and resolves the emitted stub to the canonical URL on its own.
  '/devnets/[id]': '/networks/[id]',
};

/**
 * `/networks/{pre-rename id}` for every devnet whose series ethPandaOps renamed.
 * Those pages were live under the old name and are linked off-site, so they keep
 * resolving to the page under the current one. Derived from the rename map in
 * scripts/lib/devnet-renames.mjs, so a later rename brings its own redirects.
 */
function renamedDevnetRedirects() {
  /** @type {Record<string, string>} */
  const redirects = {};
  for (const id of devnetSpecIds()) {
    const legacyId = legacyDevnetId(id);
    // Trailing slash: the site serves the canonical URL that way, and the stub
    // should land on it rather than on a path GitHub Pages then redirects again.
    if (legacyId) redirects[`/networks/${legacyId}`] = `/networks/${id}/`;
  }
  return redirects;
}

/**
 * Network pages that exist only so a published link survives the network's
 * teardown. An inactive network cartographoor has stripped back to a name and a
 * status renders the series boilerplate and an id, so it stays routable but out of
 * the sitemap. A devnet with a scraped spec keeps its entry either way.
 */
function retiredNetworkRoutes() {
  const snapshot = readGenerated('src/data/generated/networks.json');
  const networks = Array.isArray(snapshot) ? {} : (snapshot.networks ?? {});
  const specIds = new Set(devnetSpecIds());

  return new Set(
    Object.entries(networks)
      .filter(([id, entry]) => entry.status !== 'active' && !specIds.has(id))
      .map(([id]) => `/networks/${id}/`),
  );
}

const retiredRoutes = retiredNetworkRoutes();

// Stamps each call and EIP page with its own content date so crawlers can
// prioritize recrawls. Derivation + the "don't invent dates" rule live in
// src/domain/sitemap/lastmod.ts.
function withLastmod() {
  const lastmod = buildLastmodMap({
    calls: readGenerated('src/data/protocol-calls.generated.json'),
    stageChanges: getStageChanges(readGenerated('src/data/eips.json')),
  });
  return (/** @type {import('@astrojs/sitemap').SitemapItem} */ item) => {
    const date = toLastmod(lastmod.get(new URL(item.url).pathname));
    return date ? { ...item, lastmod: date } : item;
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://forkcast.org',
  output: 'static',
  // GitHub Pages serves directory-format output at the trailing-slash URL and
  // 301s the bare path to it; canonicals and sitemap entries must match that.
  trailingSlash: 'always',
  prefetch: true,
  integrations: [
    react(),
    sitemap({
      filter: (page) => !retiredRoutes.has(new URL(page).pathname),
      serialize: withLastmod(),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    // Milestone statuses derive from the build date (src/utils/milestones.ts).
    // Baked in once so the server render and hydrated islands agree.
    // FORKCAST_BUILD_DATE=YYYY-MM-DD previews the site as of another day.
    define: {
      __BUILD_DATE__: JSON.stringify(process.env.FORKCAST_BUILD_DATE || new Date().toISOString().slice(0, 10)),
    },
  },
  redirects: {
    ...legacyRedirects,
    ...renamedDevnetRedirects(),
    ...callIssueRedirects(),
  },
});
