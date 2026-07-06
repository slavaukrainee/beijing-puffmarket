/**
 * Free backend: Telegram bot polling + order notifications via GitHub Actions.
 */

import fs from 'fs';
import path from 'path';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const OFFSET_FILE = process.env.TELEGRAM_OFFSET_FILE || '.telegram-offset';

const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SB = `${SUPABASE_URL}/rest/v1`;

async function sb(path, options = {}) {
  const res = await fetch(`${SB}/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=minimal',
      ...(options.headers || {}),
    },
  });
  return res;
}

async function tg(method, body) {
  const res = await fetch(`${TG}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || method);
  return data.result;
}

function readOffset() {
  try {
    return Number(fs.readFileSync(OFFSET_FILE, 'utf8')) || 0;
  } catch {
    return 0;
  }
}

function writeOffset(value) {
  fs.writeFileSync(OFFSET_FILE, String(value));
}

async function pollTelegram() {
  await tg('deleteWebhook', {}).catch(() => {});

  const offset = readOffset();
  const updates = await tg('getUpdates', {
    offset: offset || undefined,
    timeout: 0,
    allowed_updates: ['message'],
  });

  if (!Array.isArray(updates) || !updates.length) return;

  let nextOffset = offset;

  for (const update of updates) {
    nextOffset = Math.max(nextOffset, update.update_id + 1);
    const msg = update.message;
    if (!msg?.from) continue;

    const user = msg.from;
    const username = user.username ? user.username.toLowerCase() : null;
    const text = (msg.text || '').trim();
    const chatId = msg.chat.id;
    const name = user.first_name || 'друг';

    await sb('bot_users', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        chat_id: user.id,
        username,
        first_name: user.first_name || null,
        updated_at: new Date().toISOString(),
      }),
    }).catch(() => {});

    if (text === '/start') {
      await tg('sendMessage', {
        chat_id: chatId,
        text:
          `Привет, ${name}! 👋\n\nВы зарегистрированы в Beijing Puff Market.\n\n` +
          `1. Откройте сайт магазина\n2. Добавьте товары\n` +
          `3. Укажите @username: @${user.username || 'ваш_username'}\n4. Оформите заказ`,
      });
    } else if (text === '/help') {
      await tg('sendMessage', { chat_id: chatId, text: 'Сначала /start, затем заказ на сайте.' });
    } else if (text.startsWith('/')) {
      await tg('sendMessage', { chat_id: chatId, text: 'Для заказа используйте сайт. /start — регистрация.' });
    }
  }

  if (nextOffset > offset) writeOffset(nextOffset);
}

async function findChatId(username) {
  const key = String(username || '').replace('@', '').trim().toLowerCase();
  if (!key) return null;
  const res = await sb(`bot_users?username=eq.${encodeURIComponent(key)}&select=chat_id&limit=1`);
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.chat_id ?? null;
}

async function decrementStock(items) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (!item.id) continue;
    const res = await sb(`products?id=eq.${item.id}&select=stock&limit=1`);
    if (!res.ok) continue;
    const rows = await res.json();
    if (!rows?.[0] || rows[0].stock == null) continue;
    const next = Math.max(0, Number(rows[0].stock) - (Number(item.quantity) || 0));
    await sb(`products?id=eq.${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ stock: next, is_available: next > 0 }),
    }).catch(() => sb(`products?id=eq.${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ stock: next }),
    }));
  }
}

function parseItems(order) {
  if (!order.items) return [];
  return typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
}

function buildOrderText(order) {
  const items = parseItems(order).filter((it) => !it._bot_user);
  const meta = parseItems(order).find((it) => it._order_meta)?._order_meta;
  if (meta?.message_text) return meta.message_text;

  const itemsText = items
    .map((it) => `• ${it.name} x${it.quantity} — ¥${(it.price || 0) * (it.quantity || 0)}`)
    .join('\n');
  return (
    `🆕 НОВЫЙ ЗАКАЗ #${order.id}\n\n` +
    `👤 Имя: ${order.client || '—'}\n` +
    `💬 Связь: ${order.contact || '—'}\n` +
    `📍 Адрес: ${order.address || '—'}\n\n` +
    `🛒 Товары:\n${itemsText}\n\n` +
    `💰 Итого: ¥${order.total || 0}`
  );
}

async function processOrders() {
  const res = await sb('orders?status=eq.new&select=*&order=id.asc&limit=20');
  if (!res.ok) {
    console.error('Failed to fetch orders:', await res.text());
    return;
  }

  const orders = await res.json();
  if (!Array.isArray(orders) || !orders.length) return;

  for (const order of orders) {
    const items = parseItems(order);
    if (items.length === 1 && items[0]._bot_user) continue;

    try {
      const text = buildOrderText(order);
      await tg('sendMessage', { chat_id: ADMIN_CHAT_ID, text });

      const contactType = order.contact_type || '';
      const contact = String(order.contact || '').replace('@', '').trim();
      if (contactType === 'telegram' && contact) {
        const chatId = await findChatId(contact);
        if (chatId) {
          await tg('sendMessage', {
            chat_id: chatId,
            text: `🙏 Спасибо за заказ в Beijing Puff Market!\n\nВот ваш чек:\n\n${text}`,
          });
        }
      }

      await decrementStock(items.filter((it) => !it._order_meta));

      await sb(`orders?id=eq.${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'processing' }),
      });
      console.log(`Order #${order.id} processed`);
    } catch (err) {
      console.error(`Order #${order.id} failed:`, err.message);
    }
  }
}

async function main() {
  if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
  }
  await pollTelegram();
  await processOrders();
  console.log('Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
