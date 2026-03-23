---
name: sync-offsets
description: Set video/transcript sync offsets for newly synced calls. Use after "sync call assets from eth/pm" commits land on main.
---

## Sync offsets for new calls

This skill walks the user through setting video/transcript sync offsets for newly synced protocol calls.

### Step 1: Prep

1. Open a worktree based off `origin/main` so the user's current work isn't disrupted: use `git worktree add` with a temp path, fetching latest from remote first (`git fetch origin main`).
2. Run `npm install` in the worktree — it won't have `node_modules`.
3. Work inside the worktree for all remaining steps.
4. Check `git log` for recent "sync call assets from eth/pm" commits. The commit body lists which calls were synced (e.g., `acdt/075`, `rpc/023`).
5. For each synced call, read `public/artifacts/{type}/{date}_{number}/config.json` to check current sync offsets.

### Step 2: Identify what needs sync

- **Livestreamed calls** (acdc, acde, acdt): config will have `null` offsets. These always need manual sync — the video and transcript start at different times.
- **Non-livestreamed calls** (all others): config defaults to `"00:00:00"`. These may need sync if there's dead air at the start — both offsets will be the same value since video and transcript are from the same recording.

### Step 3: Get timestamps from the user

1. Start the dev server from the worktree: `npm run dev` (run in background). Read the dev server output to get the actual port — don't assume 5173, as it may be taken.
2. Give the user Forkcast call page links using the actual port: `http://localhost:{port}/calls/{type}/{number}` (zero-pad the number to 3 digits)
3. For each call, ask the user to provide:
   - **Livestreamed**: video timestamp AND transcript timestamp where the host first speaks
   - **Non-livestreamed**: single timestamp where speech begins (or confirm `00:00:00` is fine)
4. Do NOT pre-read the transcript or suggest timestamps. Let the user match video and transcript using the call page UI.

### Step 4: Apply offsets

Update each call's `config.json`:
- **Livestreamed**: set `transcriptStartTime` and `videoStartTime` to the user's values (format: `HH:MM:SS`)
- **Non-livestreamed**: set both `transcriptStartTime` and `videoStartTime` to the same value

### Step 5: Verify

Ask the user to check each call page on the dev server and confirm sync looks good. Provide the exact links.

### Step 6: PR

1. Create a branch like `sync-offsets-{type}-{number}[-{type}-{number}]`
2. Commit with message: `sync: set video/transcript offsets for {TYPE} {number} [and {TYPE} {number}]`
3. Push and open a PR. IMPORTANT: Do NOT use `#N` for call numbers in the PR title or body — it triggers GitHub issue tagging. Use `{TYPE} {number}` (e.g., `ACDT 75`, `RPC 23`).
4. Clean up: remove the worktree with `git worktree remove --force` (force is needed because `npm install` leaves untracked files).
5. Tell the user to merge the PR.

### Step 7: Post-merge (ACD calls only)

If any of the synced calls are ACD calls (acdc, acde, acdt), tell the user to post the Forkcast link in the ACD Discord thread:

- Forkcast link format: `https://forkcast.org/calls/{type}/{number}`

### Step 8: Done

Congratulate the user on completing the sync with a short celebratory message and emoji.
