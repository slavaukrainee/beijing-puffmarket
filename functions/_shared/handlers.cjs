const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8940120225:AAHONShsV1iwDRYIiqciNovNQoB4OyvFqhQ';
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

async function supabaseGet(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!response.ok) return null;
  return response.json();
}

async function findChatIdByUsername(username) {
  const key = String(username || '').replace('@', '').trim().toLowerCase();
  if (!key) return null;
  try {
    const rows = await supabaseGet(`bot_users?username=eq.${encodeURIComponent(key)}&select=chat_id&limit=1`);
    if (rows?.[0]?.chat_id) return rows[0].chat_id;
  } catch (_) {}
  try {
    const rows = await supabaseGet(
      `orders?contact_type=eq.bot_user&contact=eq.${encodeURIComponent(key)}&select=items&order=id.desc&limit=1`,
    );
    const meta = rows?.[0]?.items?.find((item) => item && item.chat_id);
    if (meta?.chat_id) return meta.chat_id;
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
  if (!data.ok) throw new Error(data.description || method);
  return data.result;
}

async function trySaveOrder(order) {
  const contactValue = order.contactMethod === 'telegram'
    ? String(order.contact || '').replace('@', '').trim()
    : String(order.contact || '').trim();
  const payloads = [
    { items: order.items, total: order.total, contact: contactValue, contact_type: order.contactMethod },
    { items: order.items, total: order.total, contact: contactValue },
  ];
  for (const payload of payloads) {
    if (await supabaseRequest('orders', { method: 'POST', body: JSON.stringify(payload) })) return true;
  }
  return false;
}

async function decrementStock(items) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (!item.id) continue;
    const rows = await supabaseGet(`products?id=eq.${item.id}&select=stock&limit=1`);
    if (!rows?.[0] || rows[0].stock == null) continue;
    const next = Math.max(0, Number(rows[0].stock) - (Number(item.quantity) || 0));
    for (const body of [{ stock: next, is_available: next > 0 }, { stock: next }]) {
      if (await supabaseRequest(`products?id=eq.${item.id}`, { method: 'PATCH', body: JSON.stringify(body) })) break;
    }
  }
}

async function handleSendOrder(payload) {
  const text = payload?.text ? String(payload.text).trim() : '';
  const contactMethod = payload?.contact_method ? String(payload.contact_method) : '';
  const telegramUsername = payload?.telegram_username
    ? String(payload.telegram_username).replace('@', '').trim()
    : '';
  const order = payload?.order || null;

  if (!text) return { status: 400, body: { error: 'Missing text' } };

  await tgRequest('sendMessage', { chat_id: ADMIN_CHAT_ID, text });

  let clientNotified = false;
  if (contactMethod === 'telegram' && telegramUsername) {
    const clientChatId = await findChatIdByUsername(telegramUsername);
    if (clientChatId) {
      await tgRequest('sendMessage', {
        chat_id: clientChatId,
        text: `🙏 Спасибо за заказ в Beijing Puff Market!\n\nВот ваш чек:\n\n${text}`,
      });
      clientNotified = true;
    }
  }

  if (order) {
    await trySaveOrder(order).catch(() => {});
    await decrementStock(order.items).catch(() => {});
  }

  return {
    status: 200,
    body: {
      success: true,
      clientNotified,
      hint: contactMethod === 'telegram' && !clientNotified
        ? 'Admin notified. Client: /start in bot first.'
        : null,
    },
  };
}

function isBotCommand(text, command) {
  const token = String(text || '').trim().split(/\s+/)[0].toLowerCase();
  return token === command || token.startsWith(`${command}@`);
}

async function handleBotWebhook(update) {
  const message = update?.message;
  if (!message?.from) return { status: 200, body: { ok: true } };

  try {
    const user = message.from;
    const username = user.username ? user.username.toLowerCase() : null;

    await supabaseRequest('bot_users', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        chat_id: message.chat.id,
        username,
        first_name: user.first_name || null,
        updated_at: new Date().toISOString(),
      }),
    }).catch(() => {});

    const chatId = message.chat.id;
    const name = user.first_name || 'друг';
    const text = (message.text || '').trim();

    if (isBotCommand(text, '/start')) {
      await tgRequest('sendMessage', {
        chat_id: chatId,
        text:
          `Привет, ${name}! 👋\n\nВы зарегистрированы в Beijing Puff Market.\n\n` +
          `1. Откройте сайт магазина\n2. Добавьте товары\n` +
          `3. Укажите @username: @${user.username || 'ваш_username'}\n4. Оформите заказ`,
      });
    } else if (isBotCommand(text, '/help')) {
      await tgRequest('sendMessage', { chat_id: chatId, text: 'Сначала /start, затем заказ на сайте.' });
    } else if (text.startsWith('/')) {
      await tgRequest('sendMessage', { chat_id: chatId, text: 'Для заказа используйте сайт. /start — регистрация.' });
    }
  } catch (err) {
    console.error('handleBotWebhook error:', err.message);
  }

  return { status: 200, body: { ok: true } };
}

module.exports = { handleSendOrder, handleBotWebhook };
