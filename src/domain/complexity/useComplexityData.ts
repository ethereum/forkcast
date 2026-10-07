import { useState, useEffect, useCallback } from 'react';
import { ComplexityPullRequest, EipComplexity } from './types';
import { parseComplexityMarkdown } from './complexity';

interface GitHubFileEntry {
  name: string;
  download_url: string;
}

interface GitHubPullEntry {
  number: number;
  title: string;
  html_url: string;
  draft: boolean;
  head: {
    sha: string;
    repo: { full_name: string } | null;
  };
}

interface UseComplexityDataResult {
  complexityMap: Map<number, EipComplexity>;
  availableEips: number[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Cache to avoid re-fetching
let cachedMergedMap: Map<number, EipComplexity> | null = null;
let cachedPendingMap: Map<number, EipComplexity> | null = null;
let cachedAvailableEips: number[] | null = null;

// Renamed from ethsteel/pm. The old name still resolves, but each API call then costs
// two of the 60 unauthenticated requests an hour: the redirect and its target.
const REPO = 'ethspecs/pm';
const ASSESSMENT_DIR = 'complexity_assessments/EIPs';
const GITHUB_API_URL = `https://api.github.com/repos/${REPO}/contents/${ASSESSMENT_DIR}`;
const PULLS_API_URL = `https://api.github.com/repos/${REPO}/pulls?state=open&per_page=100`;
const RAW_CONTENT_BASE = `https://raw.githubusercontent.com/${REPO}/main/${ASSESSMENT_DIR}`;

const BATCH_SIZE = 5;

function combine(
  merged: Map<number, EipComplexity>,
  pending: Map<number, EipComplexity> | null
): Map<number, EipComplexity> {
  if (!pending || pending.size === 0) return merged;
  return new Map([...pending, ...merged]);
}

/**
 * Assessments on the main branch, keyed by EIP number.
 */
async function fetchMergedAssessments(): Promise<{
  map: Map<number, EipComplexity>;
  eipNumbers: number[];
}> {
  const dirResponse = await fetch(GITHUB_API_URL);
  if (!dirResponse.ok) {
    throw new Error(`Failed to fetch directory: ${dirResponse.status}`);
  }

  const files: GitHubFileEntry[] = await dirResponse.json();

  // Extract EIP numbers from filenames (format: EIP-{number}.md)
  const eipNumbers: number[] = [];
  for (const file of files) {
    const match = file.name.match(/^EIP-(\d+)\.md$/);
    if (match) {
      eipNumbers.push(parseInt(match[1], 10));
    }
  }

  const map = new Map<number, EipComplexity>();

  // Fetch in batches to avoid overwhelming the API
  for (let i = 0; i < eipNumbers.length; i += BATCH_SIZE) {
    const batch = eipNumbers.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (eipNumber) => {
        try {
          const rawUrl = `${RAW_CONTENT_BASE}/EIP-${eipNumber}.md`;
          const response = await fetch(rawUrl);

          if (!response.ok) {
            console.warn(`Failed to fetch EIP-${eipNumber}: ${response.status}`);
            return;
          }

          const markdown = await response.text();
          const complexity = parseComplexityMarkdown(markdown, eipNumber);

          if (complexity) {
            map.set(eipNumber, complexity);
          }
        } catch (err) {
          console.warn(`Error parsing EIP-${eipNumber}:`, err);
        }
      })
    );
  }

  return { map, eipNumbers };
}

/**
 * Assessments that so far only exist in an open pull request.
 *
 * The PR title names its EIP ("Add EIP-1234 complexity assessment"), which is enough to
 * address the file on the branch head directly. Listing each PR's files instead would cost
 * one GitHub API call per PR against the 60/hour unauthenticated budget, where
 * raw.githubusercontent.com reads are unmetered. A title that names no EIP, or names one
 * whose assessment the branch does not carry, simply contributes nothing.
 */
async function fetchPendingAssessments(): Promise<Map<number, EipComplexity>> {
  const pending = new Map<number, EipComplexity>();

  const response = await fetch(PULLS_API_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch pull requests: ${response.status}`);
  }

  const pulls: GitHubPullEntry[] = await response.json();

  // Newest PR wins when several propose an assessment for the same EIP.
  const candidates = new Map<number, GitHubPullEntry>();
  for (const pull of [...pulls].sort((a, b) => a.number - b.number)) {
    if (!pull.head.repo) continue;
    const match = pull.title.match(/EIP-?\s*(\d+)/i);
    if (!match) continue;
    candidates.set(parseInt(match[1], 10), pull);
  }

  const entries = [...candidates.entries()];
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async ([eipNumber, pull]) => {
        const repo = pull.head.repo!.full_name;
        const path = `${ASSESSMENT_DIR}/EIP-${eipNumber}.md`;
        try {
          const rawResponse = await fetch(
            `https://raw.githubusercontent.com/${repo}/${pull.head.sha}/${path}`
          );
          if (!rawResponse.ok) return;

          const markdown = await rawResponse.text();
          const pullRequest: ComplexityPullRequest = {
            number: pull.number,
            url: pull.html_url,
            title: pull.title,
            isDraft: pull.draft,
          };
          const complexity = parseComplexityMarkdown(markdown, eipNumber, {
            assessmentUrl: `https://github.com/${repo}/blob/${pull.head.sha}/${path}`,
            pullRequest,
          });

          if (complexity) {
            pending.set(eipNumber, complexity);
          }
        } catch (err) {
          console.warn(`Error parsing EIP-${eipNumber} from PR #${pull.number}:`, err);
        }
      })
    );
  }

  return pending;
}

/**
 * Hook to fetch and parse STEEL complexity assessments from GitHub
 */
export function useComplexityData(): UseComplexityDataResult {
  const [complexityMap, setComplexityMap] = useState<Map<number, EipComplexity>>(
    cachedMergedMap ? combine(cachedMergedMap, cachedPendingMap) : new Map()
  );
  const [availableEips, setAvailableEips] = useState<number[]>(cachedAvailableEips || []);
  const [loading, setLoading] = useState(!cachedMergedMap);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    let merged = cachedMergedMap;

    if (!merged) {
      try {
        setLoading(true);
        setError(null);

        const result = await fetchMergedAssessments();
        merged = result.map;
        cachedMergedMap = merged;
        cachedAvailableEips = result.eipNumbers;
        setAvailableEips(result.eipNumbers);
        setComplexityMap(combine(merged, cachedPendingMap));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        return;
      } finally {
        setLoading(false);
      }
    }

    // Merged assessments are already on screen; unmerged ones fill in behind them, and a
    // failure here leaves the table showing what did load rather than an error.
    if (!cachedPendingMap) {
      try {
        const pending = await fetchPendingAssessments();
        cachedPendingMap = pending;
        setComplexityMap(combine(merged, pending));
      } catch (err) {
        console.warn('Error fetching pending complexity assessments:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (!cachedMergedMap || !cachedPendingMap) {
      fetchData();
    }
  }, [fetchData]);

  const refetch = useCallback(() => {
    cachedMergedMap = null;
    cachedPendingMap = null;
    cachedAvailableEips = null;
    fetchData();
  }, [fetchData]);

  return { complexityMap, availableEips, loading, error, refetch };
}

/**
 * Get complexity data for a specific EIP
 */
export function getComplexityForEip(
  complexityMap: Map<number, EipComplexity>,
  eipNumber: number
): EipComplexity | null {
  return complexityMap.get(eipNumber) || null;
}
