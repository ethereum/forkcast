import { useState, useEffect } from 'react';
import { ButterflyResponse, EipAdoption } from '../types/butterfly';

export function useButterflyData(eipNumber: number, forkName: string): {
  data: EipAdoption | null;
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<EipAdoption | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Only fetch for EIP 7928
    if (eipNumber !== 7928) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`https://butterfly.raxhvl.com/api/adoption/fork/${forkName.toLowerCase()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const result: ButterflyResponse = await response.json();
        // Find the specific EIP in the response
        const eipData = result.eips.find(e => e.eip === String(eipNumber));
        setData(eipData || null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eipNumber, forkName]);

  return { data, loading, error };
}

