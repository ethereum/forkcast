---
name: add-series
description: Register a new protocol call series in Forkcast. Use when a brand-new series type needs to be added to the codebase (not just syncing new calls in an existing series).
---

## Add a new protocol call series

This skill walks through registering a new series so its calls appear on Forkcast.

### Step 1: Gather info from the user

Ask the user for:

1. **Short type key** — lowercase, no spaces (e.g., `epbs`, `fcr`). This becomes the URL slug and folder name.
2. **Full display name** — human-readable (e.g., `ePBS Breakout`, `Fast Confirmation Rule`).
3. **Series name in ethereum/pm** — the folder/series key as it appears in the pm manifest. If it matches the type key exactly, no mapping is needed. If it differs (e.g., `pqinterop` → `pqi`), a mapping entry is required.
4. **Is it livestreamed?** — Yes only for `acdc`, `acde`, `acdt`. New series are almost never livestreamed.

### Step 2: Update `src/data/calls.ts`

Up to three edits needed:

1. Add the type key to the `CallType` union (line 4):
   ```ts
   export type CallType = '...' | 'fcr' | 'epbs';
   ```

2. Add the full name to `callTypeNames` (line 16–32):
   ```ts
   epbs: 'ePBS Breakout',
   ```

   The `callTypeNames` record is typed as `Record<CallType, string>` — TypeScript will error at build time if any key is missing.

3. **Optional** — EIP association: If the series maps to a specific EIP and should appear on that EIP's detail page, add an entry to `eipCallTypes` (line 49–53):
   ```ts
   7732: 'epbs',
   ```

### Step 3: Update color maps

Two components contain `Record<CallType, string>` color maps that must include the new type:

- `src/components/calls-index/CallsIndexTimeline.tsx` — `CALL_TYPE_BORDER_COLORS` and `CALL_TYPE_BADGE_COLORS`
- `src/components/HomePage.tsx` — `callTypeBadgeColors`

Pick a Tailwind color that doesn't clash with existing series and add entries to all three maps. Example for `epbs` using amber:
```ts
epbs: 'border-l-amber-500 dark:border-l-amber-400',   // border map
epbs: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',  // badge maps
```

### Step 4: Update `scripts/sync-call-assets.mjs`

Two possible edits:

1. Add the type key to `KNOWN_TYPES` (line 22):
   ```js
   const KNOWN_TYPES = new Set([..., 'fcr', 'epbs']);
   ```

2. If the series name in ethereum/pm differs from the type key, add a mapping to `SERIES_TO_TYPE` (lines 25–33):
   ```js
   const SERIES_TO_TYPE = {
     ...,
     pqinterop: 'pqi',
   };
   ```
   If the pm series name already matches the type key, skip this step.

### Step 5: Verify artifacts exist

Check that `public/artifacts/{type}/` exists and contains at least one call directory named `{date}_{number}/` with a `config.json`. If call assets have already been synced from pm, they'll be here. If not, they need to be synced first via `npm run sync-calls`.

A minimal `config.json` looks like:
```json
{
  "issue": 1399,
  "videoUrl": "https://www.youtube.com/watch?v=...",
  "sync": {
    "transcriptStartTime": "00:00:00",
    "videoStartTime": "00:00:00"
  }
}
```

### Step 6: Update `protocol-calls.generated.json`

If the call is already in the pm manifest and assets exist, run:
```sh
npm run sync-calls
```

This regenerates `src/data/protocol-calls.generated.json`, which is the authoritative list of calls shown in the UI. A call only appears if it has a video URL and at least one of: tldr, transcript, or chat.

If the call is not yet in the pm manifest (newly created, or manual addition), add an entry to `protocol-calls.generated.json` by hand:
```json
{
  "type": "epbs",
  "date": "2025-04-03",
  "number": "001",
  "path": "epbs/001",
  "issue": 1399
}
```

### Step 7: Build and lint

```sh
npm run lint
npm run build
```

`tsc -b` catches cross-file type errors. In particular, if `callTypeNames` or any color map is missing the new key, the build will fail here — that's the intended safety net.

### Step 8: PR

1. Create a branch like `add-series-{type}` (e.g., `add-series-epbs`)
2. Commit: `feat: add {FullName} series ({type})`
3. Push and open a PR.
4. Tell the user to merge and then run `/sync-offsets` to set video/transcript offsets for the new calls.
