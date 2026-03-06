#!/usr/bin/env node

/**
 * Structured Matomo data fetcher for the analytics digest.
 *
 * Usage:
 *   node scripts/matomo-fetch.mjs <method> [param=value ...]
 *
 * Example:
 *   node scripts/matomo-fetch.mjs VisitsSummary.get period=range date=2025-01-01,2025-01-07
 *
 * Environment variables (required):
 *   MATOMO_URL, MATOMO_TOKEN, MATOMO_SITE_ID
 *
 * Constraints:
 *   - Only whitelisted API methods are allowed
 *   - A global query counter file limits total queries per workflow run
 */

const ALLOWED_METHODS = new Set([
  "VisitsSummary.get",
  "VisitsSummary.getVisits",
  "Actions.getPageUrls",
  "Referrers.getReferrerType",
  "Referrers.getWebsites",
  "UserCountry.getCountry",
  "DevicesDetection.getType",
  "VisitTime.getVisitInformationPerServerTime",
  "Actions.getEntryPageUrls",
  "VisitorInterest.getNumberOfVisitsPerVisitDuration",
]);

const MAX_QUERIES = 30;
const COUNTER_FILE = "/tmp/matomo-query-counter";

import { readFileSync, writeFileSync } from "node:fs";

function getAndIncrementCounter() {
  let count = 0;
  try {
    count = parseInt(readFileSync(COUNTER_FILE, "utf8").trim(), 10) || 0;
  } catch {
    // file doesn't exist yet
  }
  count += 1;
  writeFileSync(COUNTER_FILE, String(count));
  return count;
}

const method = process.argv[2];
if (!method) {
  console.error(
    `Usage: matomo-fetch.mjs <method> [param=value ...]\n\nAllowed methods:\n  ${[...ALLOWED_METHODS].join("\n  ")}\n\nMax queries per run: ${MAX_QUERIES}`
  );
  process.exit(1);
}

if (!ALLOWED_METHODS.has(method)) {
  console.error(
    `Error: method "${method}" is not allowed.\n\nAllowed methods:\n  ${[...ALLOWED_METHODS].join("\n  ")}`
  );
  process.exit(1);
}

const { MATOMO_URL, MATOMO_TOKEN, MATOMO_SITE_ID } = process.env;
if (!MATOMO_URL || !MATOMO_TOKEN || !MATOMO_SITE_ID) {
  console.error(
    "Error: MATOMO_URL, MATOMO_TOKEN, and MATOMO_SITE_ID must be set."
  );
  process.exit(1);
}

const queryNumber = getAndIncrementCounter();
if (queryNumber > MAX_QUERIES) {
  console.error(
    `Error: query limit reached (${MAX_QUERIES}). No more Matomo queries allowed this run.`
  );
  process.exit(1);
}

// Parse extra params from argv
const params = new URLSearchParams({
  module: "API",
  method,
  idSite: MATOMO_SITE_ID,
  format: "JSON",
  token_auth: MATOMO_TOKEN,
});

for (const arg of process.argv.slice(3)) {
  const eq = arg.indexOf("=");
  if (eq === -1) {
    console.error(`Error: invalid param "${arg}" — expected key=value`);
    process.exit(1);
  }
  params.set(arg.slice(0, eq), arg.slice(eq + 1));
}

const url = `${MATOMO_URL}/index.php?${params}`;

try {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${res.statusText}`);
    process.exit(1);
  }
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
  console.error(`[matomo-fetch] query ${queryNumber}/${MAX_QUERIES}`);
} catch (err) {
  console.error(`Fetch error: ${err.message}`);
  process.exit(1);
}
