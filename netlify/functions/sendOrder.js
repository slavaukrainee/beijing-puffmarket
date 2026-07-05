exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const text = (payload && payload.text) ? String(payload.text) : '';
  if (!text.trim()) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing "text" field' }),
    };
  }

  const PUZZLEBOT_URL = 'https://api.puzzlebot.top/api/v1/telegram/sendMessage';
  const PUZZLEBOT_TOKEN = process.env.PUZZLEBOT_TOKEN;
  const PUZZLEBOT_CHAT_ID = process.env.PUZZLEBOT_CHAT_ID || '8940120225';

  if (!PUZZLEBOT_TOKEN) {
    console.error('Missing PUZZLEBOT_TOKEN env variable');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server misconfiguration' }),
    };
  }

  try {
    const response = await fetch(PUZZLEBOT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PUZZLEBOT_TOKEN}`,
      },
      body: JSON.stringify({
        chat_id: PUZZLEBOT_CHAT_ID,
        text,
      }),
    });

    const responseData = await response.text();

    if (!response.ok) {
      console.error('Puzzlebot API error:', responseData);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Failed to send Telegram message', details: responseData }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('sendorder function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};