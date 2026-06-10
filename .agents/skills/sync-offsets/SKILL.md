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

- **Livestreamed calls** (acdc, acde): config will have `null` offsets. These always need manual sync — the video and transcript start at different times.
- **Composed Zoom calls** (acdt): config should have non-null PM-provided offsets. These offsets account for the bumper and transcript-based Zoom trim, and `videoStartTime` may be before or after `transcriptStartTime`. Missing PM sync is a pipeline error, not a raw-Zoom zero-sync case. If manual sync is needed to skip beginning chatter, preserve the exact generated `videoStartTime - transcriptStartTime` delta.
- **Raw Zoom calls** (all others): config defaults to `"00:00:00"`. These may need sync if there's dead air at the start — both offsets will be the same value since video and transcript are from the same recording.

### Step 3: Propose timestamps, then have the user confirm

1. Start the dev server from the worktree: `npm run dev` (run in background). Read the dev server output to get the actual port — don't assume 5173, as it may be taken.
2. Read each call's `transcript_corrected.vtt` and find the **call-open anchor** (see heuristic below). This gives the transcript-side timestamp.
3. Propose timestamps per call type:
   - **Raw Zoom**: propose the single start timestamp (both `transcriptStartTime` and `videoStartTime` use it). If the host opens at the very top with no dead air, propose `00:00:00`.
   - **Composed Zoom**: propose the transcript-side anchor as `transcriptStartTime`; compute `videoStartTime` by adding the generated `videoStartTime - transcriptStartTime` delta.
   - **Livestreamed**: propose the transcript-side anchor as `transcriptStartTime`. You **cannot** propose `videoStartTime` — the video is a separate recording you can't watch — so ask the user to read it off the video player in the call page UI.
4. Present the proposals in a table with the call page links (`http://localhost:{port}/calls/{type}/{number}`, zero-pad the number to 3 digits). The user confirms or corrects each by checking the UI — they don't have to hunt for the timestamps from scratch.

**Call-open anchor — where to set the start:** the host's formal opening of the call, i.e. the first substantive, on-topic sentence. Usually *"Welcome to [call name] number N"* or the *"okay, let's get started / today's agenda is…"* kickoff.

Skip everything before it, even though it's speech:
- audio/mic/screen-share checks (*"can you hear me?"*, *"do you see my screen?"*)
- meeting-link / Zoom logistics confusion
- waiting-for-attendees chatter (*"let's wait a couple minutes"*, pinging on Telegram)
- standalone greetings (*"hello everyone"*, *"hi Antonio"*) — **especially when followed by a silent gap** before the real opening

Anchoring on "the host first addresses the group" lands ~10–15s too early; wait for the formal open. Precision caveat: a VTT cue's start time can be a few seconds before the opening words actually begin (the welcome may be mid-cue), so present the proposal as approximate and let the user fine-tune the exact second in the UI.

### Step 4: Apply offsets

Update each call's `config.json` with the confirmed timestamps (format: `HH:MM:SS`):
- **Livestreamed**: set `transcriptStartTime` to the confirmed transcript timestamp and `videoStartTime` to the user's video timestamp
- **Composed Zoom**: set `transcriptStartTime` to the confirmed transcript timestamp and set `videoStartTime` to that timestamp plus the generated video/transcript difference
- **Raw Zoom**: set both `transcriptStartTime` and `videoStartTime` to the same confirmed value

### Step 5: Verify

Ask the user to check each call page on the dev server and confirm sync looks good. Provide the exact links.

### Step 6: PR

1. Create a branch like `sync-offsets-{type}-{number}[-{type}-{number}]`
2. Commit with message: `sync: set video/transcript offsets for {TYPE} {number} [and {TYPE} {number}]`
3. Push and open a PR. IMPORTANT: Do NOT use `#N` for call numbers in the PR title or body — it triggers GitHub issue tagging. Use `{TYPE} {number}` (e.g., `ACDT 75`, `RPC 23`).
4. Clean up: remove the worktree with `git worktree remove --force` (force is needed because `npm install` leaves untracked files).
5. Tell the user to merge the PR.

### Step 7: Post-merge — share on Discord

After the PR is merged, tell the user to share the Forkcast link on Discord:

- **ACD calls** (acdc, acde, acdt): post in the Eth R&D `#allcoredev` channel
- **Breakout calls** (all others): post in the corresponding breakout channel on Eth R&D Discord

Link format: `https://forkcast.org/calls/{type}/{number}` (zero-pad the number to 3 digits)

Remind the user to remove the preview image embed after posting — it keeps the message less obtrusive in the channel.

### Step 8: Done

Congratulate the user on completing the sync with a short celebratory message and emoji.
