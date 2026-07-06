function createSupabaseClient(url, key) {
  const headers = (prefer) => ({
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: prefer || 'return=representation',
  });
  function from(table) {
    const q = { table, filters: [], orders: [], limitN: null, method: 'GET', body: null };
    const api = {
      select() { return api; },
      order(col, opts = {}) {
        q.orders.push(`${col}.${opts.ascending === false ? 'desc' : 'asc'}`);
        return api;
      },
      eq(col, val) {
        q.filters.push(`${col}=eq.${encodeURIComponent(val)}`);
        return api;
      },
      insert(row) { q.method = 'POST'; q.body = row; return api; },
      update(row) { q.method = 'PATCH'; q.body = row; return api; },
      then(resolve, reject) {
        const params = [...q.filters];
        if (q.orders.length) params.push(`order=${q.orders.join(',')}`);
        if (q.limitN != null) params.push(`limit=${q.limitN}`);
        const query = params.length ? `?${params.join('&')}` : '';
        fetch(`${url}/rest/v1/${q.table}${query}`, {
          method: q.method,
          headers: headers(q.method === 'GET' ? 'return=representation' : 'return=minimal'),
          body: q.body != null ? JSON.stringify(q.body) : undefined,
        }).then(async (res) => {
          const text = await res.text();
          let data = null;
          if (text) { try { data = JSON.parse(text); } catch { data = text; } }
          if (!res.ok) {
            resolve({ data: null, error: { message: typeof data === 'object' && data?.message ? data.message : text } });
            return;
          }
          resolve({ data: q.method === 'GET' ? (Array.isArray(data) ? data : []) : data, error: null });
        }).catch(reject);
      },
    };
    return api;
  }
  return { from };
}

const SUPABASE_URL = 'https://xtuzjkavnzxfqlyxfvas.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_du2PviAhyWt6Gx0iWgKMqw_UUC1BZiH';
const STOCK_PASSWORD = '97989990';

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let products = [];
let filtered = [];

function show(el) { el.classList.remove('hidden-view'); }
function hide(el) { el.classList.add('hidden-view'); }

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function splitName(product) {
  const ru = product.name_ru || product.name || product.name_en || '';
  const parts = String(ru).split(/\s[-–—]\s/);
  if (parts.length > 1) {
    return { model: parts[0].trim(), flavor: parts.slice(1).join(' - ').trim() };
  }
  if (product.flavor) return { model: String(ru).trim(), flavor: product.flavor };
  return { model: String(ru).trim(), flavor: '—' };
}

function currentStock(product) {
  if (product.stock !== null && product.stock !== undefined) {
    return Math.max(0, Number(product.stock) || 0);
  }
  return product.is_available === false ? 0 : 0;
}

function groupProducts(list) {
  const groups = new Map();
  list.forEach((product) => {
    const { model } = splitName(product);
    const key = `${model}|${product.price}`;
    if (!groups.has(key)) groups.set(key, { model, price: product.price, items: [] });
    groups.get(key).items.push(product);
  });
  return Array.from(groups.values()).sort((a, b) => a.model.localeCompare(b.model, 'ru'));
}

async function loadProducts() {
  show(document.getElementById('stock-loading'));
  hide(document.getElementById('stock-error'));
  hide(document.getElementById('stock-groups'));

  const { data, error } = await supabase.from('products').select('*').order('id');

  hide(document.getElementById('stock-loading'));

  if (error) {
    document.getElementById('stock-error').textContent = `Ошибка: ${error.message}`;
    show(document.getElementById('stock-error'));
    return;
  }

  products = data || [];
  applyFilter();
}

function applyFilter() {
  const q = document.getElementById('search-input').value.trim().toLowerCase();
  filtered = products.filter((p) => {
    if (!q) return true;
    const { model, flavor } = splitName(p);
    return model.toLowerCase().includes(q) || flavor.toLowerCase().includes(q);
  });
  renderStock();
}

function showStatus(msg, isError) {
  const el = document.getElementById('save-status');
  el.textContent = msg;
  el.className = `fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-sm border ${
    isError ? 'bg-red-900/80 border-red-500 text-red-200' : 'bg-cyber-panel border-cyber-neon text-cyber-neon'
  }`;
  show(el);
  setTimeout(() => hide(el), 2500);
}

