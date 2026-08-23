import type { APIRoute } from 'astro';
import { eipsData } from '../../data/eips';

// Emitted as a static artifact during `astro build`, served at
// https://forkcast.org/api/eips.json.
//
// The full EIP dataset, unfiltered. Page bodies render client-side, so this is
// the only way to read fork relationships, stage history, and narrative fields
// without cloning the repo. Minified — nothing reads this by eye.
export const prerender = true;

export const GET: APIRoute = () => {
  const payload = {
    generatedAt: new Date().toISOString(),
    count: eipsData.length,
    eips: eipsData,
  };
  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });
};
