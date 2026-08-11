/**
 * Assertions about `dist/`, the static site `npm run build` emits.
 *
 * These cover what unit tests structurally can't: that every page is actually
 * pre-rendered with its own SEO metadata rather than shipping as a client-only
 * shell, that legacy URLs still redirect, and that the shipped payload hasn't
 * quietly ballooned.
 *
 * Requires a build first — `npm run build && npx vitest run tests/`.
 */
import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST = path.resolve(import.meta.dirname, '..', 'dist');

/** See the "has not changed how the heavy corpus is serialized" test. */
const COMPILE_SEARCH_CORPUS_SHA256 =
  'e366397e583835cb95db79e1d2a4b7c5d41f527bca49f37217931ce8c859bf1a';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readHtml(relPath: string): string {
  const file = relPath.endsWith('.html') ? relPath : `${relPath}/index.html`;
  return fs.readFileSync(path.join(DIST, file), 'utf-8');
}

function collectFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

/** Paths to skip when checking for content (redirects, API endpoints, etc.) */
const isRedirectPage = (html: string) =>
  html.includes('http-equiv="refresh"');

// "Core" pages that should always exist regardless of dynamic data
const CORE_PAGES = [
  'index.html',
  'eips/index.html',
  'calls/index.html',
  'decisions/index.html',
  'schedule/index.html',
  'devnets/index.html',
  'upgrades/index.html',
  'upgrade/glamsterdam/index.html',
  'upgrade/glamsterdam/client-priority/index.html',
  'upgrade/glamsterdam/test-complexity/index.html',
  'upgrade/glamsterdam/stakeholders/index.html',
  'upgrade/glamsterdam/devnet-inclusion/index.html',
  'upgrade/hegota/index.html',
  'upgrade/pectra/index.html',
  'upgrade/fusaka/index.html',
  'rank/index.html',
  '404.html',
];

