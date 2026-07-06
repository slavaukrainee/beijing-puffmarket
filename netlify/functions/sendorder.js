const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.PUZZLE_BOT_API_KEY || '8940120225:AAHONShsV1iwDRYIiqciNovNQoB4OyvFqhQ';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '1625251103';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xtuzjkavnzxfqlyxfvas.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_du2PviAhyWt6Gx0iWgKMqw_UUC1BZiH';
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

function readLocalUsers() {
  try {
    const file = path.join(__dirname, '..', '..', 'data', 'bot_users.json');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

async function findChatIdByUsername(username) {
  const key = String(username || '').replace('@', '').trim().toLowerCase();
  if (!key) return null;

  try {
    const url = `${SUPABASE_URL}/rest/v1/bot_users?username=eq.${encodeURIComponent(key)}&select=chat_id&limit=1`;
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (response.ok) {
      const rows = await response.json();
      if (rows.length && rows[0].chat_id) return rows[0].chat_id;
    }
  } catch (err) {
    console.error('Supabase bot_users lookup failed:', err.message);
  }

  const local = readLocalUsers();
  const entry = local[key];
  return entry && entry.chat_id ? entry.chat_id : null;
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
