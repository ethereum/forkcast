# Sync Offsets

Sets video/transcript sync offsets for newly synced protocol calls. Run after "sync call assets from eth/pm" commits land on main.

## When to use

After the `sync-call-assets.yml` workflow commits new call artifacts, livestreamed calls (acdc, acde, acdt) ship with `null` sync offsets — the video and transcript play but aren't aligned. Non-livestreamed calls default to `00:00:00`, which is usually correct but may need adjustment if there's dead air at the start. This skill walks through setting the correct offsets.

## How to invoke

```
/sync-offsets
```

## What it does

1. **Prep** — Opens a git worktree off `origin/main`, installs dependencies, and identifies which calls were synced by reading recent commit bodies.
2. **Identify** — Reads each call's `config.json` to determine whether offsets need manual sync (`null` for livestreamed, `00:00:00` for non-livestreamed).
3. **Get timestamps** — Starts a dev server and provides call page links so you can find where speech begins in both the video and transcript.
4. **Apply** — Updates `config.json` with the timestamps you provide.
5. **Verify** — You confirm the sync looks correct on the dev server.
6. **PR** — Creates a branch, commits, pushes, opens a PR, and cleans up the worktree.
7. **Post-merge** — For ACD calls, reminds you to post the Forkcast link in the ACD Discord thread.

## Config format

Each call's `config.json` in `public/artifacts/{type}/{date}_{number}/`:

```json
{
  "issue": 1976,
  "videoUrl": "https://youtube.com/watch?v=...",
  "sync": {
    "transcriptStartTime": "00:07:12",
    "videoStartTime": "00:02:16"
  }
}
```

- **Livestreamed calls**: `transcriptStartTime` and `videoStartTime` are different — the YouTube stream and Zoom transcript start at different moments.
- **Non-livestreamed calls**: both values are the same — they come from a single Zoom recording.

## Related

- [Asset pipeline docs](../acdbot-forkcast-asset-pipeline.md) — full pipeline overview including the [Video/Transcript Sync](../acdbot-forkcast-asset-pipeline.md#videotranscript-sync) section
- Skill source: `.claude/skills/sync-offsets/SKILL.md`
