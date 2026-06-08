import { useState, useEffect } from 'react';
import type { EipSpecHistory } from '../types/eip';

const cache = new Map<number, EipSpecHistory>();

export function useEipHistory(eipId: number, enabled: boolean) {
  const [history, setHistory] = useState<EipSpecHistory | null>(
    cache.get(eipId) ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset to cached value (or null) whenever the EIP changes,
  // so stale data from the previous EIP doesn't linger.
  useEffect(() => {
    setHistory(cache.get(eipId) ?? null);
  }, [eipId]);

  useEffect(() => {
    if (!enabled) return;

    if (cache.has(eipId)) {
      setHistory(cache.get(eipId)!);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setHistory(null);
    setLoading(true);
    setError(null);

    fetch(`/eips/history/${eipId}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          throw new Error('History not available');
        }
        return res.json();
      })
      .then((data: EipSpecHistory) => {
        if (cancelled) return;
        cache.set(eipId, data);
        setHistory(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eipId, enabled]);

  return { history, loading, error };
}
