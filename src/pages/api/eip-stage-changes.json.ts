import type { APIRoute } from 'astro';
import { eipsData } from '../../data/eips';
import { buildEipStageChangesPayload } from '../../domain/eips/stageChanges';

// Astro emits this as a static artifact during `astro build`, replacing the old
// post-build scripts/generate-eip-stage-changes.mjs. Served at
// https://forkcast.org/api/eip-stage-changes.json.
export const prerender = true;

export const GET: APIRoute = () => {
  const payload = buildEipStageChangesPayload(eipsData, new Date().toISOString(), 10);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
