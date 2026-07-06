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
      Prefer: 'return=minimal',
      ...(options.headers || {}),
    },
  });
  return response.ok;
}

async function findChatIdByUsername(username) {
  const key = String(username || '').replace('@', '').trim().toLowerCase();
  if (!key) return null;

  try {
    const botUsers = await fetch(
      `${SUPABASE_URL}/rest/v1/bot_users?username=eq.${encodeURIComponent(key)}&select=chat_id&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (botUsers.ok) {
      const rows = await botUsers.json();
      if (rows[0]?.chat_id) return rows[0].chat_id;
    }
  } catch (_) {}

  try {
    const legacy = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?contact_type=eq.bot_user&contact=eq.${encodeURIComponent(key)}&select=items&order=id.desc&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (legacy.ok) {
      const rows = await legacy.json();
      const meta = rows[0]?.items?.find((item) => item && item.chat_id);
      if (meta?.chat_id) return meta.chat_id;
    }
  } catch (_) {}

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

async function trySaveOrder(order) {
  const contactValue = order.contactMethod === 'telegram'
    ? String(order.contact || '').replace('@', '').trim()
    : String(order.contact || '').trim();

  const payloads = [
    {
      items: order.items,
      total: order.total,
      contact: contactValue,
      contact_type: order.contactMethod,
    },
    {
      items: order.items,
      total: order.total,
      contact: contactValue,
    },
    {
      items: JSON.stringify(order.items),
      total: order.total,
      contact: contactValue,
    },
  ];

  for (const payload of payloads) {
    if (await supabaseRequest('orders', { method: 'POST', body: JSON.stringify(payload) })) {
      return true;
    }
  }
  return false;
}

async function supabaseGet(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!response.ok) return null;
  return response.json();
}

async function decrementStock(items) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (!item.id) continue;
    const rows = await supabaseGet(`products?id=eq.${item.id}&select=stock&limit=1`);
    if (!rows || !rows[0] || rows[0].stock == null) continue;
    const next = Math.max(0, Number(rows[0].stock) - (Number(item.quantity) || 0));
    const payloads = [
      { stock: next, is_available: next > 0 },
      { stock: next },
      { is_available: next > 0 },
    ];
    for (const body of payloads) {
      if (await supabaseRequest(`products?id=eq.${item.id}`, { method: 'PATCH', body: JSON.stringify(body) })) {
        break;
      }
    }
  }
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
  const order = payload && payload.order ? payload.order : null;

  if (!text) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing "text" field' }) };
  }

  try {
    await tgRequest('sendMessage', { chat_id: ADMIN_CHAT_ID, text });

    let clientNotified = false;
    if (contactMethod === 'telegram' && telegramUsername) {
      const clientChatId = await findChatIdByUsername(telegramUsername);
      if (clientChatId) {
        const clientText = `🙏 Спасибо за заказ в Beijing Puff Market!\n\nВот ваш чек:\n\n${text}`;
        await tgRequest('sendMessage', { chat_id: clientChatId, text: clientText });
        clientNotified = true;
      }
    }

    let savedToDb = false;
    if (order) {
      try {
        savedToDb = await trySaveOrder(order);
        await decrementStock(order.items);
      } catch (err) {
        console.error('Supabase save skipped:', err.message);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        clientNotified,
        savedToDb,
        hint: contactMethod === 'telegram' && !clientNotified
          ? 'Admin notified. Client: press /start in bot and use same @username.'
          : null,
      }),
    };
  } catch (err) {
    console.error('sendorder function error:', err);
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
