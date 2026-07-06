import { handleSendOrder } from './_shared/handlers.js';

export async function onRequestPost(context) {
  try {
    const payload = await context.request.json();
    const result = await handleSendOrder(payload);
    return Response.json(result.body, { status: result.status });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
