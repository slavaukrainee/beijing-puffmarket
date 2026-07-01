const SUPABASE_URL = 'https://xtuzjkavnzxfqlyxfvas.supabase.co';
const SUPABASE_KEY = 'sb_publishable_du2PviAhyWt6Gx0iWgKMqw_UUC1BZiH';
const PUZZLE_BOT_API_KEY = '8940120225:AAHONShsV1iwDRYIiqciNovNQoB4OyvFqhQ'; 
const MY_PERSONAL_TG_ID = '1625251103';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
let cart = [];

// Загрузка товаров из базы
async function loadProducts() {
  const { data, error } = await supabaseClient.from('products').select('*');
  if (error) {
    console.error('Ошибка загрузки данных:', error);
    return;
  }
  
  // Автоматически разделяем "Бренд - Вкус" из твоей базы данных
  products = data.map(p => {
    const fullTitle = p.title || p.name || 'Товар - Без вкуса';
    const parts = fullTitle.split(' - ');
    return {
      ...p,
      displayName: parts[0] ? parts[0].trim() : 'Товар',
      displayFlavor: parts[1] ? parts[1].trim() : 'Оригинальный'
    };
  });

  renderProducts();
}

// Группировка товаров по названию и вывод на экран
function renderProducts() {
  const container = document.getElementById('products-container');
  container.innerHTML = '';

  const grouped = {};
  products.forEach(p => {
    if (!grouped[p.displayName]) {
      grouped[p.displayName] = [];
    }
    grouped[p.displayName].push(p);
  });

  Object.keys(grouped).forEach(modelName => {
    const variants = grouped[modelName];
    const firstVariant = variants[0];

    let optionsHtml = '';
    variants.forEach(v => {
      const outOfStock = v.stock <= 0 ? ' (Нет в наличии)' : '';
      optionsHtml += `<option value="${v.id}" ${v.stock <= 0 ? 'disabled' : ''}>${v.displayFlavor}${outOfStock}</option>`;
    });

    const card = document.createElement('div');
    card.className = 'bg-cyber-panel border border-cyber-border rounded-lg p-5 flex flex-col justify-between hover:border-cyber-neon transition';
    card.innerHTML = `
      <div>
        <div class="h-48 bg-cyber-bg rounded mb-4 flex items-center justify-center border border-cyber-border overflow-hidden relative">
          <img src="${firstVariant.image_url || 'https://via.placeholder.com/150'}" alt="${modelName}" class="object-contain max-h-full">
        </div>
        <h3 class="text-xl font-display uppercase tracking-wide text-cyber-text mb-2">${modelName}</h3>
        
        <label class="block text-xs uppercase tracking-wider text-cyber-muted mb-1">Выбрать вкус:</label>
        <select id="select-${firstVariant.id}" class="w-full bg-cyber-bg border border-cyber-border p-2 rounded text-cyber-text mb-4 focus:outline-none focus:border-cyber-neon" onchange="updateCardPrice('${firstVariant.id}', this)">
          ${optionsHtml}
        </select>
      </div>
      
      <div class="flex justify-between items-center mt-4">
        <span class="text-2xl font-bold text-cyber-neon" id="price-${firstVariant.id}">${firstVariant.price} ¥</span>
        <button onclick="addToCartFromCard('${firstVariant.id}')" class="cyber-btn px-4 py-2 rounded text-sm uppercase tracking-wider">
          В корзину
        </button>
      </div>`;
    
    container.appendChild(card);
    updateCardPrice(firstVariant.id, { value: firstVariant.id });
  });
}

function updateCardPrice(baseId, selectElement) {
  const selectedId = selectElement.value;
  const product = products.find(p => p.id == selectedId);
  if (product) {
    document.getElementById(`price-${baseId}`).innerText = `${product.price} ¥`;
  }
}

