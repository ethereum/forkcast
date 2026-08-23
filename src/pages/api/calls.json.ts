import type { APIRoute } from 'astro';
import { callTypeNames, protocolCalls } from '../../data/calls';

// Emitted as a static artifact during `astro build`, served at
// https://forkcast.org/api/calls.json.
//
// The authoritative call index. `path` is the artifact directory, so a consumer
// can go straight to `/artifacts/{path}/tldr.json` instead of guessing dates.
// `series` is included because the type slugs are otherwise undecodable.
export const prerender = true;

export const GET: APIRoute = () => {
  const payload = {
    generatedAt: new Date().toISOString(),
    count: protocolCalls.length,
    series: callTypeNames,
    calls: protocolCalls,
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
