import { ComplexityAnchor, EipComplexity, ComplexityTier } from '../types/complexity';

/**
 * Parse STEEL complexity assessment markdown to extract scores
 */
export function parseComplexityMarkdown(markdown: string, eipNumber: number): EipComplexity | null {
  try {
    const anchors = parseAnchorsFromTable(markdown);
    const totalScore = parseTotalScore(markdown);
    const tier = parseTier(markdown) || calculateTier(totalScore);

    return {
      eipNumber,
      totalScore,
      tier,
      anchors,
      assessmentUrl: `https://github.com/ethsteel/pm/blob/main/complexity_assessments/EIPs/EIP-${eipNumber}.md`,
    };
  } catch {
    return null;
  }
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

  const tableContent = checklistMatch[0];

  // Match table rows: | **Anchor Name** | score | rationale |
  // Score can be: single digit, sum like "2 + 2 + 3 + 1", dash, or empty for unscored
  // Also handles | Anchor Name | score | rationale | (without bold)
  const rowRegex = /\|\s*\*?\*?([^|*]+)\*?\*?\s*\|\s*([^|]*?)\s*\|\s*([^|]*)\|/g;
  let match;

  while ((match = rowRegex.exec(tableContent)) !== null) {
    const name = match[1].trim();
    const score = parseScore(match[2]);
    const notes = match[3].trim() || undefined;

    // Skip header rows
    if (name.toLowerCase() === 'anchor' || name.includes('---')) continue;

    anchors.push({ name, score, notes });
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
 * Calculate tier from total score
 * Low: <10, Medium: >=10 and <20, High: >=20
 */
export function calculateTier(totalScore: number): ComplexityTier {
  if (totalScore < 10) return 'Low';
  if (totalScore < 20) return 'Medium';
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
