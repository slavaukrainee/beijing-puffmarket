const SUPABASE_URL = 'https://xtuzjkavnzxfqlyxfvas.supabase.co';
const KEY = 'sb_publishable_du2PviAhyWt6Gx0iWgKMqw_UUC1BZiH';
const SITE = 'https://beijing-puffmarket.pages.dev';
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
  console.log('=== Cloudflare site ===');
  for (const path of ['/', '/app.js', '/sendorder']) {
    try {
      const r = await fetch(`${SITE}${path}`, path === '/sendorder' ? { method: 'OPTIONS' } : {});
      const snippet = path === '/app.js' ? (await r.text()).slice(0, 0) : '';
      let extra = '';
      if (path === '/app.js') {
        const js = await fetch(`${SITE}/app.js`).then((x) => x.text());
        extra = ` flavor-btn=${js.includes('flavor-btn')} v7=${js.includes('app.js?v=7') || js.includes('STOCK_CACHE')}`;
      }
      console.log(path, r.status, extra);
    } catch (e) {
      console.log(path, 'ERR', e.message);
    }
  }

  console.log('\n=== Supabase products ===');
  const products = await sb('products?select=id,name_ru&limit=2');
  console.log(products.status, products.ok ? 'OK' : products.data);

  console.log('\n=== Order insert ===');
  const ins = await sb('orders', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      items: [{ name: 'cf-smoke', quantity: 1, price: 1 }],
      wechat_alipay_id: 'cf_test',
      delivery_address: 'Beijing test',
    }),
  });
  console.log('insert', ins.status, ins.ok ? 'OK' : ins.data);

  console.log('\n=== sendorder POST ===');
  try {
    const r = await fetch(`${SITE}/sendorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'smoke test from script' }),
    });
    console.log('sendorder', r.status, await r.text());
  } catch (e) {
    console.log('sendorder ERR', e.message);
  }
}

main().catch(console.error);
