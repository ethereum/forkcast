import {
  ChecklistRevision,
  CHECKLIST_REVISIONS,
  ComplexityAnchor,
  ComplexityPullRequest,
  EipComplexity,
  ComplexityTier,
} from './types';

interface ParseComplexityOptions {
  /** Where the assessment can be read. Defaults to the file on the STEEL main branch. */
  assessmentUrl?: string;
  /** The open pull request the assessment came from, when it is not merged yet. */
  pullRequest?: ComplexityPullRequest;
}

/**
 * Parse STEEL complexity assessment markdown to extract scores
 */
export function parseComplexityMarkdown(
  markdown: string,
  eipNumber: number,
  options: ParseComplexityOptions = {}
): EipComplexity | null {
  try {
    const anchors = parseAnchorsFromTable(markdown);
    const checklistRevision = parseChecklistRevision(markdown, anchors.length);
    const totalScore = parseTotalScore(markdown);
    // The assessment's own Final Assessment table describes the tier as "Computed from total
    // score", so the score is the source of truth and a stale or mistyped emoji is corrected.
    const tier = calculateTier(totalScore, checklistRevision);
    const statedTier = parseTier(markdown);

    return {
      eipNumber,
      totalScore,
      tier,
      anchors,
      checklistRevision,
      ...(statedTier && statedTier !== tier ? { statedTier } : {}),
      assessmentUrl:
        options.assessmentUrl ??
        `https://github.com/ethsteel/pm/blob/main/complexity_assessments/EIPs/EIP-${eipNumber}.md`,
      ...(options.pullRequest ? { pullRequest: options.pullRequest } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Parse the checklist revision an assessment was scored against.
 * Format: Checklist revision: **2** (28 anchors)
 *
 * Revision 1 predates the line and does not declare itself, and some revision 2
 * assessments omit it, so the size of the anchor set decides when it is absent.
 */
export function parseChecklistRevision(
  markdown: string,
  anchorCount?: number
): ChecklistRevision {
  const match = markdown.match(/Checklist revision:\s*\**\s*(\d+)/i);
  if (match) {
    const declared = parseInt(match[1], 10);
    if (declared in CHECKLIST_REVISIONS) return declared as ChecklistRevision;
  }

  const midpoint = (CHECKLIST_REVISIONS[1].anchorCount + CHECKLIST_REVISIONS[2].anchorCount) / 2;
  return anchorCount !== undefined && anchorCount >= midpoint ? 2 : 1;
}

/**
 * Parse a score value that may be a single number, sum like "X + Y + Z", dash, or empty
 * Examples: "0", "3", "3 + 3", "2 + 2 + 3 + 1", "—", "-", ""
 */
function parseScore(scoreStr: string): number {
  const trimmed = scoreStr.trim();

  // Empty, dash, or em-dash means not scored (0)
  if (trimmed === '' || trimmed === '—' || trimmed === '-' || trimmed === '–') {
    return 0;
  }

  // Check for addition format (any number of addends)
  if (trimmed.includes('+')) {
    const parts = trimmed.split('+');
    return parts.reduce((sum, part) => {
      const num = parseInt(part.trim(), 10);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }

  // Single number
  const num = parseInt(trimmed, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse the checklist table to extract anchor scores
 * Format: | **Anchor Name** | 0 | rationale |
 * Also handles: | **Anchor Name** | 3 + 3 | rationale | (double-weighted)
 */
function parseAnchorsFromTable(markdown: string): ComplexityAnchor[] {
  const anchors: ComplexityAnchor[] = [];

  // Find the Checklist table section
  const checklistMatch = markdown.match(/### Checklist[\s\S]*?\|[\s\S]*?(?=\n\n|\*\*Total|\n###|\n##|$)/i);
  if (!checklistMatch) return anchors;

  // Read one row per line: | **Anchor Name** | score | rationale |
  // Score can be: single digit, sum like "2 + 2 + 3 + 1", dash, or empty for unscored.
  // A row is kept within its own line, so a row written without its closing pipe costs only
  // that row's rationale rather than shifting every row after it by a cell. The name may
  // carry text outside the bold, as in | **Cross-EIP interactions** (uncapped) |.
  for (const line of checklistMatch[0].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;

    const cells = trimmed.replace(/\|$/, '').split('|').slice(1);
    if (cells.length < 2) continue;

    const name = cells[0].replace(/\*\*/g, '').trim();

    // Skip header and separator rows
    if (!name || name.toLowerCase() === 'anchor' || name.includes('---')) continue;

    anchors.push({
      name,
      score: parseScore(cells[1]),
      // A rationale may itself contain a pipe, so put the remaining cells back together.
      notes: cells.slice(2).join('|').trim() || undefined,
    });
  }

  return anchors;
}

/**
 * Parse total score from Final Assessment table or Total line
 * Format: | **Total Score** | description | 9 | or | **Total Score** | description | **`28`** |
 * Or: **Total: 9** or **Total:** 9
 */
function parseTotalScore(markdown: string): number {
  // Try Final Assessment table - format: | **Total Score** | description | value |
  // Value can be plain number, or formatted like **`28`**
  const tableMatch = markdown.match(/\*\*Total Score\*\*[^|]*\|[^|]*\|\s*[*`]*(\d+)[*`]*\s*\|/i);
  if (tableMatch) {
    return parseInt(tableMatch[1], 10);
  }

  // Try **Total: X** format (number inside the bold)
  const totalMatch = markdown.match(/\*\*Total[:\s]*(\d+)\*\*/i);
  if (totalMatch) {
    return parseInt(totalMatch[1], 10);
  }

  // Try **Total:** X format (number outside the bold)
  const totalMatch2 = markdown.match(/\*\*Total:?\*\*\s*(\d+)/i);
  if (totalMatch2) {
    return parseInt(totalMatch2[1], 10);
  }

  // Try plain "Total: X" or "Total X" on its own line
  const plainTotalMatch = markdown.match(/^Total:?\s*(\d+)/im);
  if (plainTotalMatch) {
    return parseInt(plainTotalMatch[1], 10);
  }

  // Fallback: sum up anchor scores
  const anchors = parseAnchorsFromTable(markdown);
  return anchors.reduce((sum, a) => sum + a.score, 0);
}

/**
 * Parse tier from Final Assessment table
 * Format: | **Complexity Tier** | Computed from total score | 🟢 |
 */
function parseTier(markdown: string): ComplexityTier | null {
  // Look specifically at the Complexity Tier row in the Final Assessment table
  // Format: | **Complexity Tier** | description | emoji |
  const tierRowMatch = markdown.match(/\*\*Complexity Tier\*\*[^|]*\|[^|]*\|\s*(.+?)\s*\|/);
  if (tierRowMatch) {
    const value = tierRowMatch[1].trim();
    if (value.includes('🟢')) return 'Low';
    if (value.includes('🟡')) return 'Medium';
    if (value.includes('🔴')) return 'High';
  }

  // Fallback: don't use generic emoji search since all files contain all emojis
  // in the Tier Interpretation reference table
  return null;
}

/**
 * Calculate tier from total score, against the thresholds of the revision it was scored on.
 */
export function calculateTier(
  totalScore: number,
  revision: ChecklistRevision = 1
): ComplexityTier {
  const { mediumFrom, highFrom } = CHECKLIST_REVISIONS[revision];
  if (totalScore < mediumFrom) return 'Low';
  if (totalScore < highFrom) return 'Medium';
  return 'High';
}

/**
 * Get color classes for complexity tier badge
 */
export function getComplexityTierColor(tier: ComplexityTier): string {
  switch (tier) {
    case 'Low':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300';
    case 'Medium':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300';
    case 'High':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300';
  }
}

/**
 * Get emoji for complexity tier
 */
export function getComplexityTierEmoji(tier: ComplexityTier): string {
  switch (tier) {
    case 'Low':
      return '🟢';
    case 'Medium':
      return '🟡';
    case 'High':
      return '🔴';
  }
}