async function saveStock(productId, value) {
  const stock = Math.max(0, Number(value) || 0);
  const is_available = stock > 0;

  const attempts = [
    { stock, is_available },
    { stock },
    { is_available },
  ];

  for (const payload of attempts) {
    const { error } = await supabase.from('products').update(payload).eq('id', productId);
    if (!error) {
      const p = products.find((x) => x.id === productId);
      if (p) {
        p.stock = stock;
        p.is_available = is_available;
      }
      showStatus('Сохранено ✓');
      return true;
    }
    if (!(error.message || '').includes('column')) break;
  }

  showStatus('Ошибка сохранения', true);
  return false;
}

function renderStock() {
  const container = document.getElementById('stock-groups');
  const groups = groupProducts(filtered);

  if (!groups.length) {
    container.innerHTML = '<p class="text-center text-cyber-muted py-8">Товары не найдены</p>';
    show(container);
    return;
  }

  container.innerHTML = groups.map((group) => {
    const rows = group.items.map((product) => {
      const { flavor } = splitName(product);
      const stock = currentStock(product);
      const rowClass = stock <= 0 ? 'opacity-50 bg-cyber-bg/40' : '';

      return `
        <tr class="border-b border-cyber-border/40 ${rowClass}" data-id="${product.id}">
          <td class="py-3 pr-3 text-sm pl-4">${escapeHtml(flavor)}</td>
          <td class="py-3 pr-3 text-cyber-muted text-sm">¥${product.price}</td>
          <td class="py-3 pr-3">
            <div class="flex items-center gap-2">
              <button type="button" class="stock-minus w-8 h-8 border border-cyber-border rounded hover:border-cyber-neon" data-id="${product.id}">−</button>
              <input type="number" min="0" step="1" value="${stock}"
                class="stock-input w-16 text-center bg-cyber-bg border border-cyber-border rounded py-1.5 text-sm"
                data-id="${product.id}">
              <button type="button" class="stock-plus w-8 h-8 border border-cyber-border rounded hover:border-cyber-neon" data-id="${product.id}">+</button>
            </div>
          </td>
          <td class="py-3 pr-4 text-right">
            <button type="button" class="save-btn px-3 py-1.5 text-xs border border-cyber-neon text-cyber-neon rounded hover:bg-cyber-neon hover:text-cyber-bg" data-id="${product.id}">
              Сохранить
            </button>
          </td>
        </tr>`;
    }).join('');

    return `
      <section class="bg-cyber-panel border border-cyber-border rounded-lg overflow-hidden">
        <div class="px-4 py-3 border-b border-cyber-border flex justify-between items-center">
          <h3 class="font-display text-cyber-neon text-sm">${escapeHtml(group.model)}</h3>
          <span class="text-cyber-muted text-sm">¥${group.price}</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="text-xs text-cyber-muted border-b border-cyber-border/60">
                <th class="py-2 pl-4">Вкус</th>
                <th class="py-2">Цена</th>
                <th class="py-2">Остаток</th>
                <th class="py-2 pr-4 text-right"> </th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`;
  }).join('');

  show(container);

  container.querySelectorAll('.stock-minus').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = container.querySelector(`.stock-input[data-id="${btn.dataset.id}"]`);
      input.value = Math.max(0, Number(input.value) - 1);
    });
  });

  container.querySelectorAll('.stock-plus').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = container.querySelector(`.stock-input[data-id="${btn.dataset.id}"]`);
      input.value = Number(input.value) + 1;
    });
  });

  container.querySelectorAll('.save-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const input = container.querySelector(`.stock-input[data-id="${btn.dataset.id}"]`);
      btn.disabled = true;
      await saveStock(Number(btn.dataset.id), input.value);
      btn.disabled = false;
      applyFilter();
    });
  });
}

function login() {
  const password = document.getElementById('login-password').value;
  if (password !== STOCK_PASSWORD) {
    show(document.getElementById('login-error'));
    return;
  }
  sessionStorage.setItem('stock_auth', '1');
  hide(document.getElementById('login-screen'));
  show(document.getElementById('stock-app'));
  loadProducts();
}

document.getElementById('login-btn').addEventListener('click', login);
document.getElementById('login-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});
document.getElementById('refresh-btn').addEventListener('click', loadProducts);
document.getElementById('search-input').addEventListener('input', applyFilter);

if (sessionStorage.getItem('stock_auth') === '1') {
  hide(document.getElementById('login-screen'));
  show(document.getElementById('stock-app'));
  loadProducts();
}
