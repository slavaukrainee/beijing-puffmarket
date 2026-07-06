/* Beijing Puff Market — SPA Logic */

const SUPABASE_URL = 'https://xtuzjkavnzxfqlyxfvas.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_du2PviAhyWt6Gx0iWgKMqw_UUC1BZiH';
const ADMIN_PASSWORD = '1234';
const WAKA_20000_IMAGE = 'images/waka-20000.png';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const i18n = {
  ru: {
    brand: 'BEIJING PUFF',
    tagline: 'Cyber Vape · 北京',
    cart: 'Корзина',
    hero_title: 'ЭЛЕКТРОННЫЕ СИГАРЕТЫ',
    hero_sub: 'Доставка по Пекину · Оплата WeChat / Alipay',
    feat_fast: 'Быстро',
    feat_safe: 'Безопасно',
    feat_local: 'Пекин',
    loading: 'Загрузка товаров...',
    error_load: 'Ошибка загрузки. Проверьте подключение.',
    retry: 'Повторить',
    out_of_stock: 'Нет в наличии',
    choose_flavor: 'Выбрать вкус',
    add_to_cart: 'В корзину',
    success_title: 'Заказ принят!',
    success_msg: 'Мы свяжемся с вами через WeChat/Alipay',
    back_shop: 'Вернуться в магазин',
    cart_empty: 'Корзина пуста',
    total: 'Итого:',
    label_name: 'Имя',
    label_contact: 'WeChat / Alipay ID *',
    label_contact_method: 'Способ связи',
    label_delivery_method: 'Способ доставки',
    delivery_beijing: 'Пекин',
    delivery_other: 'Другие города',
    label_address: 'Адрес в Пекине *',
    label_address_other: 'Адрес доставки (остальной Китай) *',
    contact_placeholder_tg: '@username (как в боте)',
    contact_placeholder_wx: 'wxid_...',
    success_msg_tg: 'Чек отправлен в Telegram. Мы скоро свяжемся с вами!',
    place_order: 'Оформить заказ',
    admin_link: '·',
    admin_login: 'Вход в админку',
    admin_enter: 'Войти',
    cancel: 'Отмена',
    admin_wrong: 'Неверный пароль',
    admin_orders: 'Заказы',
    export_1c: 'Экспорт в 1С',
    col_client: 'Клиент',
    col_contact: 'Контакт',
    col_address: 'Адрес',
    col_total: 'Сумма',
    col_status: 'Статус',
    no_orders: 'Нет заказов',
    status_new: 'новый',
    status_processing: 'в обработке',
    order_error: 'Ошибка отправки заказа',
    order_sending: 'Отправка...',
    export_success: 'Экспорт завершён',
    export_error: 'Ошибка экспорта',
    qty: 'шт.',
    remove: 'Удалить',
    in_stock: 'В наличии',
    stock_left: 'Осталось',
  },
  en: {
    brand: 'BEIJING PUFF',
    tagline: 'Cyber Vape · Beijing',
    cart: 'Cart',
    hero_title: 'ELECTRONIC CIGARETTES',
    hero_sub: 'Delivery in Beijing · WeChat / Alipay payment',
    feat_fast: 'Fast',
    feat_safe: 'Secure',
    feat_local: 'Beijing',
    loading: 'Loading products...',
    error_load: 'Load error. Check connection.',
    retry: 'Retry',
    out_of_stock: 'Out of stock',
    choose_flavor: 'Choose flavor',
    add_to_cart: 'Add to cart',
    success_title: 'Order placed!',
    success_msg: 'We will contact you via WeChat/Alipay',
    back_shop: 'Back to shop',
    cart_empty: 'Cart is empty',
    total: 'Total:',
    label_name: 'Name',
    label_contact: 'WeChat / Alipay ID *',
    label_contact_method: 'Contact method',
    label_delivery_method: 'Delivery method',
    delivery_beijing: 'Beijing',
    delivery_other: 'Other cities',
    label_address: 'Beijing address *',
    label_address_other: 'Delivery address (rest of China) *',
    contact_placeholder_tg: '@username (same as in bot)',
    contact_placeholder_wx: 'wxid_...',
    success_msg_tg: 'Receipt sent to Telegram. We will contact you soon!',
    place_order: 'Place order',
    admin_link: '·',
    admin_login: 'Admin login',
    admin_enter: 'Enter',
    cancel: 'Cancel',
    admin_wrong: 'Wrong password',
    admin_orders: 'Orders',
    export_1c: 'Export to 1C',
    col_client: 'Client',
    col_contact: 'Contact',
    col_address: 'Address',
    col_total: 'Total',
    col_status: 'Status',
    no_orders: 'No orders',
    status_new: 'new',
    status_processing: 'processing',
    order_error: 'Order submission error',
    order_sending: 'Sending...',
    export_success: 'Export complete',
    export_error: 'Export error',
    qty: 'pcs',
    remove: 'Remove',
    in_stock: 'In stock',
    stock_left: 'Left',
  },
};

