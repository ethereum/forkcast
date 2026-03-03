#!/usr/bin/env node

/**
 * Fetches weekly analytics from Matomo and posts a formatted digest
 * to Mattermost via incoming webhook.
 */

const REQUIRED_ENV_VARS = [
  "MATOMO_URL",
  "MATOMO_TOKEN",
  "MATOMO_SITE_ID",
  "MATTERMOST_WEBHOOK_URL",
];

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  return {
    matomoUrl: process.env.MATOMO_URL,
    matomoToken: process.env.MATOMO_TOKEN,
    siteId: process.env.MATOMO_SITE_ID,
    webhookUrl: process.env.MATTERMOST_WEBHOOK_URL,
  };
}

function getLastWeekRange() {
  const now = new Date();
  // Find last Monday (start of last week)
  // Treat Sunday (0) as 7 so the arithmetic always lands on the previous week's Monday
  const dayOfWeek = now.getUTCDay() || 7;
  const daysToLastMonday = dayOfWeek - 1 + 7;
  const lastMonday = new Date(now);
  lastMonday.setUTCDate(now.getUTCDate() - daysToLastMonday);
  lastMonday.setUTCHours(0, 0, 0, 0);

  const lastSunday = new Date(lastMonday);
  lastSunday.setUTCDate(lastMonday.getUTCDate() + 6);

  const fmt = (d) => d.toISOString().split("T")[0];
  return { start: fmt(lastMonday), end: fmt(lastSunday) };
}

async function fetchMatomoData({ matomoUrl, matomoToken, siteId }) {
  const { start, end } = getLastWeekRange();
  const period = "range";
  const date = `${start},${end}`;

  const methods = [
    { method: "VisitsSummary.get" },
    { method: "Actions.getPageUrls", params: { flat: 1, filter_limit: 10 } },
    { method: "Referrers.getReferrerType" },
    { method: "AIAgents.get" },
  ];

  const urls = methods.map(({ method, params = {} }) => {
    const entries = Object.entries({ module: "API", method, idSite: siteId, period, date, ...params });
    return entries.map(([k, v]) => `${k}=${v}`).join("&");
  });

  const bulkParams = new URLSearchParams();
  bulkParams.set("module", "API");
  bulkParams.set("method", "API.getBulkRequest");
  bulkParams.set("format", "JSON");
  bulkParams.set("token_auth", matomoToken);
  urls.forEach((url, i) => {
    bulkParams.set(`urls[${i}]`, `?${url}`);
  });

  console.log(`Fetching Matomo data for ${start} to ${end}...`);
  const response = await fetch(`${matomoUrl}/index.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: bulkParams.toString(),
  });

  if (!response.ok) {
    throw new Error(`Matomo API request failed: ${response.status} ${response.statusText}`);
  }

  const results = await response.json();

  const [visitsSummary, pageUrls, referrers, aiAgents] = results;

  // Fail fast if any required report returned an API error
  const required = { VisitsSummary: visitsSummary, Actions: pageUrls, Referrers: referrers };
  for (const [name, data] of Object.entries(required)) {
    if (isMatomoError(data)) {
      throw new Error(`${name} report failed: ${data?.message || "unknown error"}`);
    }
  }

  // AIAgents is optional — may not exist on all Matomo instances
  const hasAiAgents = !isMatomoError(aiAgents);
  console.log(`AIAgents module ${hasAiAgents ? "available" : "not available"}`);

  return {
    visitsSummary,
    pageUrls: Array.isArray(pageUrls) ? pageUrls : [],
    referrers: Array.isArray(referrers) ? referrers : [],
    aiAgents: hasAiAgents ? aiAgents : null,
    weekRange: { start, end },
  };
}

function isMatomoError(response) {
  return !response || !!response.result || !!response.message;
}

function buildVisitsAttachment(items, { color, title }) {
  const list = Array.isArray(items) ? items : [items];
  if (list.length === 0 || !list[0].label) return null;
  return {
    color,
    title,
    fields: list.map((item) => ({
      short: true,
      title: item.label || "Unknown",
      value: `${item.nb_visits ?? 0} visits`,
    })),
  };
}

function formatDuration(seconds) {
  if (!seconds || seconds === 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatMessage(data, { matomoUrl, siteId }) {
  const { visitsSummary, pageUrls, referrers, aiAgents, weekRange } = data;

  const header =
    `#### Weekly Digest\n` +
    `**${weekRange.start}** to **${weekRange.end}**  ·  ` +
    `[View in Matomo](${matomoUrl}/index.php?module=CoreHome&action=index&idSite=${siteId}&period=range&date=${weekRange.start},${weekRange.end})`;

  const attachments = [];

  // Attachment 1: Visitor Summary
  if (!isMatomoError(visitsSummary)) {
    attachments.push({
      color: "#2196F3",
      title: "Visitors Summary",
      fields: [
        { short: true, title: "Visits", value: `${visitsSummary.nb_visits ?? 0}` },
        { short: true, title: "Unique Visitors", value: `${visitsSummary.nb_uniq_visitors ?? 0}` },
        { short: true, title: "Pageviews", value: `${visitsSummary.nb_actions ?? 0}` },
        {
          short: true,
          title: "Bounce Rate",
          value: visitsSummary.bounce_rate ?? `${visitsSummary.bounce_count ?? 0}`,
        },
        {
          short: true,
          title: "Avg. Duration",
          value: formatDuration(visitsSummary.avg_time_on_site),
        },
      ],
    });
  }

  // Attachment 2: Top Pages
  if (pageUrls.length > 0) {
    const rows = pageUrls.map(
      (p) =>
        `| ${p.label || "/"} | ${p.nb_hits ?? 0} | ${p.nb_visits ?? 0} |`
    );
    const table =
      `| Page | Pageviews | Visits |\n` +
      `|:-----|----------:|-------:|\n` +
      rows.join("\n");

    attachments.push({
      color: "#4CAF50",
      title: "Top Pages",
      text: table,
    });
  }

  // Attachment 3: Referrer Breakdown
  const referrerAttachment = buildVisitsAttachment(referrers, { color: "#FF9800", title: "Referrer Breakdown" });
  if (referrerAttachment) attachments.push(referrerAttachment);

  // Attachment 4: AI Chatbots (if available)
  if (aiAgents) {
    const aiAttachment = buildVisitsAttachment(aiAgents, { color: "#9C27B0", title: "AI Chatbots Overview" });
    if (aiAttachment) attachments.push(aiAttachment);
  }

  return {
    username: "Forkcast Analytics",
    icon_emoji: ":bar_chart:",
    text: header,
    attachments,
  };
}

async function postToMattermost(webhookUrl, payload) {
  console.log("Posting digest to Mattermost...");
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mattermost webhook failed: ${response.status} ${response.statusText} — ${body}`);
  }

  console.log("Digest posted successfully.");
}

async function main() {
  const env = validateEnv();
  const data = await fetchMatomoData(env);
  const payload = formatMessage(data, env);
  await postToMattermost(env.webhookUrl, payload);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
