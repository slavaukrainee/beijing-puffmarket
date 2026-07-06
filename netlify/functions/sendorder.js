const {
  handleSendOrder,
} = require('../../functions/_shared/handlers.cjs');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  try {
    const result = await handleSendOrder(payload);
    return { statusCode: result.status, body: JSON.stringify(result.body) };
  } catch (err) {
    console.error('sendorder function error:', err);
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