let lang = localStorage.getItem('lang') || 'ru';
let products = [];
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let adminOrders = [];
let contactMethod = 'telegram';
let deliveryMethod = 'beijing';

function t(key) {
  return i18n[lang][key] || key;
}

function productName(product) {
  return lang === 'ru' ? product.name_ru : product.name_en;
}

function formatPrice(price) {
  return `¥${Number(price).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}`;
}

function productStock(product) {
  if (product.stock !== null && product.stock !== undefined) {
    return Math.max(0, Number(product.stock) || 0);
  }
  return null;
}

function isInStock(product) {
  if (product.is_available === false) return false;
  const stock = productStock(product);
  if (stock === null) return true;
  return stock > 0;
}

function maxOrderQty(product) {
  const stock = productStock(product);
  if (stock === null) return 99;
  return stock;
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function setLang(newLang) {
  lang = newLang;
  localStorage.setItem('lang', newLang);
  document.documentElement.lang = newLang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (i18n[lang][key]) el.textContent = i18n[lang][key];
  });

  document.getElementById('lang-ru').classList.toggle('active', lang === 'ru');
  document.getElementById('lang-en').classList.toggle('active', lang === 'en');

  renderProducts();
  renderCart();
  if (adminOrders.length) renderAdminOrders();
}

function show(el) {
  el.classList.remove('hidden-view');
}

function hide(el) {
  el.classList.add('hidden-view');
}

async function loadProducts() {
  const loading = document.getElementById('loading');
  const errorMsg = document.getElementById('error-msg');
  const grid = document.getElementById('products-grid');

  show(loading);
  hide(errorMsg);
  hide(grid);

  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .order('id');

  hide(loading);

  if (error) {
    console.error('Products load error:', error);
    show(errorMsg);
    return;
  }

  products = data || [];
  show(grid);
  renderProducts();
}

function productImage(product) {
  if (Number(product.price) === 195) return 'images/pafos-195.png';
  if (Number(product.price) === 175) return 'images/wakaextra.png';
  if (Number(product.price) === 145) return 'images/waka35000.png';
  if (Number(product.price) === 155) return WAKA_20000_IMAGE;
  return product.image_url || null;
}

function splitProductName(product) {
  const fullName = lang === 'ru' ? product.name_ru : product.name_en;
  const ruName = product.name_ru || product.name || fullName;
  const parts = String(ruName || '').split(/\s[-–—]\s/);
  if (parts.length > 1) {
    const flavorParts = String(fullName || '').split(/\s[-–—]\s/);
    return {
      baseName: parts[0].trim(),
      flavor: flavorParts.length > 1 ? flavorParts.slice(1).join(' - ').trim() : parts.slice(1).join(' - ').trim(),
    };
  }
  if (product.flavor) {
    return { baseName: String(fullName || '').trim(), flavor: product.flavor };
  }
  return { baseName: String(fullName || '').trim(), flavor: lang === 'ru' ? 'Стандарт' : 'Standard' };
}

