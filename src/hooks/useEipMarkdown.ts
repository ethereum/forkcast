import { useState, useEffect } from 'react';

const cache = new Map<number, string>();

export function useEipMarkdown(eipId: number, enabled: boolean) {
  const [content, setContent] = useState<string | null>(
    cache.get(eipId) ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (cache.has(eipId)) {
      setContent(cache.get(eipId)!);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/eips/${eipId}.md`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        cache.set(eipId, text);
        setContent(text);
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

  return { content, loading, error };
}
