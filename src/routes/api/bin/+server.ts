import { json, error } from '@sveltejs/kit';
import { buildAuthToken, newCorrelId } from '$lib/server/tami.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const { bin } = await request.json();
  if (!bin || !/^\d{6,8}$/.test(bin)) error(400, 'INVALID_BIN');
  const correlId = newCorrelId();
  const res = await fetch(`${process.env.TAMI_API_BASE_URL}/bin/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CorrelationId': correlId,
      'PG-Auth-Token': buildAuthToken()
    },
    body: JSON.stringify({ bin })
  });
  return json(await res.json());
};
