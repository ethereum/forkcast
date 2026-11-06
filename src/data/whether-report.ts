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

/**
 * Something the reader can go and do, as opposed to something they are being told. Kept
 * out of the prose and given its own chrome, because a brief is skimmed: an ask buried in
 * the third sentence of a paragraph is an ask nobody acts on.
 */
export interface WhetherReportAction {
  /** The ask, verb first and in a few words. It is a button's worth of text, not a clause. */
  label: string;
  /** A site path, an http(s) URL, or a `mailto:` address. */
  href: string;
}

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
  /**
   * What to do about it, if anything. Most items are news and have none; one or two is as
   * many as an item can carry before the row stops reading as a sentence with an ask after
   * it. The body still has to say why, since a label this short cannot.
   */
  actions?: WhetherReportAction[];
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
  date: '2026-11-06',
  tagline: 'One half-baked take on the state of protocol development.',
  items: [
    {
      title: 'Devcon',
      href: 'https://devcon.org',
      body: "Devcon 8 is wrapping up in Mumbai, and one priority coming out of it is [accelerating](https://www.youtube.com/watch?v=rqJ5ir-8hAQ) the post-quantum (or \"post-AI\") roadmap. Devcon 9 is [headed to Lisbon](https://x.com/EFDevcon/status/2118664094819782946), October 11-13, 2027.",
    },
    {
      title: 'Shipping Glamsterdam',
      fork: 'glamsterdam',
      body: "It'll be the [largest upgrade](/cadence) by EIP count in Ethereum history and includes major scaling improvements. Deployed on the Sepolia testnet, but further rollout is [paused](https://blog.ethereum.org/2026/10/22/glamsterdam-hoodi-delay) while a security disclosure is analyzed. EIP-8037 and EIP-8038 break eight invariants that deployed contracts may be relying on.",
      actions: [
        {
          label: 'Check your contracts',
          href: 'https://blog.ethereum.org/en/2026/11/06/glamsterdam-8037-8038',
        },
        { label: 'Report a break', href: 'mailto:glamsterdam@ethereum.org' },
      ],
    },
    {
      title: 'Scoping Hegotá',
      fork: 'hegota',
      body: "Headliners are selected. The open question is how many of the 25+ other EIPs should be included given the priority changes. The EL has a [priority order](/upgrade/hegota/priority-order) to work from; the CL hasn't ranked their EIPs yet.",
    },
  ],
};
