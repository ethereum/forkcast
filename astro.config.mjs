// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCallIssueRedirects } from './src/domain/calls/callRoutes';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Reads a JSON file produced by `compile-data` (which every `astro` script runs
 * first). Returns `fallback` when the file isn't there yet — e.g. an editor or
 * language server evaluating this config on a fresh checkout. A real build always
 * compiles first, and the emitted pages import this data directly, so a genuinely
 * missing file fails the build loudly rather than shipping a quietly-wrong site.
 */
function readCompiledData(relativePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, relativePath), 'utf-8'));
  } catch {
    return fallback;
  }
}

// Pending PR-only EIPs are external PR records, not canonical Forkcast pages.
// `/eips/{pendingId}` redirects to the GitHub PR so previously-shared URLs keep
// resolving.
function pendingEipRedirects() {
  /** @type {Record<string, string>} */
  const out = {};
  for (const eip of readCompiledData('src/data/eips.json', [])) {
    if (eip?.pendingPullRequest?.url) {
      out[`/eips/${eip.id}`] = eip.pendingPullRequest.url;
    }
  }
  return out;
}

// `/calls/{githubIssue}` aliases -> canonical `/calls/{series}/{number}`, derived
// from the compiled call data. Derivation + invariant test live in
// src/domain/calls/callRoutes.ts.
function callIssueRedirects() {
  return buildCallIssueRedirects(
    readCompiledData('src/data/protocol-calls.generated.json', []),
  );
}

// Hand-maintained path and URL aliases, extended as routes are renamed or retired.
// Static builds emit these as `<meta http-equiv="refresh">` pages. See
// intentional-feature-removals.md.
const aliasRedirects = {
  '/feedback':
    'https://ethereum-magicians.org/t/community-feedback-on-non-headlining-features-in-glamsterdam/26410',
  '/planner': '/schedule',
  '/glamsterdam': '/upgrade/glamsterdam',
  '/glamsterdam/priority': '/upgrade/glamsterdam/client-priority',
  '/glamsterdam/complexity': '/upgrade/glamsterdam/test-complexity',
  '/priority': '/upgrade/glamsterdam/client-priority',
  '/complexity': '/upgrade/glamsterdam/test-complexity',
  '/upgrade/glamsterdam/candidates': '/upgrade/glamsterdam/devnet-inclusion',
  '/upgrade/glamsterdam/priority': '/upgrade/glamsterdam/client-priority',
  '/upgrade/glamsterdam/complexity': '/upgrade/glamsterdam/test-complexity',
  '/upgrade/glamsterdam/devnets': '/upgrade/glamsterdam/devnet-inclusion',
  '/upgrade/glamsterdam/devnets/priority': '/upgrade/glamsterdam/client-priority',
  '/upgrade/glamsterdam/devnets/complexity': '/upgrade/glamsterdam/test-complexity',
};

// https://astro.build/config
export default defineConfig({
  site: 'https://forkcast.org',
  output: 'static',
  prefetch: true,
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  redirects: {
    ...aliasRedirects,
    ...pendingEipRedirects(),
    ...callIssueRedirects(),
  },
});