function groupProducts(list) {
  const groups = new Map();
  list.forEach((product) => {
    const ruName = product.name_ru || product.name || product.name_en || '';
    const parts = String(ruName).split(/\s[-–—]\s/);
    const baseName = parts.length > 1 ? parts[0].trim() : String(ruName).trim();
    const key = `${baseName}|${product.price}`;
    if (!groups.has(key)) {
      groups.set(key, { baseName, price: product.price, variants: [] });
    }
    groups.get(key).variants.push(product);
  });
  return Array.from(groups.values());
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  const groups = groupProducts(products);

  if (!groups.length) {
    grid.innerHTML = `<p class="col-span-full text-center text-cyber-muted py-8">${lang === 'ru' ? 'Товары не найдены' : 'No products found'}</p>`;
    return;
  }

  grid.innerHTML = groups.map((group, index) => {
    const cardId = `card-${index}`;
    const firstVariant = group.variants[0];
    const imageUrl = productImage(firstVariant);
    const imgHtml = imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(group.baseName)}" class="w-full h-40 object-contain rounded mb-3 p-2" loading="lazy">`
      : `<div class="w-full h-40 bg-cyber-bg border border-cyber-border rounded mb-3 flex items-center justify-center">
           <span class="text-4xl opacity-30">💨</span>
         </div>`;

    const options = group.variants.map((variant) => {
      const { flavor } = splitProductName(variant);
      const stock = productStock(variant);
      const available = isInStock(variant);
      const stockHint = stock !== null && available ? ` (${stock} ${t('qty')})` : '';
      const suffix = available ? stockHint : ` (${t('out_of_stock')})`;
      return `<option value="${variant.id}" ${available ? '' : 'disabled'}>${escapeHtml(flavor)}${suffix}</option>`;
    }).join('');

    const hasAvailable = group.variants.some((v) => isInStock(v));
    const allOut = !hasAvailable;

    return `
      <article class="product-card bg-cyber-panel border border-cyber-border rounded-lg p-4 neon-border ${allOut ? 'out-of-stock-card' : ''}" data-card="${cardId}">
        ${imgHtml}
        <h3 class="font-display font-bold text-sm sm:text-base mb-1 ${allOut ? 'text-cyber-muted' : 'text-cyber-neon'}">${escapeHtml(group.baseName)}</h3>
        ${allOut ? `<p class="text-xs text-cyber-muted mb-2">${t('out_of_stock')}</p>` : ''}
        <p class="font-display text-xl font-bold text-white mb-3">${formatPrice(group.price)}</p>
        <label class="block text-xs text-cyber-muted mb-1">${t('choose_flavor')}</label>
        <select id="variant-select-${cardId}" class="w-full bg-cyber-bg border border-cyber-border rounded px-3 py-2 text-sm mb-3">
          ${options}
        </select>
        ${hasAvailable
          ? `<button class="add-btn w-full py-2.5 border border-cyber-neon text-cyber-neon rounded font-semibold hover:bg-cyber-neon hover:text-cyber-bg transition-colors" data-card="${cardId}">
               ${t('add_to_cart')}
             </button>`
          : `<button disabled class="w-full py-2.5 border border-cyber-muted/30 text-cyber-muted rounded font-semibold cursor-not-allowed opacity-60">
               ${t('out_of_stock')}
             </button>`
        }
      </article>
    `;
  }).join('');

  grid.querySelectorAll('.add-btn').forEach((btn) => {
    btn.addEventListener('click', () => addToCartFromCard(btn.dataset.card));
  });
}

function addToCartFromCard(cardId) {
  const select = document.getElementById(`variant-select-${cardId}`);
  if (!select) return;
  addToCart(Number(select.value));
}

function addToCart(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product || !isInStock(product)) return;

  const limit = maxOrderQty(product);
  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    if (existing.quantity >= limit) return;
    existing.quantity += 1;
  } else {
    const { baseName, flavor } = splitProductName(product);
    cart.push({
      id: product.id,
      name_ru: product.name_ru,
      name_en: product.name_en,
      base_name: baseName,
      flavor,
      price: product.price,
      quantity: 1,
    });
  }

  saveCart();
  renderCart();
  openCart();
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== productId);
  saveCart();
  renderCart();
}

