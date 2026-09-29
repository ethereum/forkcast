import { useEffect, useState } from 'react';
import { mentionArtifactUrl, mentionCallKey, type MentionCall } from '../data/eipMentions';
import type { EipMention, EipMentionsData } from '../types/eip';

export interface EipCallMention {
  call: MentionCall;
  mention: EipMention;
}

// Keyed by artifact URL, not by EIP: two EIPs mentioned on the same call share
// one file, so the second tab open is free.
//
// Successes only. The bundled index is compiled from these same files, so a file
// it names is there — a failure is the network, and caching it would make one
// dropped request permanent for the rest of the session.
const cache = new Map<string, EipMentionsData>();

const fetchArtifact = async (url: string): Promise<EipMentionsData | null> => {
  const cached = cache.get(url);
  if (cached) return cached;
  try {
    const response = await fetch(url);
    // A missing artifact is a 404, but a dev server can also answer with a 200
    // and an HTML error page — parsing that as JSON would throw.
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if ((response.headers.get('content-type') || '').includes('text/html')) {
      throw new Error('Not an artifact');
    }
    const data = (await response.json()) as EipMentionsData;
    cache.set(url, data);
    return data;
  } catch {
    return null;
  }
};

/**
 * The mention bodies for one EIP, fetched from the calls named by the bundled
 * index. `calls` is already known synchronously; this only fills in the text, so
 * it stays disabled until the tab is opened.
 */
export function useEipMentions(eipId: number, calls: MentionCall[], enabled: boolean) {
  const [mentions, setMentions] = useState<EipCallMention[]>([]);
  // Calls whose artifact didn't load — distinct from one that loaded and simply
  // doesn't carry this EIP, which the index means can't happen.
  const [failed, setFailed] = useState(0);
  const [loading, setLoading] = useState(false);

  // The key, not the array, is the dependency: `mentionCallsForEip` returns a new
  // array each render, which would otherwise refetch forever.
  const callsKey = calls.map(mentionCallKey).join(',');

  useEffect(() => {
    if (!enabled || calls.length === 0) return;

    let cancelled = false;
    setLoading(true);

    Promise.all(
      calls.map(async (call) => {
        const data = await fetchArtifact(mentionArtifactUrl(call));
        if (!data) return { call, mention: null, failed: true };
        return { call, mention: data.eips?.find((entry) => entry.eip === eipId) ?? null, failed: false };
      }),
    ).then((results) => {
      if (cancelled) return;
      setMentions(
        results.flatMap(({ call, mention }) => (mention ? [{ call, mention }] : [])),
      );
      setFailed(results.filter((result) => result.failed).length);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eipId, callsKey, enabled]);

  return { mentions, loading, failed };
}
