---
name: add-breakout
description: Onboard a brand-new breakout call series across ethereum/pm (trusted list, call series config, issue template, labeler) and Forkcast (via the add-series skill). Use when a new facilitator wants to start running a breakout. Pairs with add-series, which covers the Forkcast-only side.
---

## Add a new breakout series

A breakout series requires changes in **two repos**: `ethereum/pm` (where the bot lives and the issue template lives) and `forkcast` (where calls render). This skill covers the pm side and the cross-repo handoff. The Forkcast-side changes are covered by the `add-series` skill — invoke that for steps 2 and 3 of the changes.

Reference commit for the pm-side pattern: `6e572f83` ("acdbot: introduce native aa breakout"). Reference commit for adding to the trusted list: `14a86086` ("acdbot: add to trusted list for pqi").

### Step 1: Gather info from the user

You need:

- **Display name** (e.g., "P2P Networking", "Native Account Abstraction")
- **Facilitator's GitHub username** (e.g., `kamilsa`)
- **First meeting** date/time UTC — informational; the facilitator will open the issue themselves
- **Duration** in minutes (typically 60 or 90)
- **Cadence** — one of: `weekly`, `bi-weekly`, `monthly`, `other`
- **Series config key** — lowercased, no-spaces version of the display name used as the pm config key (e.g., `p2pnetworking`, `nativeaa`, `encryptthemempool`). Derive and confirm with the user.
- **Forkcast type abbreviation** — short slug used in Forkcast URLs/folders (e.g., `p2p`, `aa`, `pqi`). Existing values are in `src/data/calls.ts` `CallType`. Confirm with the user — this is the `add-series` "Short type key" input.
- **Tailwind color** for the badge/border (used by `add-series`). Pick an unused color from the existing palettes in `src/components/calls-index/CallsIndexTimeline.tsx`.
- **YouTube playlist ID** (recommended upfront) — ask the user to create an empty `<Display Name>` playlist on the EF YouTube channel before opening the PR. YouTube Studio → Content → Playlists → New playlist; **Public** visibility. The ID is the segment between `/playlist/` and `/videos` in the Studio URL (or after `list=` on youtube.com). All EF playlist IDs start with `PLJqWcTqh_zK…` — useful sanity check they're on the right channel. If the user can't create it now, leave as `null`; they can land a follow-up PR later.

### Step 2: Locate the pm checkout

The user typically has `ethereum/pm` checked out at `../pm` relative to forkcast. Verify by running `ls ../pm/.github/ACDbot/call_series_config.yml`. If not present, ask the user for the path.

### Step 3: Make the four pm-repo edits

All four files live under `../pm/.github/`:

1. **`workflows/protocol-call-workflow.yml`** — append the facilitator's GitHub username (lowercase) to the `trustedContributors` array. This authorizes them to trigger the bot.

2. **`ACDbot/call_series_config.yml`** — add a new entry under `call_series:` just before the `one-off:` block. Shape:
   ```yaml
     <series-key>:
       display_name: "<Display Name>"
       youtube_playlist_id: "<PLJqWcTqh_zK...>"  # or null if not yet created
       discord_webhook_env: null
       autopilot_defaults:
         duration: <60|90>
         occurrence_rate: "<weekly|bi-weekly|monthly|other>"
         need_youtube_streams: false
         display_zoom_link_in_invite: true
         external_meeting_link: false
   ```
   Use the YouTube playlist ID gathered in Step 1 if available. If left `null`, land a follow-up PR (`acdbot: wire up <series> youtube playlist`) once the playlist exists — see PR pattern at commit `a125cd3f`.

3. **`ISSUE_TEMPLATE/protocol-call-form.yml`** — add the display name to the `Call Series` dropdown `options:`. The list is mostly alphabetical — insert accordingly.

4. **`labeler.yml`** — append a new label entry at the end. Shape:
   ```yaml
   <LabelName>:
    - "^(.*<regex pattern>.*)"
   ```
   The regex should match plausible issue title phrasings — usually the display name and one short alias. Note the file does not end with a trailing newline; preserve that.

### Step 4: Make the Forkcast-side edits via `add-series`

Run the `add-series` skill with the Forkcast type abbreviation, display name, pm series key (so it knows whether to add a `SERIES_TO_TYPE` mapping), and Tailwind color. It will:

- Update `src/data/calls.ts` (`CallType` union + `callTypeNames`)
- Update color maps in `CallsIndexTimeline.tsx` and `HomePage.tsx`
- Update `scripts/sync-call-assets.mjs` (`KNOWN_TYPES` and `SERIES_TO_TYPE` mapping)
- Run typecheck/build

Skip `add-series` Step 5 ("Verify artifacts exist") and Step 6 ("Update `protocol-calls.generated.json`") — for a brand-new breakout there are no calls yet. Forkcast renders nothing until the first call is synced via the normal `sync call assets from eth/pm` pipeline.

### Step 5: Open both PRs

- **pm PR**: branch `acdbot/<series>-breakout`, title `acdbot: introduce <series> breakout`. Push to the user's `fork` remote and open PR against `ethereum/pm:master`.
- **Forkcast PR**: branch `add-<series>-breakout`, title `add <series> breakout series`. Push to the user's `dionysuzx` remote and open PR against `ethereum/forkcast:main`.

The Forkcast PR is safe to merge before any call exists — all new entries are latent until a record with the new type lands in `protocol-calls.generated.json`. The pm PR is the gating dependency: the facilitator can't open their first issue until the dropdown option exists.

### Step 6: Hand off the manual checklist to the user

Print this verbatim:

- [ ] **Zoom account**: open an issue in the EF devops repo requesting a Zoom account for the facilitator. Required so the bot can assign them host role on the EF zoom-bot.
- [ ] **Once Zoom account exists**: add the facilitator as a co-host on the zoom-bot account.
- [ ] **Facilitator opens the first issue**: ask them to open the first call issue themselves in `ethereum/pm` using the `Protocol Call` template, selecting the new series from the dropdown with Autopilot enabled. Letting them open it means they can edit the agenda directly.
- [ ] **YouTube playlist**: if not already wired up in the initial PR, create an empty `<Display Name>` playlist on the EF YouTube channel and open a follow-up PR setting `youtube_playlist_id` in `call_series_config.yml`. Doing this before the first call means the bot uploads the inaugural recording into the playlist automatically.
- [ ] **Discord channel**: first check whether an existing Eth R&D channel already fits (most breakouts do — e.g., a networking series can usually live in an existing networking channel). Only request a new channel if no existing one is a reasonable home; the goal is to keep the channel list from growing indefinitely. If a new channel is genuinely needed, ask the Eth R&D Discord admins.

### Step 7: Done

Confirm both PR URLs to the user. Summarize: "pm side configures the bot and dropdown; Forkcast side renders the calls once `sync call assets from eth/pm` picks them up after the first meeting."
