---
name: fix-call-typos
description: Fix transcript/tldr typos for a published Forkcast call AND update the upstream ACDbot vocab so the same typo doesn't recur. Use when a call page on forkcast.org has wrong client/protocol/term names that the pipeline missed.
---

## Fix typos in a published call

This skill walks the user through correcting typos in a call's artifacts on Forkcast (transcript, TLDR, key_decisions) and teaching the upstream ACDbot pipeline at `ethereum/pm` to catch those typos automatically next time.

The "correct" approach would be to fix upstream and re-run the pipeline. In practice we patch the artifacts in both repos *and* update the vocab — that way published assets are right today, and future pipeline runs improve.

See `docs/acdbot-forkcast-asset-pipeline.md` for the full asset pipeline overview.

### Step 0: Prereqs

The user must have both repos checked out locally. Defaults:
- Forkcast: `/Users/lucy/fun/forkcast` (or a worktree under it)
- PM: `/Users/lucy/fun/pm`

If either is missing, ask the user where they live before proceeding.

Open a worktree off `origin/main` for the forkcast side so the user's current branch isn't disturbed (`git fetch origin main && git worktree add …`). Work directly in `pm/` — that repo doesn't typically need a worktree, but pull `main` first.

### Step 1: Identify the call

Ask the user for:

1. **Call slug + number** (e.g., `pqi/038`, `acdc/177`). This determines:
   - Forkcast path: `public/artifacts/{slug}/{date}_{number_padded}/`
   - PM path: `.github/ACDbot/artifacts/{pm_series}/{date}_{number_padded}/` — the PM series name often differs from the forkcast slug. Check `SERIES_TO_TYPE` in `forkcast/scripts/sync-call-assets.mjs` for the mapping (e.g., `pqi` ↔ `pqinterop`, `price` ↔ `glamsterdamrepricings`). Core series (`acdc`, `acde`, `acdt`) pass through unchanged.

Resolve the absolute paths and confirm both directories exist before continuing.

### Step 2: Gather corrections from the user

Ask for two lists:

1. **New vocabulary** — terms the LLM didn't know (client names, protocol names, EIP nicknames). Each term needs a canonical casing (e.g., `Ethlambda`, not `ETH Lambda` or `ETHLambda`).
2. **Specific typo → correct mappings** — every variant the user has spotted, plus its target.

Don't pre-read the transcript yet. Let the user tell you what's wrong first; their list anchors the work.

### Step 3: Survey the transcript for related variants

Once you have the user's list, grep the call's `transcript_corrected.vtt`, `tldr.json`, and (if present) `key_decisions.json` for:

- The user's exact typos (to confirm hits and count occurrences)
- Other plausible variants of the same words. Examples seen in the wild:
  - Casing drift: `ETHLambda`, `ETH Lambda`, `ETH lambda`, `ETLambda` all → `Ethlambda`
  - Vowel/letter drift: `Zeem`, `Zeeam`, `Zem`, `ZEM` all → `Zeam`; `Rheem`, `Reem`, `Dream` → `Ream`
  - Speaker-attributed name confusion: a speaker labeled `| gean` referring to "Jim" almost certainly means `Gean`

Surface the additional variants to the user with `AskUserQuestion`. For every variant ask: "is this the same word?" Don't assume.

Also ask the user the **canonical casing** for any term that appears in multiple forms (e.g., `Ethlambda` vs `ETH Lambda`). Their answer goes into the vocab.

### Step 4: Decide what's safe to add to the global vocab

`ethereum_vocab.yaml` patterns are applied as **global find/replace** by the LLM on every future call. So an entry like `Jim: Gean` would garble any call where someone named Jim speaks. Same for common English words (`Dream → Ream`).

Before adding to the vocab, ask: would this pattern, applied globally, ever break a different call's transcript? If yes, fix it only in the specific call — don't add it to the vocab. If no (the source token is rare and unambiguous), add it.

