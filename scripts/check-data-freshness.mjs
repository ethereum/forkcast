#!/usr/bin/env node
/**
 * Fail loudly when upstream data stops arriving. Checks:
 *   - ACDE/ACDC/ACDT: the newest call artifact vs the series' usual cadence
 *     (catches the ethereum/pm ACDbot pipeline or our sync stopping)
 *   - ACD plan artifacts: newest `generated` date
 *   - Each sync workflow's last successful run on main, and the latest deploy
 *     (needs GITHUB_TOKEN, or a logged-in `gh` locally; skipped otherwise)
 *
 * Writes a summary table to stdout and $GITHUB_STEP_SUMMARY; exits 1 if any
 * check fails. Run daily by .github/workflows/check-data-freshness.yml.
 *
 * Usage: node scripts/check-data-freshness.mjs
 */

import { appendFileSync, existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import {
  callDates,
  checkCallSeries,
  checkLatestRun,
  checkMaxAge,
  formatSummary,
} from './lib/freshness.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = join(__dirname, '..', 'public/artifacts');
const REPO = process.env.GITHUB_REPOSITORY || 'ethereum/forkcast';

const ACD_SERIES = ['acde', 'acdc', 'acdt'];
// Plans regenerate weekly per series.
const PLAN_LIMIT_DAYS = 10;

// Scheduled sync workflows and how long since their last success is too long
// (a few missed cron runs, not one).
const WORKFLOWS = [
  ['sync-call-assets.yml', 1], // hourly
  ['fetch-eips.yml', 2], // twice daily
  ['scrape-devnet-specs.yml', 2], // twice daily
  ['fetch-test-counts.yml', 3], // daily
  ['generate-plan-artifacts.yml', 8], // weekly per series
];

function latestPlanDate(series) {
  const dir = join(ARTIFACTS_DIR, series, 'plan');
  if (!existsSync(dir)) return null;
  const dates = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf-8')).generated)
    .filter(Boolean)
    .sort();
  return dates.at(-1) ?? null;
}

function githubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf-8' }).trim() || null;
  } catch {
    return null;
  }
}

async function recentRuns(token, workflow, status, count) {
  const url = `https://api.github.com/repos/${REPO}/actions/workflows/${workflow}/runs?branch=main&status=${status}&per_page=${count}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'forkcast-freshness',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${workflow}`);
  return (await res.json()).workflow_runs;
}

async function workflowChecks(now) {
  const token = githubToken();
  if (!token) {
    console.warn('No GITHUB_TOKEN or gh login; skipping workflow run checks.\n');
    return [];
  }
  const results = [];
  for (const [workflow, limit] of WORKFLOWS) {
    const name = `${workflow} last success`;
    try {
      const [run] = await recentRuns(token, workflow, 'success', 1);
      results.push(checkMaxAge(name, run?.updated_at, now, limit));
    } catch (e) {
      results.push({ name, ok: false, detail: `could not query: ${e.message}` });
    }
  }
  // Bot-dispatched deploys email no one when they fail.
  const name = 'deploy.yml latest run';
  try {
    results.push(checkLatestRun(name, await recentRuns(token, 'deploy.yml', 'completed', 10)));
  } catch (e) {
    results.push({ name, ok: false, detail: `could not query: ${e.message}` });
  }
  return results;
}

async function main() {
  const now = Date.now();
  const results = [];

  for (const series of ACD_SERIES) {
    results.push(checkCallSeries(series, callDates(readdirSync(join(ARTIFACTS_DIR, series))), now));
  }
  for (const series of ACD_SERIES) {
    results.push(checkMaxAge(`${series} plan artifacts`, latestPlanDate(series), now, PLAN_LIMIT_DAYS));
  }
  results.push(...(await workflowChecks(now)));

  const summary = formatSummary(results);
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);

  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
