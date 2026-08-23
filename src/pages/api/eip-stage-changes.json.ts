import type { APIRoute } from 'astro';
import { eipsData } from '../../data/eips';
import { buildEipStageChangesPayload } from '../../domain/eips/stageChanges';

// Emitted as a static artifact during `astro build`, served at
// https://forkcast.org/api/eip-stage-changes.json.
//
// Every EIP with a dated stage change, newest first — the site's chronology of
// what moved when. Unbounded: `/api/eips.json` carries the same history nested
// per EIP, so the value this adds is the global ordering, and truncating it
// throws that away.
export const prerender = true;

export const GET: APIRoute = () => {
  const payload = buildEipStageChangesPayload(eipsData, new Date().toISOString());
  return new Response(JSON.stringify(payload, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