function updateQuantity(productId, delta) {
  const item = cart.find((i) => i.id === productId);
  if (!item) return;

  const product = products.find((p) => p.id === productId);
  const limit = product ? maxOrderQty(product) : 99;

  item.quantity += delta;
  if (item.quantity > limit) item.quantity = limit;
  if (item.quantity <= 0) {
    removeFromCart(productId);
  } else {
    saveCart();
    renderCart();
  }
}

function cartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function renderCart() {
  const countEl = document.getElementById('cart-count');
  const itemsEl = document.getElementById('cart-items');
  const emptyEl = document.getElementById('cart-empty');
  const footerEl = document.getElementById('cart-footer');
  const totalEl = document.getElementById('cart-total');

  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
  countEl.textContent = totalQty;

  if (!cart.length) {
    itemsEl.innerHTML = '';
    show(emptyEl);
    hide(footerEl);
    return;
  }

  hide(emptyEl);
  show(footerEl);

  itemsEl.innerHTML = cart.map((item) => {
    const name = item.base_name || (lang === 'ru' ? item.name_ru : item.name_en);
    const flavor = item.flavor || '';
    return `
      <div class="flex gap-3 bg-cyber-bg border border-cyber-border rounded p-3">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-cyber-neon truncate">${escapeHtml(name)}</p>
          ${flavor ? `<p class="text-xs text-cyber-muted truncate">${escapeHtml(flavor)}</p>` : ''}
          <p class="text-xs text-cyber-muted">${formatPrice(item.price)} × ${item.quantity}</p>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <button class="qty-btn w-7 h-7 border border-cyber-border rounded text-cyber-neon hover:bg-cyber-neon/10" data-id="${item.id}" data-delta="-1">−</button>
          <span class="w-6 text-center text-sm">${item.quantity}</span>
          <button class="qty-btn w-7 h-7 border border-cyber-border rounded text-cyber-neon hover:bg-cyber-neon/10" data-id="${item.id}" data-delta="1">+</button>
          <button class="remove-btn ml-1 text-red-400/70 hover:text-red-400 text-xs" data-id="${item.id}">✕</button>
        </div>
      </div>
    `;
  }).join('');

  totalEl.textContent = formatPrice(cartTotal());

  itemsEl.querySelectorAll('.qty-btn').forEach((btn) => {
    btn.addEventListener('click', () => updateQuantity(Number(btn.dataset.id), Number(btn.dataset.delta)));
  });
  itemsEl.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', () => removeFromCart(Number(btn.dataset.id)));
  });
}

function openCart() {
  document.getElementById('cart-overlay').classList.remove('hidden-view');
  document.getElementById('cart-panel').classList.remove('translate-x-full');
}

function closeCart() {
  document.getElementById('cart-overlay').classList.add('hidden-view');
  document.getElementById('cart-panel').classList.add('translate-x-full');
}

function setContactMethod(method) {
  contactMethod = method;
  document.querySelectorAll('.contact-method-btn').forEach((btn) => {
    const active = btn.dataset.method === method;
    btn.classList.toggle('bg-cyber-neon', active);
    btn.classList.toggle('text-cyber-bg', active);
    btn.classList.toggle('bg-cyber-bg', !active);
    btn.classList.toggle('text-cyber-muted', !active);
  });
  const contactInput = document.getElementById('order-contact');
  contactInput.placeholder = method === 'telegram' ? t('contact_placeholder_tg') : t('contact_placeholder_wx');
}

function setDeliveryMethod(method) {
  deliveryMethod = method;
  document.querySelectorAll('.delivery-method-btn').forEach((btn) => {
    const active = btn.dataset.method === method;
    btn.classList.toggle('bg-cyber-neon', active);
    btn.classList.toggle('text-cyber-bg', active);
    btn.classList.toggle('bg-cyber-bg', !active);
    btn.classList.toggle('text-cyber-muted', !active);
  });
  const addressLabel = document.getElementById('order-address-label');
  addressLabel.textContent = method === 'beijing' ? t('label_address') : t('label_address_other');
}

function showOrderError(message) {
  const el = document.getElementById('order-error');
  if (!el) return;
  if (!message) {
    el.textContent = '';
    hide(el);
    return;
  }
  el.textContent = message;
  show(el);
}

