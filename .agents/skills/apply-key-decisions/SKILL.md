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

### Step 1: Gather input

Ask the user for the **call ref** as `{type}/{number}` (e.g. `acde/240`). From it:

1. Resolve the artifact dir by glob: `public/artifacts/{type}/*_{number}/` (folder is `{date}_{numberPadded}`, e.g. `2026-07-02_240`).
2. Read `key_decisions.json` from that dir. It's the source of truth for what changed.
3. Derive the two fields every new `statusHistory` entry needs:
   - **`call`**: `{type}/{number}` with the number as a plain integer, no leading zeros (e.g. `acde/240`, `acdt/85`). This is the `${type}/${number}` format used throughout existing EIPs.
   - **`date`**: the `YYYY-MM-DD` prefix of the artifact folder name (also matches the `meeting` field's date).

### Step 2: Collect the decisions

From `key_decisions.json`, select every entry where **all** of these hold:

- `type == "stage_change"`
- `fork` is present (e.g. `"Hegota"`)
- `stage_change.to` is present
- `eips` is non-empty

Each such entry yields one or more `(eip, forkName, status)` tuples (an entry usually has a single EIP). Ignore `type: "other"` entries and any with an empty `eips` array — those aren't per-EIP status changes.

List the tuples back to the user before editing so they can spot anything off.

### Step 3: Update each EIP's forkRelationships

For each `(eip, forkName, status)`, open `src/data/eips/{eip}.json`:

1. Find an existing `forkRelationships` entry whose `forkName` matches.
   - **None found**: append a new relationship:
     ```json
     {
       "forkName": "{forkName}",
       "statusHistory": [
         { "status": "{status}", "call": "{call}", "date": "{date}" }
       ]
     }
     ```
     Do **not** set `isHeadliner` / `wasHeadlinerCandidate` for a plain stage change — those are only for headliner candidacies and this skill doesn't infer them.
   - **Found**: append a new `statusHistory` entry (keep the array ordered oldest → newest). Skip if an identical `status`+`call` entry already exists (idempotent — re-running the skill must not create duplicates).
2. Preserve all other fields and formatting; only touch `forkRelationships`.

### Step 4: Attempt a champion (presenter)

For each EIP that just got a new/updated relationship, try to add **one** champion — the person who presented it on the call. Only add a champion if the relationship has no `champions` yet.

1. Find the presentation timestamp: check the call's `tldr.json` highlights for the EIP number (e.g. the `eip_proposals_{fork}` section), falling back to the matching `key_decisions` entry's `timestamp`.
2. Read `transcript_corrected.vtt` around that timestamp and identify the **presenter** — the dominant speaker introducing the EIP (skip one-line interjections from the host/others). The VTT speaker label is your candidate (labels are sometimes Discord handles like `soispoke`, sometimes full names like `Ansgar Dietrichs`).
3. Cross-check the candidate against the EIP's `author` field. Authors look like `Thomas Thiery (@soispoke)`; the VTT label may be a full name (`Toni Wahrstätter`) or a handle (`soispoke`). Match the presenter to one of the authors by either the name or the `@handle`. Once matched:
   - **`name`**: the champion's preferred display name. Default to the author's full name (e.g. `Toni Wahrstätter`, `Ben Adams`), but honor personal preferences — some authors prefer their handle (e.g. Thomas Thiery goes by `soispoke`). See the table.
   - **`discord`**: the person's **Discord** handle. This is **not** the GitHub handle in the `author` field — e.g. `@nerolation` → `nero_eth`, `@benaadams` → `ben_a_adams`. Never derive `discord` from the GitHub handle. Use the known-mappings table below or ask the user; **omit `discord`** if you can't confirm it rather than guessing.

   Known author mappings (extend as you confirm more):
   | Author | GitHub | Champion name | Discord |
   |--------|--------|---------------|---------|
   | Thomas Thiery | @soispoke | soispoke | soispoke |
   | Toni Wahrstätter | @nerolation | Toni Wahrstätter | nero_eth |
   | Ben Adams | @benaadams | Ben Adams | ben_a_adams |
4. If the presenter is a facilitator speaking on someone's behalf (e.g. Ansgar, Pooja) or doesn't clearly map to an author, **do not guess** — leave `champions` off and flag that EIP so the user can supply the champion.

Add the champion to that fork's relationship only (max 2 per schema; this skill adds at most 1).

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
