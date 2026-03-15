# Convert EIP

Convert an EIP proposed for the current fork (e.g., Glamsterdam, Hegota) into forkcast JSON format.

## Schema

Get the current schema:
- Type definitions: `src/types/eip.ts`
- Example EIPs: `src/data/eips/*.json`

## Writing Guidelines

- **description**: max 80 words, match the EIP abstract as closely as possible
- **laymanDescription**: max 60 words, plain language for non-technical readers
- **layer**: choose `EL` or `CL`, whichever is more appropriate
- **reviewer**: set to `"bot"` for AI-generated conversions like this
- **stakeholderImpacts**: ~20 words each
  - `clClients` and `elClients`: focus on implementation complexity
- **benefits**: max 16 words each, up to 4
- **tradeoffs**: max 16 words each, include if any exist
- **discussionLink**: use the EIP's `discussions-to` URL from the frontmatter. If empty (e.g., unmerged EIP), use the headliner proposal URL or Eth Magicians thread if available.
- **specificationUrl**: only set this for unmerged EIPs where the default `eips.ethereum.org` URL would 404. Point it to the GitHub PR (e.g., `https://github.com/ethereum/EIPs/pull/11376`).
- **northStarAlignment**: include if EIP aligns with any of these goals (1 sentence each):
  - `scaleL1`: L1 throughput/efficiency improvements
  - `scaleBlobs`: Blob capacity/scaling improvements
  - `improveUX`: User or developer experience improvements

For descriptions, impacts, and benefits: be as factual and true to the resources as possible. Do not speculate. Do not shoehorn impacts if none exist. Do not assume any information. Return output in code format, without citations.

## Required Inputs

Ask user to fill in and paste:

```
eip: 7807
call: acde/229
discord: @handle
headliner: https://ethereum-magicians.org/... (or "no")
status: (optional, e.g. "Proposed" or "Considered" - leave blank if none)
context: (optional eth r&d discord context)
```

### Status & Presentation History

**statusHistory**: Add if user provides status or transcript has explicit status change. Don't infer—leave empty if uncertain.

**presentationHistory** types:
- `headliner_proposal`: Eth Magicians post proposing EIP as headliner. Requires `link` field.
- `headliner_presentation`: First presentation at a call as headliner candidate (use when user provided a headliner URL). Requires `call` and `date` fields.
- `presentation`: General presentation at a call for non-headliner EIPs. Requires `call` and `date` fields.
- `debate`: Follow-up discussion at a later call, after initial presentation. Requires `call` and `date` fields.

Do not add `timestamp` fields unless you are sure they refer accurately to the start time.

### Headliner Flags

If the user provides a headliner URL (i.e., `headliner` is not "no"), set:
- `isHeadliner`: `false`
- `wasHeadlinerCandidate`: `true`
- For the call presentation, use `headliner_presentation` (not `debate` or `presentation`)

## Automated Resource Gathering

Use the EIP number to gather all resources:

### 1. Raw EIP (Latest from Master)

Fetch the current version from master:
```bash
gh api '/repos/ethereum/EIPs/contents/EIPS/eip-{EIP_NUMBER}.md' --jq '.content' | base64 -d
```

If this 404s (unmerged EIP), fall back to fetching from the PR branch instead. Find the PR, get the head SHA, and fetch from that ref.

### 2. Commit History

Get all commits that modified this EIP:
```bash
gh api '/repos/ethereum/EIPs/commits?path=EIPS/eip-{EIP_NUMBER}.md' --jq '.[] | {sha: .sha[0:7], date: .commit.author.date[0:10], message: .commit.message | split("\n")[0]}'
```

Review these to understand how the EIP evolved. The original "Add EIP" commit is typically the last/oldest one.

### 3. Original PR Discussion

Find the original PR from the first commit:
```bash
# Get the original commit SHA (last in list = oldest). Validate it looks like a hex SHA before using.
ORIGINAL_SHA=$(gh api '/repos/ethereum/EIPs/commits?path=EIPS/eip-{EIP_NUMBER}.md' --jq '.[-1].sha')

# Find the PR for that commit
gh api "/repos/ethereum/EIPs/commits/$ORIGINAL_SHA/pulls" --jq '.[0] | {number, title, html_url}'
```

Then fetch the full PR discussion. **Important**: Must fetch BOTH issue comments AND review comments (line-level):
```bash
# Issue-level comments
gh pr view {PR_NUMBER} --repo ethereum/EIPs --json title,body,author,createdAt,comments

# Review comments (line-level, includes resolved comments)
gh api /repos/ethereum/EIPs/pulls/{PR_NUMBER}/comments --jq '.[] | {user: .user.login, body: .body, created_at: .created_at}'

# Reviews (approvals, change requests)
gh api /repos/ethereum/EIPs/pulls/{PR_NUMBER}/reviews --jq '.[] | {user: .user.login, state: .state, body: .body}'
```

**Important**: Verify you found the original "Add EIP" PR (title should start with "Add EIP"). If not found, ask the user for the original PR link.

### 4. Eth Magicians Discussion

