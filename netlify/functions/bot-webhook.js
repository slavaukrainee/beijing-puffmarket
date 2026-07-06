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

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8940120225:AAHONShsV1iwDRYIiqciNovNQoB4OyvFqhQ';
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xtuzjkavnzxfqlyxfvas.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_du2PviAhyWt6Gx0iWgKMqw_UUC1BZiH';
  const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

  async function tg(method, body) {
    const response = await fetch(`${API_BASE}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.description || method);
    return data.result;
  }

  async function saveUser(user) {
    if (!user || !user.id) return;
    const row = {
      chat_id: user.id,
      username: user.username ? user.username.toLowerCase() : null,
      first_name: user.first_name || null,
      updated_at: new Date().toISOString(),
    };

    await fetch(`${SUPABASE_URL}/rest/v1/bot_users`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(row),
    }).catch((err) => console.error('saveUser error:', err.message));
  }

  const message = update.message;
  if (!message || !message.from) {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  await saveUser(message.from);

  const text = (message.text || '').trim();
  const chatId = message.chat.id;
  const name = message.from.first_name || 'друг';

  try {
    if (text === '/start') {
      await tg('sendMessage', {
        chat_id: chatId,
        text:
          `Привет, ${name}! 👋\n\n` +
          `Вы зарегистрированы в Beijing Puff Market.\n\n` +
          `1. Откройте сайт: https://courageous-nougat-5a66cf.netlify.app/\n` +
          `2. Добавьте товары в корзину\n` +
          `3. Укажите Telegram @username: @${message.from.username || 'ваш_username'}\n` +
          `4. Оформите заказ — чек придёт сюда автоматически`,
      });
    } else if (text === '/help') {
      await tg('sendMessage', {
        chat_id: chatId,
        text: 'Сначала /start, затем заказ на сайте. Username в форме = ваш Telegram.',
      });
    } else {
      await tg('sendMessage', {
        chat_id: chatId,
        text: 'Для заказа используйте сайт. Если не регистрировались — отправьте /start',
      });
    }
  } catch (err) {
    console.error('bot-webhook error:', err);
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