async function submitOrder(e) {
  e.preventDefault();

  if (!cart.length) return;

  const name = document.getElementById('order-name').value.trim();
  const contact = document.getElementById('order-contact').value.trim();
  const address = document.getElementById('order-address').value.trim();
  const submitBtn = document.getElementById('order-submit');

  if (!contact || !address) return;

  showOrderError('');

  const items = cart.map((item) => ({
    id: item.id,
    name: item.base_name
      ? `${item.base_name}${item.flavor ? ` — ${item.flavor}` : ''}`
      : (lang === 'ru' ? item.name_ru : item.name_en),
    quantity: item.quantity,
    price: item.price,
  }));

  const clientName = name || (lang === 'ru' ? 'Без имени' : 'Anonymous');
  const total = cartTotal();
  const contactLabel = contactMethod === 'telegram' ? 'Telegram' : 'WeChat';
  const deliveryLabel = deliveryMethod === 'beijing'
    ? (lang === 'ru' ? 'Доставка по Пекину' : 'Beijing delivery')
    : (lang === 'ru' ? 'Доставка по Китаю (СДЭК/почта)' : 'China delivery (SDEK/post)');

  const itemsText = items
    .map((it) => `• ${it.name} x${it.quantity} — ¥${it.price * it.quantity}`)
    .join('\n');

  const messageText =
    `🆕 НОВЫЙ ЗАКАЗ\n\n` +
    `👤 Имя: ${clientName}\n` +
    `💬 Связь (${contactLabel}): ${contactMethod === 'telegram' ? '@' + contact.replace('@', '') : contact}\n` +
    `🚚 Доставка: ${deliveryLabel}\n` +
    `📍 Адрес: ${address}\n\n` +
    `🛒 Товары:\n${itemsText}\n\n` +
    `💰 Итого: ¥${total}`;

  submitBtn.disabled = true;
  submitBtn.textContent = t('order_sending');

  try {
    const resp = await fetch('/.netlify/functions/sendorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: messageText,
        contact_method: contactMethod,
        telegram_username: contact.replace('@', ''),
        order: {
          items,
          total,
          contact,
          contactMethod,
          name: clientName,
          address,
          deliveryMethod,
        },
      }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      console.error('Order send failed:', data);
      showOrderError(t('order_error'));
      submitBtn.disabled = false;
      submitBtn.textContent = t('place_order');
      return;
    }

    if (contactMethod === 'telegram') {
      document.querySelector('#success-screen [data-i18n="success_msg"]').textContent = t('success_msg_tg');
    }
  } catch (err) {
    console.error('Order send error:', err);
    showOrderError(t('order_error'));
    submitBtn.disabled = false;
    submitBtn.textContent = t('place_order');
    return;
  }

  submitBtn.disabled = false;
  submitBtn.textContent = t('place_order');

  cart = [];
  saveCart();
  renderCart();
  closeCart();

  document.getElementById('order-form').reset();
  await loadProducts();
  hide(document.getElementById('products-grid'));
  hide(document.getElementById('loading'));
  show(document.getElementById('success-screen'));
}

function showShop() {
  hide(document.getElementById('success-screen'));
  show(document.getElementById('products-grid'));
}

function openAdminModal() {
  show(document.getElementById('admin-modal'));
  show(document.getElementById('admin-login'));
  hide(document.getElementById('admin-panel'));
  document.getElementById('admin-password').value = '';
  hide(document.getElementById('admin-login-error'));
}

function closeAdminModal() {
  hide(document.getElementById('admin-modal'));
}

async function adminLogin() {
  const password = document.getElementById('admin-password').value;
  if (password !== ADMIN_PASSWORD) {
    show(document.getElementById('admin-login-error'));
    return;
  }

  hide(document.getElementById('admin-login'));
  show(document.getElementById('admin-panel'));
  await loadAdminOrders();
}

