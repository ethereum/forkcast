#!/usr/bin/env node

/**
 * Posts a report file to Mattermost via incoming webhook.
 *
 * Usage:
 *   node scripts/post-mattermost.mjs <report-file>
 *
 * Environment variables (required):
 *   MATTERMOST_WEBHOOK_URL
 */

import { readFileSync } from "node:fs";

const reportPath = process.argv[2];
if (!reportPath) {
  console.error("Usage: post-mattermost.mjs <report-file>");
  process.exit(1);
}

const { MATTERMOST_WEBHOOK_URL } = process.env;
if (!MATTERMOST_WEBHOOK_URL) {
  console.error("Error: MATTERMOST_WEBHOOK_URL must be set.");
  process.exit(1);
}

const report = readFileSync(reportPath, "utf8");
const payload = {
  username: "Forkcast Analytics",
  icon_emoji: ":bar_chart:",
  text: "```\n" + report + "\n```",
};

const res = await fetch(MATTERMOST_WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  console.error(`Mattermost POST failed: HTTP ${res.status}`);
  process.exit(1);
}

console.log("Posted to Mattermost.");