// Retired URLs that are still linked to from off-site; `astro.config.mjs` keeps
// them alive as meta-refresh stubs.
const EXPECTED_REDIRECTS: Record<string, string> = {
  'planner/index.html': '/schedule',
  'glamsterdam/index.html': '/upgrade/glamsterdam',
  'priority/index.html': '/upgrade/glamsterdam/client-priority',
  'complexity/index.html': '/upgrade/glamsterdam/test-complexity',
  'feedback/index.html': 'ethereum-magicians.org',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('build output', () => {
  it('dist/ directory exists', () => {
    expect(fs.existsSync(DIST)).toBe(true);
  });

  describe('core pages exist', () => {
    for (const page of CORE_PAGES) {
      it(page, () => {
        expect(fs.existsSync(path.join(DIST, page))).toBe(true);
      });
    }
  });

  describe('per-page SEO metadata', () => {
    const pages = CORE_PAGES.filter((p) => p !== '404.html');

    for (const page of pages) {
      it(`${page} has a unique <title>`, () => {
        const html = readHtml(page);
        if (isRedirectPage(html)) return; // skip redirects
        const match = html.match(/<title>([^<]+)<\/title>/);
        expect(match).not.toBeNull();
        expect(match![1]).not.toBe('');
        // Should not all be the generic fallback title
        expect(match![1]).toContain('Forkcast');
      });

      it(`${page} has a meta description`, () => {
        const html = readHtml(page);
        if (isRedirectPage(html)) return;
        const match = html.match(
          /<meta\s+name="description"\s+content="([^"]+)"/,
        );
        expect(match).not.toBeNull();
        expect(match![1].length).toBeGreaterThan(10);
      });

      it(`${page} has Open Graph tags`, () => {
        const html = readHtml(page);
        if (isRedirectPage(html)) return;
        expect(html).toContain('og:title');
        expect(html).toContain('og:description');
      });
    }
  });

  describe('pre-rendered content', () => {
    it('homepage ships navigation in the HTML', () => {
      // Crawlers and no-JS visitors only ever see this markup, so the nav has to
      // survive the build rather than being painted by a hydrated island.
      const html = readHtml('index.html');
      const hasNav =
        html.includes('href="/eips"') ||
        html.includes('href="/calls"') ||
        html.includes('href="/schedule"');
      expect(hasNav).toBe(true);
    });

    it('homepage is not an empty mount shell', () => {
      // Wrapping a page's content in `client:only` builds fine but strips it
      // from `dist/`, leaving a bare mount point.
      const html = readHtml('index.html');
      const isEmptyShell =
        html.includes('<div id="root"></div>') &&
        !html.includes('<header') &&
        !html.includes('<nav');
      expect(isEmptyShell).toBe(false);
    });

    // Check a sample of pages for pre-rendered structure
    const pagesWithExpectedContent = [
      { page: 'upgrade/glamsterdam/index.html', marker: 'Glamsterdam' },
      { page: 'upgrade/pectra/index.html', marker: 'Pectra' },
      { page: 'upgrade/hegota/index.html', marker: 'Hegota' },
    ];

    for (const { page, marker } of pagesWithExpectedContent) {
      it(`${page} contains "${marker}" in the HTML`, () => {
        const html = readHtml(page);
        expect(html).toContain(marker);
      });
    }
  });

  describe('legacy redirects', () => {
    for (const [page, target] of Object.entries(EXPECTED_REDIRECTS)) {
      it(`${page} redirects to ${target}`, () => {
        const filePath = path.join(DIST, page);
        expect(fs.existsSync(filePath)).toBe(true);
        const html = fs.readFileSync(filePath, 'utf-8');
        expect(html).toContain('http-equiv="refresh"');
        expect(html).toContain(target);
      });
    }
  });

  describe('bundle analysis', () => {
    it('reports JS bundle size', () => {
      const jsFiles = collectFiles(path.join(DIST, '_astro'), '.js');
      const totalBytes = jsFiles.reduce(
        (sum, f) => sum + fs.statSync(f).size,
        0,
      );
      const totalKB = Math.round(totalBytes / 1024);

      console.log(`\n  JS bundle: ${jsFiles.length} files, ${totalKB} KB total`);
      // Just report; no hard assertion on size
      expect(totalBytes).toBeGreaterThan(0);
    });

    it('reports CSS bundle size', () => {
      const cssFiles = collectFiles(path.join(DIST, '_astro'), '.css');
      const totalBytes = cssFiles.reduce(
        (sum, f) => sum + fs.statSync(f).size,
        0,
      );
      const totalKB = Math.round(totalBytes / 1024);

      console.log(`  CSS bundle: ${cssFiles.length} files, ${totalKB} KB total`);
      expect(totalBytes).toBeGreaterThan(0);
    });

    it('reports total HTML page count', () => {
      const allHtml = collectFiles(DIST, '.html').filter(
        (f) => !f.includes('/artifacts/'),
      );
      const redirectCount = allHtml.filter((f) =>
        isRedirectPage(fs.readFileSync(f, 'utf-8')),
      ).length;
      const contentCount = allHtml.length - redirectCount;

      console.log(
        `  HTML pages: ${allHtml.length} total (${contentCount} content, ${redirectCount} redirects)`,
      );
      expect(allHtml.length).toBeGreaterThan(0);
    });
  });

  describe('search corpora', () => {
    it('light corpus stays small enough to load on every ⌘K', () => {
      const file = path.join(DIST, 'search-light.json');
      expect(fs.existsSync(file)).toBe(true);

      const raw = fs.readFileSync(file);
      const gzipped = zlib.gzipSync(raw).length;
      console.log(
        `  search-light.json: ${Math.round(raw.length / 1024)} KB raw, ${Math.round(gzipped / 1024)} KB gzipped`,
      );

      // Generous headroom today, but tight enough to fail the build before notes
      // bodies quietly grow the light tier into a second heavy tier.
      expect(raw.length).toBeLessThan(3.5 * 1024 * 1024);
      expect(gzipped).toBeLessThan(800 * 1024);
    });

    it('emits a sha256 for the heavy corpus', () => {
      // `searchIndex.ts` keys its IndexedDB cache on this hash.
      const built = JSON.parse(fs.readFileSync(path.join(DIST, 'search-corpus.meta.json'), 'utf-8'));
      expect(built.sha256).toMatch(/^[0-9a-f]{64}$/);
    });

    it('has not changed how the heavy corpus is serialized', () => {
      // Artifact edits change the corpus hash legitimately. What must not change
      // is the *shape* of the output: that would re-hash all 19 MB for every
      // existing visitor at once, forcing a full re-download and re-index.
      //
      // Hashing the compiler rather than its output pins exactly that, and stays
      // stable across the call syncs that land here every week. If this fails
      // because you deliberately changed the compiler, bundle the change with
      // something else that already invalidates the corpus, then update the hash.
      const script = fs.readFileSync(
        path.resolve(DIST, '..', 'scripts', 'compile-search-corpus.mjs'),
      );
      const hash = crypto.createHash('sha256').update(script).digest('hex');
      expect(hash).toBe(COMPILE_SEARCH_CORPUS_SHA256);
    });
  });

  describe('page title uniqueness', () => {
    it('not all pages share the same <title>', () => {
      const titles = new Set<string>();
      for (const page of CORE_PAGES) {
        const html = readHtml(page);
        if (isRedirectPage(html)) continue;
        const match = html.match(/<title>([^<]+)<\/title>/);
        if (match) titles.add(match[1]);
      }
      // A single shared title across the site means metadata is being applied
      // client-side, where search engines and link unfurlers won't see it.
      console.log(`  Unique <title> values: ${titles.size} across ${CORE_PAGES.length} core pages`);
      expect(titles.size).toBeGreaterThan(1);
    });
  });

  describe('sitemap', () => {
    it('sitemap exists (sitemap.xml or sitemap-index.xml)', () => {
      const has =
        fs.existsSync(path.join(DIST, 'sitemap.xml')) ||
        fs.existsSync(path.join(DIST, 'sitemap-index.xml'));
      expect(has).toBe(true);
    });
  });
});