async function loadAdminOrders() {
  const loading = document.getElementById('admin-loading');
  show(loading);

  const { data, error } = await supabaseClient
    .from('orders')
    .select('*')
    .order('id', { ascending: false });

  hide(loading);

  if (error) {
    console.error('Orders load error:', error);
    adminOrders = [];
  } else {
    adminOrders = data || [];
  }

  renderAdminOrders();
}

function renderAdminOrders() {
  const tbody = document.getElementById('admin-orders-body');
  const noOrders = document.getElementById('admin-no-orders');

  if (!adminOrders.length) {
    tbody.innerHTML = '';
    show(noOrders);
    return;
  }

  hide(noOrders);

  tbody.innerHTML = adminOrders.map((order) => {
    const statusLabel = order.status === 'processing' ? t('status_processing') : t('status_new');
    const statusClass = order.status === 'processing' ? 'text-yellow-400' : 'text-cyber-neon';

    return `
      <tr class="border-b border-cyber-border/50 hover:bg-cyber-bg/50">
        <td class="py-2 pr-2 text-cyber-muted">#${order.id}</td>
        <td class="py-2 pr-2">${escapeHtml(order.client || '—')}</td>
        <td class="py-2 pr-2 text-xs">${escapeHtml(order.contact || '—')}</td>
        <td class="py-2 pr-2 hidden sm:table-cell text-xs text-cyber-muted max-w-[120px] truncate">${escapeHtml(order.address || '—')}</td>
        <td class="py-2 pr-2 font-semibold text-cyber-neon">${formatPrice(order.total)}</td>
        <td class="py-2 ${statusClass} text-xs">${statusLabel}</td>
      </tr>
    `;
  }).join('');
}

async function exportTo1C() {
  const newOrders = adminOrders.filter((o) => o.status === 'new');

  if (!newOrders.length) {
    alert(lang === 'ru' ? 'Нет новых заказов для экспорта' : 'No new orders to export');
    return;
  }

  const exportData = newOrders.map((order) => ({
    id: order.id,
    client: order.client,
    contact: order.contact,
    address: order.address,
    total: order.total,
    items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
  }));

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'orders.json';
  a.click();
  URL.revokeObjectURL(url);

  const ids = newOrders.map((o) => o.id);
  const { error } = await supabaseClient
    .from('orders')
    .update({ status: 'processing' })
    .in('id', ids);

  if (error) {
    console.error('Status update error:', error);
    alert(t('export_error'));
    return;
  }

  alert(t('export_success'));
  await loadAdminOrders();
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initEventListeners() {
  document.getElementById('lang-ru').addEventListener('click', () => setLang('ru'));
  document.getElementById('lang-en').addEventListener('click', () => setLang('en'));

  document.getElementById('cart-toggle').addEventListener('click', openCart);
  document.getElementById('cart-close').addEventListener('click', closeCart);
  document.getElementById('cart-overlay').addEventListener('click', closeCart);

  document.getElementById('order-form').addEventListener('submit', submitOrder);
  document.getElementById('contact-method-telegram').addEventListener('click', () => setContactMethod('telegram'));
  document.getElementById('contact-method-wechat').addEventListener('click', () => setContactMethod('wechat'));
  document.getElementById('delivery-method-beijing').addEventListener('click', () => setDeliveryMethod('beijing'));
  document.getElementById('delivery-method-other').addEventListener('click', () => setDeliveryMethod('other'));
  document.getElementById('back-to-shop').addEventListener('click', showShop);
  document.getElementById('retry-btn').addEventListener('click', loadProducts);

  document.getElementById('admin-link').addEventListener('click', openAdminModal);
  document.getElementById('admin-cancel').addEventListener('click', closeAdminModal);
  document.getElementById('admin-backdrop').addEventListener('click', closeAdminModal);
  document.getElementById('admin-close').addEventListener('click', closeAdminModal);
  document.getElementById('admin-login-btn').addEventListener('click', adminLogin);
  document.getElementById('admin-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') adminLogin();
  });
  document.getElementById('export-1c').addEventListener('click', exportTo1C);
}

async function init() {
  initEventListeners();
  setLang(lang);
  setContactMethod(contactMethod);
  setDeliveryMethod(deliveryMethod);
  renderCart();
  await loadProducts();
}

init();