**Do NOT use WebFetch** - it summarizes and loses detail. Use the JSON API directly:
```bash
# Get thread metadata and post count
curl -s "https://ethereum-magicians.org/t/{TOPIC_SLUG}/{TOPIC_ID}.json" | jq '{title, posts_count, created_at}'

# Get all posts with content
curl -s "https://ethereum-magicians.org/t/{TOPIC_SLUG}/{TOPIC_ID}.json" | jq '.post_stream.posts[] | {username, created_at, cooked}'
```

Extract the topic slug and ID from the `discussions-to` URL (e.g., `eip-7807-ssz-execution-blocks/21580`).

**Note**: Discourse only returns the first 20 posts by default. For threads with many posts, fetch the latest posts by using the post IDs from `post_stream.stream` (which contains all IDs) and requesting the most recent ones via `?post_ids[]=`.

### 4a. Headliner Proposal
If user provides a headliner URL, fetch it with the same JSON API approach:
```bash
curl -s "https://ethereum-magicians.org/t/{TOPIC_SLUG}/{TOPIC_ID}.json" | jq '.post_stream.posts[] | {username, created_at, cooked}'
```

Extract the **post date** from `created_at`. Do not assume it matches the call date.

### 5. Call Transcript
Glob: `public/artifacts/{call_type}/*{number}*/**`. Prefer `transcript_corrected.vtt`, fall back to `transcript.vtt`. Grep for the EIP number or title to find relevant discussion.

### 6. Related EIPs
If the EIP has a `requires` field, fetch those using the same method.

### 7. Champion Name
Extract from the EIP `author` field (the name before the GitHub handle). Discord handle comes from user input.

## Pre-Generation Check

Before generating JSON, verify you have enough information for all required fields. If missing critical info (e.g., can't determine layer, no clear benefits from sources), ask user before proceeding.

## Output

Generate files in this order:
1. `src/data/eips/{EIP_NUMBER}-context.md` - context file first (raw data)
2. `src/data/eips/{EIP_NUMBER}.json` - EIP JSON second (synthesized from context)

### Context File Format

The context file preserves the FULL raw data used to generate the EIP. **Every section must include its source URL or file path** so readers can trace where each excerpt came from.

```markdown
# EIP-{number} Context

Generated: {date}

## Raw EIP Content
Source: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-{number}.md
\`\`\`
{full raw EIP markdown}
\`\`\`

## Commit History
Source: https://github.com/ethereum/EIPs/commits/master/EIPS/eip-{number}.md
\`\`\`
{full commit history output}
\`\`\`

## Original PR Discussion
Source: {pr_url}

### PR Body
{full pr body}

### Issue Comments
{all issue-level comments with author/date}

### Review Comments
{all line-level review comments with author/date}

## Eth Magicians Discussion Thread
Source: {thread_url}

### Posts
{all posts with username/date/content}

## Headliner Proposal (if applicable)
Source: {headliner_url}

### Posts
{all posts with username/date/content}

## Call Transcript
Source: {call_ref} - {transcript_path}

### Relevant Excerpts
{excerpts with timestamps}

## Eth R&D Discord Context (if provided)
Source: Eth R&D Discord (user-provided)
{user-provided discord context}

## Related EIPs (if any)
{summaries of required EIPs with links}
```

## Validation

Run the compile script to verify the generated EIP is valid:

```bash
npm run compile-eips
```

Then run the metadata validator to auto-fix fields like `title`, `description`, `status`, and `author` from the canonical EIP source:

```bash
npm run validate-eips -- --eip {EIP_NUMBER} --fix
```

If there are errors in either step, fix them before reporting success.

## Summary & PR

After completing the conversion, report to user with this structured summary. Use the same format for the PR body.

**Important**: Only commit the `.json` file. Do not commit the `*-context.md` file—it is for local reference only.

**PR Title**: `Add EIP-{number}: {title}`

**PR Body / Summary**:
```
> [!NOTE]
> This PR was generated with `claude prompts/convert-eip.md` (see [convert-eip.md](https://github.com/ethereum/forkcast/blob/main/prompts/convert-eip.md)).

## EIP-{number}: {title}

Ported to forkcast format.

### Files
- `src/data/eips/{number}.json` - EIP data

### Sources Used
| Source | Reference |
|--------|-----------|
| Raw EIP | ethereum/EIPs/EIPS/eip-{number}.md |
| Original PR | #{pr_number} - {pr_title} |
| Commits | {count} commits ({date range}) |
| PR Discussion | {comment_count} comments |
| Eth Magicians | {thread_title} ({post_count} posts) |
| Call Transcript | {call_ref} |
| Eth R&D Discord | {yes/no} |
| Headliner Proposal | {url or "N/A"} |

### Metadata
- **Champion**: {name} ({discord_handle})
- **Layer**: {EL/CL}
- **Status**: {status or "none"}
- **Headliner**: {yes/no}
```

## Retrospective

After completing the PR, review the run for any friction: missing guidance, incorrect defaults, assumptions that needed correction, or steps that broke. Present a hyphenated list of issues to the user and offer to patch this SOP to address them.
