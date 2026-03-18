#!/usr/bin/env bash
set -euo pipefail

for var in MATOMO_URL MATOMO_TOKEN MATOMO_SITE_ID; do
  [[ -n "${!var:-}" ]] || { echo "ERROR: $var is not set" >&2; exit 1; }
done

OUT="/tmp/matomo"
mkdir -p "$OUT"
rm -f "$OUT"/*.json

BASE="${MATOMO_URL%/}"
BASE="${BASE%/index.php}"
PARAMS="module=API&idSite=${MATOMO_SITE_ID}&format=JSON"

fetch() {
  local name="$1" method="$2" extra="${3:-}"
  local output="${OUT}/${name}.json"
  local url="${BASE}/index.php?${PARAMS}&method=${method}"
  [[ -n "$extra" ]] && url+="&${extra}"
  if ! curl -sS --fail -X POST "$url" -d "token_auth=${MATOMO_TOKEN}" > "$output"; then
    echo "ERROR: Failed to fetch ${name}" >&2
    exit 1
  fi
  if ! jq -e 'type == "object" or type == "array"' "$output" >/dev/null 2>&1; then
    echo "ERROR: ${name} response is not a JSON object/array" >&2
    exit 1
  fi
  if jq -e 'type == "object" and .result == "error"' "$output" > /dev/null; then
    echo "ERROR: Matomo returned an API error for ${name}: $(jq -r '.message // "unknown error"' "$output")" >&2
    exit 1
  fi
  # Sanitize strings: truncate to 200 chars, collapse newlines (defense against prompt injection via user-controlled fields)
  jq 'walk(if type == "string" then .[:200] | gsub("[\\n\\r]"; " ") else . end)' "$output" > "${output}.tmp" \
    && mv "${output}.tmp" "$output"
}

# Previous 2 completed weeks
fetch visits_summary      VisitsSummary.get              "period=week&date=previous2"
fetch visit_frequency      VisitFrequency.get             "period=week&date=previous2"
fetch unique_visitors      VisitsSummary.getUniqueVisitors "period=week&date=previous2"

# Last completed week
fetch top_pages            Actions.getPageUrls            "period=week&date=lastWeek&flat=1&filter_limit=20"
fetch referrer_types       Referrers.getReferrerType       "period=week&date=lastWeek"
fetch referrer_websites    Referrers.getWebsites           "period=week&date=lastWeek&flat=1&filter_limit=10"
fetch countries            UserCountry.getCountry          "period=week&date=lastWeek&flat=1&filter_limit=10"
fetch devices              DevicesDetection.getType        "period=week&date=lastWeek&flat=1&filter_limit=10"
fetch visits_by_hour       VisitTime.getVisitInformationPerServerTime "period=week&date=lastWeek"
fetch landing_pages        Actions.getEntryPageUrls        "period=week&date=lastWeek&flat=1&filter_limit=15"
fetch session_durations    VisitorInterest.getNumberOfVisitsPerVisitDuration "period=week&date=lastWeek"

# Previous 8 completed weeks
fetch weekly_trend         VisitsSummary.getVisits         "period=week&date=previous8"

echo "Fetched $(ls "$OUT"/*.json | wc -l) Matomo datasets to ${OUT}/"
