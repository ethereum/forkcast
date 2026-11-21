// Pure freshness rules for scripts/check-data-freshness.mjs. Every check
// returns { name, ok, detail } so the caller can print one summary.

const DAY_MS = 24 * 60 * 60 * 1000;

const ageInDays = (date, now) => Math.floor((now - new Date(date)) / DAY_MS);

/** Call dates (YYYY-MM-DD, ascending) from artifact dir names like 2026-10-08_247. */
export function callDates(dirNames) {
  return dirNames
    .filter((name) => /^\d{4}-\d{2}-\d{2}_\d+$/.test(name))
    .map((name) => name.slice(0, 10))
    .sort();
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * A call series is stale when its newest call is older than twice its usual
 * gap (median of the last `lookback` gaps), plus a few days for the upstream
 * pipeline to publish. Weekly series alert after 17 days, biweekly after 31.
 */
export function checkCallSeries(series, dates, now, { lookback = 8, graceDays = 3 } = {}) {
  const name = `${series} calls`;
  if (dates.length < 2) {
    return { name, ok: false, detail: `only ${dates.length} call(s) on disk; cannot infer cadence` };
  }
  const recent = dates.slice(-(lookback + 1));
  const gaps = recent.slice(1).map((date, i) => (new Date(date) - new Date(recent[i])) / DAY_MS);
  const cadence = median(gaps);
  const limit = Math.round(2 * cadence + graceDays);
  const latest = dates.at(-1);
  const age = ageInDays(latest, now);
  return {
    name,
    ok: age <= limit,
    detail: `latest ${latest} (${age}d ago); usual gap ${cadence}d, limit ${limit}d`,
  };
}

/** Generic "this timestamp should be no older than N days" check. */
export function checkMaxAge(name, date, now, limitDays) {
  if (!date) return { name, ok: false, detail: 'no timestamp found' };
  const age = ageInDays(date, now);
  return {
    name,
    ok: age <= limitDays,
    detail: `last ${String(date).slice(0, 10)} (${age}d ago); limit ${limitDays}d`,
  };
}

/**
 * Passes when the newest decisive run (ignoring cancelled/skipped ones, which
 * concurrency produces routinely) succeeded. `runs` is newest first.
 */
export function checkLatestRun(name, runs) {
  const run = runs.find((r) => !['cancelled', 'skipped'].includes(r.conclusion));
  if (!run) return { name, ok: false, detail: 'no completed runs found' };
  return {
    name,
    ok: run.conclusion === 'success',
    detail: `${run.conclusion} at ${run.updated_at} (${run.html_url})`,
  };
}

/** Markdown summary for $GITHUB_STEP_SUMMARY and the console. */
export function formatSummary(results) {
  const stale = results.filter((r) => !r.ok);
  const lines = [
    stale.length
      ? `## Data freshness: ${stale.length} problem(s)`
      : '## Data freshness: all checks passed',
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |',
    ...results.map((r) => `| ${r.name} | ${r.ok ? 'ok' : '**FAIL**'} | ${r.detail} |`),
  ];
  return lines.join('\n') + '\n';
}
