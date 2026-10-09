import { useEffect, useState } from 'react';
import { extractAgendaMarkdown } from '../domain/calls/callAgenda';

/**
 * Agendas are stable once a call has happened, and the unauthenticated GitHub API
 * allows 60 requests an hour per visitor, so a fetched issue is kept for the session.
 */
const cache = new Map<number, string>();

interface UseCallAgendaResult {
  /** Agenda markdown; an empty string means the issue carries no agenda. */
  agenda: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * The agenda markdown from an `ethereum/pm` call issue. The caller mounts this hook's
 * component only while the Agenda tab is open, which is what holds the request back:
 * most visitors never open it, and the call page already spends part of the visitor's
 * GitHub budget on the upcoming-calls fetch.
 */
export function useCallAgenda(issueNumber: number): UseCallAgendaResult {
  const [agenda, setAgenda] = useState<string | null>(() => cache.get(issueNumber) ?? null);
  const [loading, setLoading] = useState(!cache.has(issueNumber));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hit = cache.get(issueNumber);
    if (hit !== undefined) {
      setAgenda(hit);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setAgenda(null);
    setLoading(true);
    setError(null);

    fetch(`https://api.github.com/repos/ethereum/pm/issues/${issueNumber}`)
      .then(response => {
        if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
        return response.json();
      })
      .then((issue: { body?: string }) => {
        if (cancelled) return;
        const parsed = extractAgendaMarkdown(issue.body);
        cache.set(issueNumber, parsed);
        setAgenda(parsed);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load the agenda');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [issueNumber]);

  return { agenda, loading, error };
}
