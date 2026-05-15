#!/usr/bin/env bash
set -euo pipefail

REPORT_FILE="${1:?Usage: mattermost-post.sh <report-file>}"

if [[ -z "${MATTERMOST_WEBHOOK_URL:-}" ]]; then
  echo "ERROR: MATTERMOST_WEBHOOK_URL is not set" >&2
  exit 1
fi

if [[ ! -s "$REPORT_FILE" ]]; then
  echo "ERROR: Report file is missing or empty: $REPORT_FILE" >&2
  exit 1
fi

REPORT_CONTENT=$(cat "$REPORT_FILE")

jq -n \
  --arg text "$(printf '```\n%s\n```' "$REPORT_CONTENT")" \
  '{username: "Forkcast Analytics", icon_emoji: ":bar_chart:", text: $text}' \
| curl -sf -o /dev/null -X POST "$MATTERMOST_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d @-

echo "Posted report to Mattermost."
