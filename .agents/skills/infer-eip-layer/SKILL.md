---
name: infer-eip-layer
description: Classify an EIP's client layer (EL or CL) and set the `layer` field on EIPs that are missing it. Use when active fork EIPs lack a layer (e.g. audit-eips reports "missing layer"). Combines a deterministic `requires`-dependency signal with a semantic read of the EIP's substance; auto-applies only when both agree, otherwise flags for human review.
---

## Infer EIP layer (EL / CL)

Set the `layer` field (`"EL"` or `"CL"`) on EIPs that are missing it. `layer` records which client primarily implements the change: **EL** = execution-layer clients (geth, reth, besu, nethermind, erigon); **CL** = consensus-layer clients (prysm, lighthouse, teku, nimbus, lodestar, grandine).

There is no authoritative `layer` field in upstream EIP frontmatter (both EL and CL Core EIPs are `category: "Core"`), so this is inferred from the EIP's substance.

> **Do NOT use the call venue as a signal.** An EIP being staged on ACDE vs ACDC only reflects which working group shepherded the discussion, not which client implements it. Cross-layer EIPs are routinely discussed on either call (e.g. EIP-8282 "Builder Execution Requests" is CL but was PFI'd on an ACDE call). Ignore the `call` prefix entirely.

### Step 1: Identify the target set

Find active fork EIPs missing a `layer`. The audit already reports these:

```bash
npm run audit-eips -- --fork Hegota
```

Look for `- missing layer (EL or CL)` under the fork. Alternatively, list them directly (source files are the source of truth):

```bash
node scripts/audit-eips.mjs --fork Hegota   # same thing
```

Confirm the list with the user (or take the ids they gave you). Only touch EIPs that are missing `layer` — never overwrite an existing one.

### Step 2: Build the labeled reference map (for Signal A)

Load every EIP that already has a `layer` set into an `id → layer` map. These are your ground-truth anchors for dependency propagation:

```bash
node -e 'const e=require("./src/data/eips.json"); const m={}; for(const x of e){ if(x.layer) m[x.id]=x.layer } process.stdout.write(JSON.stringify(m))'
```

### Step 3: Signal A — `requires` dependency propagation (deterministic)

For each target EIP, look at its `requires` array and map each dependency to its layer via the map from Step 2.

- All resolvable dependencies are **EL** → Signal A = `EL`
- All resolvable dependencies are **CL** → Signal A = `CL`
- Mixed, or no dependency has a known layer → Signal A = `inconclusive`

Notes:
- Only count dependencies whose layer is *known*. Don't recursively guess through unlabeled EIPs.
- Some dependencies are cross-layer bridges and weaken the signal — treat these as **not decisive** on their own: `4788` (beacon root in EVM), `6110` (validator deposits), `4844`/`7594` (blobs). If the only signal is one of these, mark Signal A `inconclusive`.

### Step 4: Signal B — semantic read of the EIP substance

Read the EIP's `title`, `description`, and (if present) `laymanDescription`/`benefits`/`stakeholderImpacts` in `src/data/eips/{id}.json`. If those are thin, fetch the abstract from the source:

```bash
gh api '/repos/ethereum/EIPs/contents/EIPS/eip-{id}.md' --jq '.content' | base64 -d | head -60
```

Classify by **what state/structures the change modifies**, not by keywords alone:

| Signal B = EL | Signal B = CL |
|---------------|---------------|
| EVM opcodes, precompiles, bytecode, stack/memory | validators, attestations, committees |
| gas schedule, calldata, access lists, tx types | beacon state, `eth1data`, deposits, withdrawals |
| account/storage state, state trie, nonces | slots, epochs, RANDAO, slashing, fork choice |
| `ecrecover`, EOA delegation, CREATE/CALL | sync committee, proposer duties, finality |
| execution-specs (`.py` under `eth1`/EELS) | consensus-specs, presets/configs, gossip topics |

Watch for **execution payload** framing: the payload *container* is defined in the CL, but changes to payload *contents/metering* (BAL, gas, tx floor) are EL. A "Partial Execution Payload Commitment" (block-production/ePBS plumbing) is CL; a "Block Access List Byte Floor" (gas metering) is EL.

Output Signal B as `EL`, `CL`, or `unclear`, plus a one-line justification.

### Step 5: Combine and decide

| Signal A | Signal B | Action |
|----------|----------|--------|
| EL/CL, and **agrees** with B | same | **Auto-apply** (high confidence) |
| one is EL/CL, other inconclusive/unclear | — | Apply the decisive one, but **list it in the review queue** (medium confidence) |
| A and B **disagree** | conflict | **Do not apply.** Flag for human review with both rationales. |
| both inconclusive/unclear | — | **Do not apply.** Flag for human review. |

Never guess when signals conflict or are both weak — a wrong `layer` is worse than a missing one.

### Step 6: Apply

For each auto-apply (and any medium-confidence ones the user approves), set `layer` in `src/data/eips/{id}.json`. Placement convention: put `layer` immediately **after `reviewer`** if present, otherwise immediately **before `forkRelationships`**. Only add the field; don't reorder or reformat anything else.

### Step 7: Validate

```bash
npm run compile-eips
npm run lint
```

Fix any errors before continuing.

### Step 8: Summary + PR

Show a table: `EIP | Signal A | Signal B | decision | confidence`. Call out every EIP left in the review queue and ask the user to resolve those before committing.

For the PR (only if the user wants one):
1. Branch: `infer-layer-{fork}` (e.g. `infer-layer-hegota`).
2. Commit: `data: set layer on {fork} EIPs`.
3. PR body: list each EIP with its assigned layer and the deciding signal; note any the user resolved manually.

### Step 9: Retrospective

Note any friction — dependencies that should be added to the cross-layer bridge list, EIPs where the semantic read was ambiguous, mislabeled anchors in the reference map — and offer to patch this skill.
