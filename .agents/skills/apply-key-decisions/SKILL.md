---
name: apply-key-decisions
description: Propagate a call's fork stage-change decisions into EIP data files. Use when a call's key_decisions.json records EIPs proposed/considered/scheduled/etc. for a fork (e.g. "PFI for Hegota") and the EIP JSONs need their forkRelationships updated to match.
---

## Apply key decisions to EIP fork relationships

A call's `key_decisions.json` records `stage_change` decisions — e.g. ACDE #240 proposed five EIPs for inclusion (PFI) in Hegota. This skill reads those decisions and, for each affected EIP, updates `src/data/eips/{id}.json` so its `forkRelationships` reflect the new fork status, and attempts to add the presenter as a champion.

### Schema

- Types: `src/types/eip.ts` (`ForkRelationship`, `Champion`, `KeyDecision`).
- Example EIP with populated relationships: `src/data/eips/7805.json`.
- `stage_change.to` values map 1:1 onto `statusHistory[].status` (`Proposed`, `Considered`, `Scheduled`, `Included`, `Declined`, `Withdrawn`). "PFI" = `Proposed`, "CFI" = `Considered`, "SFI" = `Scheduled`.

### Steps 1–3: Run the script

Ask the user for the **call ref** as `{type}/{number}` (e.g. `acde/240`), then run:

```bash
node scripts/apply-key-decisions.mjs acde/240 --dry-run   # list the tuples first
node scripts/apply-key-decisions.mjs acde/240
```

Show the user the listed decisions before applying so they can spot anything off. `--since YYYY-MM-DD` or `--all` processes every call with a `key_decisions.json` instead of one ref. The script is idempotent; a decision already recorded is reported as "already reflected". The `apply-key-decisions` workflow runs it after each call sync and opens a PR.

What it does, for reference:

1. Resolves `public/artifacts/{type}/*_{number}/key_decisions.json`. Every new `statusHistory` entry gets `call: "{type}/{number}"` (plain integer) and `date` from the folder's `YYYY-MM-DD` prefix.
2. Takes every entry with `type == "stage_change"`, a `fork`, a `stage_change.to` and a non-empty `eips`, giving one `(eip, forkName, status)` tuple per EIP. Stage changes with **no fork** (often withdrawals/DFIs) are printed as "No fork given, not applied". Apply those by hand if they're real.
3. For each tuple, edits `src/data/eips/{eip}.json`:
   - No relationship for that fork (case-insensitive match): appends `{ "forkName", "statusHistory": [{ status, call, date }] }`. It never sets `isHeadliner` / `wasHeadlinerCandidate`.
   - Otherwise it inserts the entry in date order. It skips the entry if the same `status`+`call` exists, or if the EIP already had that status at that point (e.g. a re-announced PFI).
   - Only `forkRelationships` changes. Files are written as `JSON.stringify(_, null, 2)` plus a trailing newline, like the EIP sync.

The script prints EIPs with **no data file** (use convert-eip) and **"Lacking champions"**: the EIP/fork pairs step 4 applies to.

### Step 4: Attempt a champion (presenter)

For each EIP the script listed under "Lacking champions", try to add **one** champion — the person who championed the proposal. Only add a champion if the relationship has no `champions` yet.

The champion is usually the person who **added the proposal to the call agenda** by commenting on the ACDE/ACDC GitHub issue (in `ethereum/pm`). This is the most reliable signal — more reliable than who spoke on the call, since presenters sometimes speak on behalf of the actual champion.

1. **Primary signal — agenda comment**: Check the call's GitHub agenda issue in `ethereum/pm` for comments proposing each EIP. The commenter is the champion candidate. If the agenda issue is not readily available, fall back to the transcript.
2. **Fallback — transcript**: Find the presentation timestamp from `tldr.json` highlights (e.g. `eip_proposals_{fork}` section), falling back to the `key_decisions` entry's `timestamp`. Read `transcript_corrected.vtt` around that timestamp and identify the **presenter** — the dominant speaker introducing the EIP (skip one-line interjections from the host/others). The VTT speaker label is your candidate (labels are sometimes Discord handles like `soispoke`, sometimes full names like `Ansgar Dietrichs`).
3. Cross-check the candidate against the EIP's `author` field. Authors look like `Thomas Thiery (@soispoke)`; the VTT label may be a full name (`Toni Wahrstätter`) or a handle (`soispoke`). Match the presenter to one of the authors by either the name or the `@handle`. The champion need not be an author (e.g. someone else may champion an EIP on behalf of the original author), but author-match gives extra confidence. Once identified:
   - **`name`**: use the person's full name as it appears in the `author` field or as they are commonly known.
   - **`discord`**: the person's **Discord** handle. This is **not** the GitHub handle in the `author` field — e.g. `@nerolation` → `nero_eth`, `@benaadams` → `ben_a_adams`. Never derive `discord` from the GitHub handle. Use the known-mappings table below or ask the user; **omit `discord`** if you can't confirm it rather than guessing.

   Known mappings (extend as you confirm more):
   | Author | GitHub | Discord |
   |--------|--------|---------|
   | Thomas Thiery | @soispoke | soispoke |
   | Toni Wahrstätter | @nerolation | nero_eth |
   | Ben Adams | @benaadams | ben_a_adams |
   | Etan Kissling | @etan-status | etan-status |
   | Hadrien Croubois | @amxx | hadriencroubois |
   | Jochem Brouwer | - | jochembrouwer |
   | Kevaundray Wedderburn | @kevaundray | kevaundray |
   | Alex Forshtat | @forshtat | alexf5200 |
   | Derek Chiang | - | derekchiang |
4. If the presenter is a facilitator speaking on someone's behalf (e.g. Ansgar, Pari, Nixo) or doesn't clearly map to an author or agenda commenter, **do not guess** — leave `champions` off and flag that EIP so the user can supply the champion.

Add the champion to that fork's relationship only (max 3 per schema; this skill adds at most 1).

### Step 5: Validate

```bash
npm run compile-eips
npm run lint
```

Fix any errors before continuing. `compile-eips` catches malformed EIP JSON.

### Step 6: Confirm with the user

Show a summary table: EIP | fork | status added | champion (or "needs confirmation"). Highlight any EIPs where the presenter couldn't be resolved, and ask the user to confirm champions before committing — presenter attribution is the least certain part.

### Step 7: PR

1. Branch like `apply-decisions-{type}-{number}` (e.g. `apply-decisions-acde-240`).
2. Commit: `data: apply {TYPE} {number} fork decisions to EIPs` (e.g. `data: apply ACDE 240 fork decisions to EIPs`).
3. Push and open a PR. Do NOT use `#N` for the call number in the title/body — GitHub treats it as an issue tag. Write `{TYPE} {number}` (e.g. `ACDE 240`).
4. In the PR body, list the EIPs updated (fork, status, champion) and note any champions the user confirmed manually.

### Step 8: Retrospective

After the PR, note any friction (wrong presenter matches, missing tldr timestamps, ambiguous forks) and offer to patch this skill.