function addToCartFromCard(baseId) {
  const selectElement = document.getElementById(`select-${baseId}`);
  const selectedId = selectElement.value; 
  const product = products.find(p => p.id == selectedId);

  if (!product || product.stock <= 0) {
    alert('Этого вкуса нет в наличии.');
    return;
  }

  const cartItem = cart.find(item => item.id === product.id);
  if (cartItem) {
    if (cartItem.quantity >= product.stock) {
      alert(`Нельзя добавить больше. На складе всего: ${product.stock} шт.`);
      return;
    }
    cartItem.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  updateCartUI();
}

function toggleContactFields() {
  const type = document.getElementById('contact-type').value;
  document.getElementById('tg-field').classList.toggle('hidden', type !== 'telegram');
  document.getElementById('wechat-field').classList.toggle('hidden', type !== 'wechat');
}

function updateCartUI() {
  document.getElementById('cart-count').innerText = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  const itemsContainer = document.getElementById('cart-items');
  itemsContainer.innerHTML = '';
  
  let total = 0;
  cart.forEach(item => {
    total += item.price * item.quantity;
    const row = document.createElement('div');
    row.className = 'flex justify-between items-center bg-cyber-bg p-3 rounded border border-cyber-border';
    row.innerHTML = `
      <div>
        <div class="font-bold text-cyber-text">${item.displayName}</div>
        <div class="text-xs text-cyber-neon">Вкус: ${item.displayFlavor}</div>
        <div class="text-xs text-cyber-muted">${item.price} ¥ × ${item.quantity} шт.</div>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="changeQty('${item.id}', -1)" class="bg-cyber-panel px-2 py-1 rounded text-cyber-text hover:text-cyber-magenta">-</button>
        <span class="font-bold text-cyber-text">${item.quantity}</span>
        <button onclick="changeQty('${item.id}', 1)" class="bg-cyber-panel px-2 py-1 rounded text-cyber-text hover:text-cyber-neon">+</button>
      </div>
    `;
    itemsContainer.appendChild(row);
  });
  
  document.getElementById('cart-total').innerText = total;
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id == id);
  if (!item) return;
  
  const product = products.find(p => p.id == id);
  
  item.quantity += delta;
  if (item.quantity > product.stock) {
    alert(`На складе доступно только ${product.stock} шт.`);
    item.quantity = product.stock;
  }
  
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.id != id);
  }
  updateCartUI();
}

function toggleCart() {
  document.getElementById('cart-modal').classList.toggle('hidden');
}

async function placeOrder(event) {
  event.preventDefault();
  
  if (cart.length === 0) {
    alert('Ваша корзина пуста');
    return;
  }

  const contactType = document.getElementById('contact-type').value;
  const tgUsername = document.getElementById('tg-username').value.trim().replace('@', '');
  const wechatId = document.getElementById('wechat-id').value.trim();

  const clientContact = contactType === 'telegram' ? '@' + tgUsername : 'WeChat ID: ' + wechatId;

  if (contactType === 'telegram' && !tgUsername) {
    alert('Пожалуйста, введите ваш Telegram username');
    return;
  }
  if (contactType === 'wechat' && !wechatId) {
    alert('Пожалуйста, введите ваш WeChat ID');
    return;
  }

  for (const item of cart) {
    const { data: product, error } = await supabaseClient
      .from('products')
      .select('stock')
      .eq('id', item.id)
      .single();

    if (error || !product) {
      alert(`Ошибка при верификации товара`);
      return;
    }

    if (product.stock < item.quantity) {
      alert(`Ошибка! Товар со вкусом "${item.displayFlavor}" раскупили. Доступно: ${product.stock} шт.`);
      return;
    }
  }

  for (const item of cart) {
    const { data: product } = await supabaseClient.from('products').select('stock').eq('id', item.id).single();
    await supabaseClient.from('products').update({ stock: product.stock - item.quantity }).eq('id', item.id);
  }

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  await supabaseClient.from('orders').insert([{ 
    items: cart, 
    total: totalPrice, 
    contact: contactType === 'telegram' ? tgUsername : wechatId,
    contact_type: contactType
  }]);

  let orderText = `🛍️ **НОВЫЙ ЗАКАЗ С САЙТА!**\n\n`;
  orderText += `👤 **Клиент:** ${clientContact}\n\n`;
  orderText += `📦 **Выбранные позиции:**\n`;
  cart.forEach(item => {
    orderText += `• ${item.displayName} (Вкус: ${item.displayFlavor}) — ${item.quantity} шт. (${item.price * item.quantity} ¥)\n`;
  });
  orderText += `\n💰 **Итого к оплате:** ${totalPrice} ¥\n`;

  try {
    await fetch(`https://api.puzzlebot.top/api/v1/telegram/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PUZZLE_BOT_API_KEY}` },
      body: JSON.stringify({
        chat_id: MY_PERSONAL_TG_ID,
        text: orderText,
        parse_mode: 'Markdown'
      })
    });

    if (contactType === 'telegram') {
      let clientText = `🙏 **Спасибо за заказ in Beijing Puff Market!**\n\nВот ваш электронный чек:\n\n` + orderText;
      await fetch(`https://api.puzzlebot.top/api/v1/telegram/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PUZZLE_BOT_API_KEY}` },
        body: JSON.stringify({
          username: tgUsername,
          text: clientText,
          parse_mode: 'Markdown'
        })
      });
    }

    alert('Заказ успешно отправлен!');
    cart = [];
    updateCartUI();
    toggleCart();
    loadProducts(); 
  } catch (err) {
    console.error(err);
    alert('Заказ оформлен, но возникла ошибка при отправке сообщения в бот.');
  }
}

loadProducts();