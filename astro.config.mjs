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
const legacyRedirects = {
  // The tier maker is now per-fork at `/rank/{fork}`; keep the original short URL
  // (shared publicly and baked into exported ranking images) pointing at Hegota.
  '/rank': '/rank/hegota',
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
    ...legacyRedirects,
    ...callIssueRedirects(),
  },
});
