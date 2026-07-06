import { handleBotWebhook } from '../_shared/handlers.js';

export async function onRequestPost(context) {
  try {
    const update = await context.request.json();
    const result = await handleBotWebhook(update);
    return Response.json(result.body, { status: result.status });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
