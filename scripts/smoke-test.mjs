const SUPABASE_URL = 'https://xtuzjkavnzxfqlyxfvas.supabase.co';
const KEY = 'sb_publishable_du2PviAhyWt6Gx0iWgKMqw_UUC1BZiH';
const SB = `${SUPABASE_URL}/rest/v1`;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function sb(path, opts = {}) {
  const res = await fetch(`${SB}/${path}`, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  console.log('=== Products ===');
  for (const q of ['products?select=id,stock,is_available&limit=5', 'products?select=id,name_ru&limit=3']) {
    const r = await sb(q);
    console.log(q, r.status, r.ok ? JSON.stringify(r.data).slice(0, 200) : r.data);
  }

  console.log('\n=== Order insert (minimal) ===');
  for (const row of [
    {
      items: [{ name: 'smoke-test', quantity: 1, price: 1, total: 1 }],
      wechat_alipay_id: 'smoke_test',
      delivery_address: 'test address',
    },
  ]) {
    const ins = await sb('orders', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    console.log('insert', ins.status, ins.ok ? 'OK' : JSON.stringify(ins.data));
  }

  console.log('\n=== Order insert (app payload) ===');
  const appRow = {
    items: [
      { id: 167, name: 'WAKA test', quantity: 1, price: 100 },
      {
        _order_meta: {
          message_text: 'smoke test order',
          deliveryMethod: 'beijing',
          address: 'Test addr 123',
          client: 'Smoke',
          contact: 'smoke_user',
          contact_type: 'wechat',
          total: 100,
        },
      },
    ],
    wechat_alipay_id: 'smoke_user',
    delivery_address: 'Test addr 123',
  };
  const appIns = await sb('orders', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(appRow),
  });
  console.log('app payload insert', appIns.status, appIns.ok ? 'OK' : JSON.stringify(appIns.data));

  for (const url of ['https://beijing-puffmarket.pages.dev/sendorder', 'https://beijing-puffmarket.pages.dev/.netlify/functions/sendorder']) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'smoke' }) });
      console.log(url, r.status);
    } catch (e) {
      console.log(url, 'ERR', e.message);
    }
  }

  console.log('\n=== Live app.js checks ===');
  for (const url of ['https://beijing-puffmarket.pages.dev/app.js', 'https://beijing-puffmarket.pages.dev/app.js?v=3']) {
    const r = await fetch(url);
    const js = await r.text();
    console.log(url, r.status, 'flavor-btn:', js.includes('flavor-btn'), 'select:', js.includes('variant-select'));
  }
}

main().catch(console.error);
