import type { APIRoute } from 'astro';
import type { EIP } from '../../../types/eip';
import { eipsData } from '../../../data/eips';

// Emitted as one static artifact per EIP during `astro build`, served at
// https://forkcast.org/api/eips/{id}.json.
//
// Under `trailingSlash: 'always'` the dev server matches this route only WITH
// a trailing slash, while the static build serves the bare file. In
// `astro dev`, use /api/eips/{id}.json/ .
//
// The per-EIP counterpart of `/api/eips.json`: the same record, but a single
// small fetch instead of the whole dataset — for the common "what about EIP
// X?" question. Record shape is identical to the per-EIP source files in
// `src/data/eips/`.
export const prerender = true;

export async function getStaticPaths() {
  return eipsData.map((eip) => ({ params: { id: String(eip.id) }, props: { eip } }));
}

export const GET: APIRoute<{ eip: EIP }> = ({ props }) =>
  new Response(JSON.stringify(props.eip, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
