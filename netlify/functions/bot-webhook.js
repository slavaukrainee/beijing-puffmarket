const {
  handleBotWebhook,
} = require('../../functions/_shared/handlers.cjs');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let update;
  try {
    update = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  try {
    const result = await handleBotWebhook(update);
    return { statusCode: result.status, body: JSON.stringify(result.body) };
  } catch (err) {
    console.error('bot-webhook error:', err);
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