Generally safe: invented-looking strings (`Zeem`, `QLEAN`, `Gein`, `ETHLambda`).
Generally unsafe: real names (`Jim`), common English words (`Dream`), short ambiguous fragments.

### Step 5: Update PM `ethereum_vocab.yaml`

File: `pm/.github/ACDbot/scripts/asset_pipeline/ethereum_vocab.yaml`.

1. **New vocab terms** — add to the relevant section (`clients.execution`, `clients.consensus`, `clients.lean`, `acronyms`, `technical_terms`, etc.). If a new category is needed (e.g., a new ecosystem of clients), add a new subsection.
2. **Safe error patterns** — append to `error_patterns:` as `- WrongForm: RightForm`.
   - Order longer patterns before shorter ones with the same prefix (e.g., `Zeeam` before `Zem`) so substring matches don't misfire.
   - Existing patterns are mixed-case; match the casing of the source token you want to catch.

### Step 6: Fix the artifacts in Forkcast

In the forkcast worktree, edit `public/artifacts/{slug}/{date}_{number}/`:

1. **`transcript_corrected.vtt`** — apply every typo correction. For multi-token corruptions (e.g., `ReamZeem eats Lambda` for what was meant as "Ream, Zeam, Ethlambda"), do the long unique replacement *first*, then run the single-word substitutions. Use `Edit` with `replace_all: true` for safe global swaps; use scoped `Edit` for one-line fixes (like the `Jim → Gean` case).
2. **`tldr.json`** — apply the same replacements where applicable.
3. **`key_decisions.json`** (ACD calls only) — apply the same replacements. This file references EIP numbers; if a typo named an EIP, also verify the `eips:` array.
4. **`transcript_changelog.tsv`** — this records what the LLM changed from the original. If a row's `corrected` value was wrong (e.g., `Zim → Zeem` when the right answer was `Zeam`), update the target column. Don't add new rows for manual corrections — the changelog is documentation of pipeline output, not of post-hoc edits. (Past examples: PM commit `f7f549b3` removed an over-correction row entirely.)

After editing, grep the file again for any remaining instance of every typo string, including the ones the user gave you. Output should be empty.

### Step 7: Mirror the fixes into PM

The PM repo holds the upstream copy of these same artifacts at `.github/ACDbot/artifacts/{pm_series}/{date}_{number}/`. Before your edits these files were byte-identical to the forkcast copies (they're produced by the pipeline and the sync script just downloads them). The simplest correct move is to `cp` the four edited files (vtt, tldr, changelog, key_decisions if it exists) from forkcast to PM.

Verify with `diff` afterwards — both copies should be identical.

### Step 8: Commit and open PRs

Two PRs, two commit-message styles (mirror prior commits — see PM `f7f549b3`, forkcast `37db68a3` for examples):

**PM PR** — branch like `acdbot-fix-{slug}-{number}`. The commit covers:
- The vocab additions (new terms + error patterns)
- The corrected artifacts

  Title: `acdbot: prevent {topic} transcript corruption` or `acdbot: fix {SLUG} {number} {topic} corruption`. Keep the title short; details go in the body.

**Forkcast PR** — branch like `fix-{slug}-{number}-typos`. Single commit covering the artifact fixes only (no pipeline changes here).

  Title: `fix {SLUG} {number} {topic} typos` or `fix: normalize {topic} in {SLUG} {number} summary`.

For both, do NOT use `#N` for call numbers in PR title/body — GitHub treats it as an issue tag. Write `{SLUG} {number}` (e.g., `PQI 038`).

### Step 9: Cleanup

Once both PRs are open, remove the forkcast worktree (`git worktree remove --force`). Tell the user to merge both PRs (PM first is fine, order doesn't matter — the forkcast fix is a static patch, and the next pipeline run for *future* calls picks up the new vocab).

### Step 10: Done

Confirm to the user that the call page on forkcast.org will show the corrections after the forkcast PR's deploy completes, and that future calls will be auto-corrected by the pipeline using the new vocab entries.
