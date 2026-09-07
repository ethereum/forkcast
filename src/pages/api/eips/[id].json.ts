import type { APIRoute } from 'astro';
import { eipById, eipsData } from '../../../data/eips';

// Emitted as one static artifact per EIP during `astro build`, served at
// https://forkcast.org/api/eips/{id}.json.
//
// Dev-server quirk (Astro 6.x, fixed in 7): under `trailingSlash: 'always'` a
// *dynamic* endpoint whose name has a file extension matches only WITH a
// trailing slash locally, while the static build (and production) serve it
// without one. In `astro dev`, use /api/eips/{id}.json/ .
//
// The per-EIP counterpart of `/api/eips.json`: the same record, but a single
// small fetch instead of the whole dataset — for the common "what about EIP
// X?" question. Record shape is identical to the per-EIP source files in
// `src/data/eips/`.
export const prerender = true;

export async function getStaticPaths() {
  return eipsData.map((eip) => ({ params: { id: String(eip.id) } }));
}

export const GET: APIRoute = ({ params }) => {
  const eip = eipById.get(Number(params.id));
  if (!eip) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(JSON.stringify(eip, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
