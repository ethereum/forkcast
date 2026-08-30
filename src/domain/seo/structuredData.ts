/**
 * schema.org JSON-LD for the page shell.
 *
 * Page bodies are `client:only` islands, so the pre-rendered HTML carries no
 * prose. These graphs put the same facts in the shell in machine-readable form,
 * where a crawler sees them without executing the island.
 *
 * Every field has to be backed by something the rendered page actually shows —
 * structured data describing content that isn't on the page is a spam signal,
 * not a shortcut around the empty shell.
 */

const SITE = 'https://forkcast.org';

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: 'Forkcast',
  url: SITE,
  logo: `${SITE}/forkcast-metacard.png`,
};

export interface BreadcrumbEntry {
  name: string;
  /** Absolute URL, or omitted for the final (current) crumb. */
  url?: string;
}

export function breadcrumbList(entries: BreadcrumbEntry[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: entries.map((entry, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: entry.name,
      ...(entry.url ? { item: entry.url } : {}),
    })),
  };
}

/** The sitewide identity graph. Homepage only — repeating it per page adds nothing. */
export function siteGraph(): object {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      ORGANIZATION,
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        name: 'Forkcast',
        description: 'Track Ethereum network upgrades and how they affect the ecosystem.',
        url: SITE,
        publisher: { '@id': `${SITE}/#organization` },
      },
    ],
  };
}

/**
 * EIP author strings are a comma-separated byline carrying GitHub handles and
 * sometimes emails: "Vitalik Buterin (@vbuterin), Sam Wilson <sam@example.com>".
 * Keep the names, drop the contact details.
 */
export function parseAuthors(author: string | undefined): string[] {
  if (!author) return [];
  return author
    .split(',')
    .map((part) => part.replace(/\([^)]*\)/g, '').replace(/<[^>]*>/g, '').trim())
    .filter(Boolean);
}

export interface EipArticleInput {
  id: number;
  prefix: string;
  title: string;
  description: string;
  author?: string;
  /** ISO date of the EIP's most recent inclusion-stage change, if it has one. */
  dateModified?: string;
}

export function eipArticle(eip: EipArticleInput): object {
  const url = `${SITE}/eips/${eip.id}/`;
  const authors = parseAuthors(eip.author);
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    '@id': `${url}#article`,
    headline: `${eip.prefix}-${eip.id}: ${eip.title}`,
    description: eip.description,
    url,
    ...(authors.length
      ? { author: authors.map((name) => ({ '@type': 'Person', name })) }
      : {}),
    ...(eip.dateModified ? { dateModified: eip.dateModified } : {}),
    publisher: { '@id': `${SITE}/#organization` },
  };
}

/** YouTube ids appear as watch?v=, youtu.be/, /live/ and /embed/ links. */
export function youtubeId(videoUrl: string | undefined): string | undefined {
  if (!videoUrl) return undefined;
  const match = videoUrl.match(
    /(?:[?&]v=|youtu\.be\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/,
  );
  return match?.[1];
}

export interface CallVideoInput {
  /** Page title without the " - Forkcast" suffix. */
  name: string;
  description: string;
  /** `YYYY-MM-DD`. */
  date: string;
  path: string;
  videoUrl?: string;
}

/**
 * Returns undefined when the call has no video: `VideoObject` without a real
 * recording behind it would be a false claim about the page.
 */
export function callVideo(call: CallVideoInput): object | undefined {
  const id = youtubeId(call.videoUrl);
  if (!id) return undefined;
  const url = `${SITE}/calls/${call.path}/`;
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${url}#video`,
    name: call.name,
    description: call.description,
    uploadDate: call.date,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    url,
    publisher: { '@id': `${SITE}/#organization` },
  };
}

/**
 * JSON for a `<script type="application/ld+json">` body. `<` is escaped so a
 * title containing `</script>` can't break out of the element.
 */
export function serializeJsonLd(graphs: ReadonlyArray<object | undefined>): string | undefined {
  const present = graphs.filter((g): g is object => g != null);
  if (!present.length) return undefined;
  const value = present.length === 1 ? present[0] : present;
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
