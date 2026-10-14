import { useEffect, useState } from 'react';
import type { EipComplexity } from '../domain/complexity/types';

interface UseComplexityDataResult {
  complexityMap: Map<number, EipComplexity>;
  loading: boolean;
  error: Error | null;
}

let cachedMap: Map<number, EipComplexity> | null = null;

/**
 * STEEL complexity assessments, keyed by EIP number, from the build-time snapshot
 * (scripts/snapshot-github-content.mjs, refreshed on every deploy), so the tabs no longer
 * call the GitHub API from the visitor's browser. Assessments that so far only exist in
 * an open pull request fill in behind the merged ones; an EIP missing from the snapshot
 * reads as not assessed. Imported on demand so only the pages that show it load it.
 */
async function loadComplexityMap(): Promise<Map<number, EipComplexity>> {
  const { default: snapshot } = await import('../data/generated/complexity-assessments.json');
  const pending = (snapshot.pending ?? []) as EipComplexity[];
  const merged = (snapshot.merged ?? []) as EipComplexity[];
  return new Map([...pending, ...merged].map(complexity => [complexity.eipNumber, complexity]));
}

export function useComplexityData(): UseComplexityDataResult {
  const [complexityMap, setComplexityMap] = useState(() => cachedMap ?? new Map<number, EipComplexity>());
  const [loading, setLoading] = useState(!cachedMap);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cachedMap) return;
    let cancelled = false;
    loadComplexityMap()
      .then(map => {
        cachedMap = map;
        if (!cancelled) setComplexityMap(map);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err : new Error('Unknown error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { complexityMap, loading, error };
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
