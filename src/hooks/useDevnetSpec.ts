import { useState, useEffect, useCallback } from 'react';
import { DevnetSpec } from '../types/devnet-spec';

interface UseDevnetSpecResult {
  spec: DevnetSpec | null;
  loading: boolean;
  error: Error | null;
}

export function useDevnetSpec(id: string | undefined): UseDevnetSpecResult {
  const [spec, setSpec] = useState<DevnetSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSpec = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setError(new Error('No devnet id provided'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const specModule = await import(`../data/devnet-specs/${id}.json`);
      const specData: DevnetSpec = specModule.default;
      setSpec(specData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Failed to load devnet spec: ${id}`));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSpec();
  }, [loadSpec]);

  return { spec, loading, error };
}
