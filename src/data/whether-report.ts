/**
 * The hand-written brief at the top of the homepage — the one thing on the site a person
 * writes rather than the data generating it.
 *
 * The byline names who is talking, so the copy itself never says "I", "my" or "we": the
 * page is not authored in the first person, and an item that slips into it reads as though
 * the site is speaking rather than the person it is bylined to.
 *
 * This is also the one place the site has a voice. Everywhere else Forkcast reports what
 * ACD decided and leaves the reading to the reader; here the point is the reading, so an
 * opinion, a joke or a guess about what matters next belongs. Don't neutralise it back into
 * house style — a brief that only restates the cards below it is worth nothing.
 *
 * It covers what is live now. A shipped fork drops off once it stops being news, however
 * much work it was.
 *
 * No em dashes. A section whose whole claim is that a person wrote it cannot carry the one
 * piece of punctuation that reads as though nobody did; `whether-report.test.ts` enforces
 * it. Full stops and semicolons do the same work.
 *
 * Publishing a new edition means editing this file: set `date` to the day you wrote it and
 * replace `items`. There is no archive; git holds the back issues.
 */

export interface WhetherReportItem {
  /**
   * An upgrade id from `networkUpgrades`. The heading links to that upgrade's page, and is
   * named after it unless `title` says otherwise, so the link under an entry can't point
   * somewhere other than the upgrade it is about.
   */
  fork?: string;
  /**
   * The heading. On a fork item this overrides the upgrade's name, so an entry can be
   * headed for what is happening to the fork rather than just naming it, and still link to
   * the fork's page. Every item needs this or a `fork` to be headed by.
   */
  title?: string;
  /** Where the heading links on an item with no `fork`. A fork's own page always wins. */
  href?: string;
  /** One or two sentences. `[text](/path)` and `[text](https://…)` are rendered as links. */
  body: string;
}

export interface WhetherReport {
  /** The day this edition was written, as YYYY-MM-DD. Shown as "Updated …". */
  date: string;
  /**
   * What the section is, in one line, under the title. Standing copy: it describes the
   * column rather than the week, so unlike `items` it rarely changes. Without it a reader
   * meeting a page of generated tables has no way to know this one block is a person
   * talking.
   */
  tagline: string;
  items: WhetherReportItem[];
}

export const whetherReport: WhetherReport = {
  date: '2026-11-05',
  tagline: 'One half-baked take on the state of protocol development.',
  items: [
    {
      title: 'Devcon',
      href: 'https://devcon.org',
      body: "It's Devcon season, so half the core devs are in a hallway somewhere. One priority coming out of Devcon is [accelerating](https://www.youtube.com/watch?v=rqJ5ir-8hAQ) the post-quantum (or \"post-AI\") roadmap.",
    },
    {
      title: 'Shipping Glamsterdam',
      fork: 'glamsterdam',
      body: "It'll be the largest upgrade by EIP count in Ethereum history and includes major scaling improvements. Deployed on the Sepolia testnet, but further rollout is [paused](https://blog.ethereum.org/2026/10/22/glamsterdam-hoodi-delay) while a security disclosure is analyzed.",
    },
    {
      title: 'Scoping Hegotá',
      fork: 'hegota',
      body: "Headliners are selected. The open question is how many of the 25+ other EIPs behind them should be included given the priority changes. The EL has a [priority order](/upgrade/hegota/priority-order) to work from; the CL hasn't ranked their EIPs yet.",
    },
  ],
};
