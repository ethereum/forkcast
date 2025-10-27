import { useState, useEffect } from "react";
import { PokebalResponse } from "../types/pokebal";

export function usePokebalData(eipNumber: number): {
  data: PokebalResponse | null;
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<PokebalResponse | null>(null);
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
        const response = await fetch(
          `https://pokebal.raxhvl.com/api/adoption/${eipNumber}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eipNumber]);

  return { data, loading, error };
}
