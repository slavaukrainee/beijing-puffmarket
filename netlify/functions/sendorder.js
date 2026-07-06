const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.PUZZLE_BOT_API_KEY || '8940120225:AAHONShsV1iwDRYIiqciNovNQoB4OyvFqhQ';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '1625251103';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xtuzjkavnzxfqlyxfvas.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_du2PviAhyWt6Gx0iWgKMqw_UUC1BZiH';
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: response.ok, status: response.status, data };
}

async function findChatIdByUsername(username) {
  const key = String(username || '').replace('@', '').trim().toLowerCase();
  if (!key) return null;

  const botUsers = await supabaseRequest(
    `bot_users?username=eq.${encodeURIComponent(key)}&select=chat_id&limit=1`
  );
  if (botUsers.ok && Array.isArray(botUsers.data) && botUsers.data[0]?.chat_id) {
    return botUsers.data[0].chat_id;
  }

  const legacy = await supabaseRequest(
    `orders?contact_type=eq.bot_user&contact=eq.${encodeURIComponent(key)}&select=items&order=id.desc&limit=1`
  );
  if (legacy.ok && Array.isArray(legacy.data) && legacy.data[0]?.items) {
    const meta = legacy.data[0].items.find((item) => item && item.chat_id);
    if (meta?.chat_id) return meta.chat_id;
  }

  return null;
}

async function tgRequest(method, body) {
  const response = await fetch(`${API_BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || `Telegram API error: ${method}`);
  return data.result;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const text = payload && payload.text ? String(payload.text).trim() : '';
  const contactMethod = payload && payload.contact_method ? String(payload.contact_method) : '';
  const telegramUsername = payload && payload.telegram_username
    ? String(payload.telegram_username).replace('@', '').trim()
    : '';

  if (!text) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing "text" field' }) };
  }

  if (contactMethod !== 'telegram') {
    return { statusCode: 200, body: JSON.stringify({ success: true, skipped: true }) };
  }

  try {
    await tgRequest('sendMessage', { chat_id: ADMIN_CHAT_ID, text });

    const clientChatId = await findChatIdByUsername(telegramUsername);
    if (!clientChatId) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: `Клиент @${telegramUsername} не найден. Нужно нажать /start в боте.`,
        }),
      };
    }

    const clientText = `🙏 Спасибо за заказ в Beijing Puff Market!\n\nВот ваш чек:\n\n${text}`;
    await tgRequest('sendMessage', { chat_id: clientChatId, text: clientText });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('sendorder function error:', err);
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
