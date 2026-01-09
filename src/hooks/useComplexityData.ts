import { useState, useEffect, useCallback } from 'react';
import { EipComplexity } from '../types/complexity';
import { parseComplexityMarkdown } from '../utils/complexity';

interface GitHubFileEntry {
  name: string;
  download_url: string;
}

interface UseComplexityDataResult {
  complexityMap: Map<number, EipComplexity>;
  availableEips: number[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Cache to avoid re-fetching
let cachedComplexityMap: Map<number, EipComplexity> | null = null;
let cachedAvailableEips: number[] | null = null;

const GITHUB_API_URL = 'https://api.github.com/repos/ethsteel/pm/contents/complexity_assessments/EIPs';
const RAW_CONTENT_BASE = 'https://raw.githubusercontent.com/ethsteel/pm/main/complexity_assessments/EIPs';

/**
 * Hook to fetch and parse STEEL complexity assessments from GitHub
 */
export function useComplexityData(): UseComplexityDataResult {
  const [complexityMap, setComplexityMap] = useState<Map<number, EipComplexity>>(
    cachedComplexityMap || new Map()
  );
  const [availableEips, setAvailableEips] = useState<number[]>(cachedAvailableEips || []);
  const [loading, setLoading] = useState(!cachedComplexityMap);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Get directory listing to find available assessments
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

      setAvailableEips(eipNumbers);
      cachedAvailableEips = eipNumbers;

      // Step 2: Fetch and parse each assessment
      const newMap = new Map<number, EipComplexity>();

      // Fetch in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < eipNumbers.length; i += batchSize) {
        const batch = eipNumbers.slice(i, i + batchSize);

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
                newMap.set(eipNumber, complexity);
              }
            } catch (err) {
              console.warn(`Error parsing EIP-${eipNumber}:`, err);
            }
          })
        );
      }

      setComplexityMap(newMap);
      cachedComplexityMap = newMap;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if we don't have cached data
    if (!cachedComplexityMap) {
      fetchData();
    }
  }, [fetchData]);

  const refetch = useCallback(() => {
    cachedComplexityMap = null;
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
