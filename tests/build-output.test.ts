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
  'networks/index.html',
  'upgrades/index.html',
  'upgrade/glamsterdam/index.html',
  'upgrade/glamsterdam/client-priority/index.html',
  'upgrade/glamsterdam/test-complexity/index.html',
  'upgrade/glamsterdam/stakeholders/index.html',
  'upgrade/glamsterdam/devnet-inclusion/index.html',
  'upgrade/hegota/index.html',
  'upgrade/hegota/client-priority/index.html',
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
  'devnets/index.html': '/networks',
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
        html.includes('href="/eips/"') ||
        html.includes('href="/calls/"') ||
        html.includes('href="/schedule/"');
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

  describe('JSON indexes', () => {
    // Page bodies are client-rendered, so these artifacts are the only way an
    // agent or crawler can read the data. `public/llms.txt` names every one of
    // them; a rename here silently breaks that contract.
    const indexes: Array<{ file: string; collection: string }> = [
      { file: 'api/eips.json', collection: 'eips' },
      { file: 'api/calls.json', collection: 'calls' },
      { file: 'api/upgrades.json', collection: 'upgrades' },
      { file: 'api/eip-stage-changes.json', collection: 'eips' },
    ];

    for (const { file, collection } of indexes) {
      it(`${file} parses and is non-empty`, () => {
        const raw = fs.readFileSync(path.join(DIST, file), 'utf-8');
        const payload = JSON.parse(raw);
        expect(payload.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(Array.isArray(payload[collection])).toBe(true);
        expect(payload[collection].length).toBeGreaterThan(0);
      });
    }

    it('api/eips.json covers every EIP in src/data/eips/', () => {
      const sourceCount = fs
        .readdirSync(path.resolve(DIST, '..', 'src', 'data', 'eips'))
        .filter((f) => f.endsWith('.json')).length;
      const payload = JSON.parse(
        fs.readFileSync(path.join(DIST, 'api/eips.json'), 'utf-8'),
      );
      expect(payload.count).toBe(sourceCount);
      expect(payload.eips.length).toBe(sourceCount);
    });

    it('api/eips.json ships the prose the HTML lacks', () => {
      // The point of the endpoint: /eips/7702 renders none of this server-side.
      const payload = JSON.parse(
        fs.readFileSync(path.join(DIST, 'api/eips.json'), 'utf-8'),
      );
      const eip = payload.eips.find((e: { id: number }) => e.id === 7702);
      expect(eip?.laymanDescription).toBeTruthy();
      expect(eip?.forkRelationships?.length).toBeGreaterThan(0);
    });

    it('api/upgrades.json leaks no UI-only fields', () => {
      // `NetworkUpgrade` mixes protocol facts with render state. "The Merge:
      // disabled" is meaningless outside the upgrades page, so the endpoint
      // projects rather than serving the raw record.
      const payload = JSON.parse(
        fs.readFileSync(path.join(DIST, 'api/upgrades.json'), 'utf-8'),
      );
      const keys = new Set(payload.upgrades.flatMap((u: object) => Object.keys(u)));
      for (const uiOnly of ['disabled', 'hideProgressBar', 'macroPhaseOverride', 'path']) {
        expect(keys.has(uiOnly), `${uiOnly} should not be published`).toBe(false);
      }
      // ...but the substantive fields have to survive the projection.
      const hegota = payload.upgrades.find((u: { id: string }) => u.id === 'hegota');
      expect(hegota?.projectedActivation).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(payload.upgrades.some((u: { id: string }) => u.id === 'previous-upgrades')).toBe(
        false,
      );
    });

    it('llms.txt only points at paths that exist', () => {
      const txt = fs.readFileSync(path.join(DIST, 'llms.txt'), 'utf-8');
      const referenced = new Set(
        [...txt.matchAll(/`?(?:GET )?(\/(?:api|search|eip-spec)[\w./-]*\.json)`?/g)].map(
          (m) => m[1],
        ),
      );
      expect(referenced.size).toBeGreaterThan(0);
      for (const ref of referenced) {
        expect(
          fs.existsSync(path.join(DIST, ref.slice(1))),
          `llms.txt references missing ${ref}`,
        ).toBe(true);
      }
    });
  });

  describe('rss feed', () => {
    const read = () => fs.readFileSync(path.join(DIST, 'feed.xml'), 'utf-8');

    it('feed.xml is emitted with items', () => {
      const xml = read();
      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
      expect(xml).toContain('<atom:link href="https://forkcast.org/feed.xml"');
      expect([...xml.matchAll(/<item>/g)].length).toBeGreaterThan(0);
    });

    it('carries every enabled item type', () => {
      // Each source is wired separately, so one can go silent while the feed
      // still validates and looks healthy.
      const guids = [...read().matchAll(/<guid isPermaLink="false">([^<]+)<\/guid>/g)].map(
        (m) => m[1],
      );
      expect(guids.some((g) => g.startsWith('eip-'))).toBe(true);
      expect(guids.some((g) => g.startsWith('event-'))).toBe(true);
      expect(guids.some((g) => g.startsWith('call-'))).toBe(true);
    });

    it('every item has a unique guid', () => {
      // Readers dedupe on guid. A collision hides an item; a guid that drifts
      // between builds re-notifies every subscriber about something they read.
      const guids = [...read().matchAll(/<guid isPermaLink="false">([^<]+)<\/guid>/g)].map(
        (m) => m[1],
      );
      expect(guids.length).toBeGreaterThan(0);
      expect(new Set(guids).size).toBe(guids.length);
    });

    it('every item has a parseable RFC 822 pubDate', () => {
      const xml = read();
      const dates = [...xml.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((m) => m[1]);
      expect(dates.length).toBe([...xml.matchAll(/<item>/g)].length);
      for (const date of dates) {
        expect(Number.isNaN(new Date(date).getTime()), `unparseable ${date}`).toBe(false);
      }
    });

    it('links to the canonical site rather than a relative or preview URL', () => {
      const links = [...read().matchAll(/<link>([^<]+)<\/link>/g)].map((m) => m[1]);
      for (const link of links) {
        expect(link.startsWith('https://forkcast.org'), `bad link ${link}`).toBe(true);
      }
    });

    it('every item links to a page that was actually built', () => {
      // Network pages come from the Cartographoor snapshot, so a devnet that
      // retires takes its route with it. A feed item is permanent once a reader
      // has it, so a dead link here can never be recalled.
      const links = [...read().matchAll(/<link>https:\/\/forkcast\.org([^<]*)<\/link>/g)].map(
        (m) => m[1],
      );
      const missing = [...new Set(links)].filter((route) => {
        const rel = route.replace(/^\/|\/$/g, '');
        return !(
          fs.existsSync(path.join(DIST, rel, 'index.html')) || fs.existsSync(path.join(DIST, rel))
        );
      });
      expect(missing, `feed links with no page: ${missing.join(', ')}`).toEqual([]);
    });

    it('is discoverable from the page shell', () => {
      expect(readHtml('index.html')).toContain('type="application/rss+xml"');
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

  describe('structured data', () => {
    const parseJsonLd = (relPath: string) => {
      const match = readHtml(relPath).match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      );
      return match ? JSON.parse(match[1]) : undefined;
    };

    it('the homepage identifies the site', () => {
      const graph = parseJsonLd('index.html');
      const types = graph['@graph'].map((n: { '@type': string }) => n['@type']);
      expect(types).toContain('Organization');
      expect(types).toContain('WebSite');
    });

    it('an EIP page describes the EIP and its breadcrumb trail', () => {
      const graphs = parseJsonLd('eips/7702/index.html');
      const types = graphs.map((g: { '@type': string }) => g['@type']);
      expect(types).toEqual(['TechArticle', 'BreadcrumbList']);
      expect(graphs[0].url).toBe('https://forkcast.org/eips/7702/');
    });

    it('a call page with a recording emits a VideoObject', () => {
      const graphs = parseJsonLd('calls/acdc/165/index.html');
      const video = graphs.find((g: { '@type': string }) => g['@type'] === 'VideoObject');
      expect(video.embedUrl).toMatch(/^https:\/\/www\.youtube\.com\/embed\/[A-Za-z0-9_-]{11}$/);
      expect(video.uploadDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('every emitted graph is parseable JSON', () => {
      // `set:html` bypasses escaping, so a title carrying a quote or a `<` would
      // otherwise ship as a silently broken script element.
      const pages = collectFiles(DIST, '.html').filter((f) =>
        fs.readFileSync(f, 'utf-8').includes('application/ld+json'),
      );
      expect(pages.length).toBeGreaterThan(0);
      const broken = pages.filter((file) => {
        const match = fs
          .readFileSync(file, 'utf-8')
          .match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        try {
          JSON.parse(match![1]);
          return false;
        } catch {
          return true;
        }
      });
      expect(broken.map((f) => path.relative(DIST, f))).toEqual([]);
    });
  });

  // GitHub Pages serves directory-format output at the trailing-slash URL and
  // 301s the bare path to it. A published URL without the slash therefore costs
  // a redirect hop and, for a canonical, disagrees with the redirect a crawler
  // just followed. Everything the build publishes has to use the same form.
  describe('canonical URL form', () => {
    const isCanonical = (url: string) => new URL(url).pathname.endsWith('/');

    it('every sitemap entry ends in a slash', () => {
      const xml = fs.readFileSync(path.join(DIST, 'sitemap-0.xml'), 'utf-8');
      const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      expect(locs.length).toBeGreaterThan(0);
      expect(locs.filter((l) => !isCanonical(l))).toEqual([]);
    });

    it('every feed item links to the slash form', () => {
      const xml = fs.readFileSync(path.join(DIST, 'feed.xml'), 'utf-8');
      const links = [...xml.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>/g)].map((m) => m[1]);
      expect(links.length).toBeGreaterThan(0);
      expect(links.filter((l) => !isCanonical(l))).toEqual([]);
    });

    it('page canonical and og:url agree with the served URL', () => {
      for (const page of CORE_PAGES.filter((p) => p !== '404.html')) {
        const html = readHtml(page);
        const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
        const ogUrl = html.match(/<meta property="og:url" content="([^"]+)"/)?.[1];
        expect(canonical, `${page} canonical`).toBeDefined();
        expect(isCanonical(canonical!), `${page} canonical ${canonical}`).toBe(true);
        expect(ogUrl, `${page} og:url`).toBe(canonical);
      }
    });

    it('nav links in the shipped HTML point straight at pages', () => {
      // The nav is the only link graph in the pre-rendered HTML, so a slash-less
      // href here makes every crawl hop a redirect.
      const html = readHtml('eips/7702/index.html');
      const hrefs = [...html.matchAll(/href="(\/[^"]*)"/g)]
        .map((m) => m[1])
        .filter((h) => !/\.[a-z0-9]+$/i.test(h) && !h.includes('?'));
      expect(hrefs.length).toBeGreaterThan(0);
      expect(hrefs.filter((h) => !h.endsWith('/'))).toEqual([]);
    });
  });
});
