const SUPABASE_URL = 'https://xtuzjkavnzxfqlyxfvas.supabase.co';
const SUPABASE_KEY = 'sb_publishable_du2PviAhyWt6Gx0iWgKMqw_UUC1BZiH';
const PUZZLE_BOT_API_KEY = '8940120225:AAHONShsV1iwDRYIiqciNovNQoB4OyvFqhQ'; 
const MY_PERSONAL_TG_ID = '1625251103';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
let cart = [];

// === НАСТРОЙКИ ТОВАРОВ (ЦЕНЫ И КАРТИНКИ) ===
// Функция автоматически подбирает картинку из папки images/ в зависимости от названия
function getLocalImage(modelName) {
  const name = modelName.toUpperCase();
  if (name.includes('PAFOS')) return 'images/pafos-195.png';
  if (name.includes('35000')) return 'images/waka35000.png';
  if (name.includes('EXTRA')) return 'images/wakaextra.png';
  if (name.includes('20000')) return 'images/waka-20000.png';
  return 'images/waka-20000.png'; // Картинка по умолчанию
}

// Функция автоматически назначает цену в зависимости от названия
function getLocalPrice(modelName, dbPrice) {
  if (dbPrice && dbPrice > 0) return dbPrice; // Если цена есть в базе, берем её
  
  const name = modelName.toUpperCase();
  if (name.includes('PAFOS')) return 195;
  if (name.includes('35000')) return 200; // Можешь поменять цену на нужную
  if (name.includes('EXTRA')) return 160; // Можешь поменять цену на нужную
  if (name.includes('20000')) return 155;
  return 155; // Цена по умолчанию
}

// Загрузка товаров из базы
async function loadProducts() {
  const { data, error } = await supabaseClient.from('products').select('*');
  if (error) {
    console.error('Ошибка загрузки данных:', error);
    return;
  }
  
  // Обрабатываем базу и склеиваем её с нашими локальными фото/ценами
  products = data.map(p => {
    const fullTitle = p.name_ru || 'Товар - Без вкуса';
    // Разбиваем по дефису. Например "WAKA 20000 - Мята" -> "WAKA 20000" и "Мята"
    const parts = fullTitle.split('-'); 
    const modelName = parts[0] ? parts[0].trim() : 'Товар';
    const flavorName = parts[1] ? parts[1].trim() : 'Оригинальный';

    return {
      ...p,
      displayName: modelName,
      displayFlavor: flavorName,
      price: getLocalPrice(modelName, p.price),
      isAvailable: p.is_available !== false,
      imageUrl: getLocalImage(modelName)
    };
  });

  renderProducts();
}

// Группировка товаров по названию и вывод на экран
function renderProducts() {
  const container = document.getElementById('products-container');
  container.innerHTML = '';

  if (products.length === 0) {
    container.innerHTML = '<p class="text-cyber-muted text-center w-full">Товары загружаются...</p>';
    return;
  }

  // Группируем по бренду
  const grouped = {};
  products.forEach(p => {
    if (!grouped[p.displayName]) {
      grouped[p.displayName] = [];
    }
    grouped[p.displayName].push(p);
  });

  // Рисуем карточки
  Object.keys(grouped).forEach(modelName => {
    const variants = grouped[modelName];
    const firstVariant = variants[0]; // Берем картинку и цену от первого вкуса в группе

    let optionsHtml = '';
    variants.forEach(v => {
      const outOfStock = !v.isAvailable ? ' (Нет в наличии)' : '';
      optionsHtml += `<option value="${v.id}" ${!v.isAvailable ? 'disabled' : ''}>${v.displayFlavor}${outOfStock}</option>`;
    });

    const card = document.createElement('div');
    card.className = 'bg-cyber-panel border border-cyber-border rounded-lg p-5 flex flex-col justify-between hover:border-cyber-neon transition';
    card.innerHTML = `
      <div>
        <div class="h-48 bg-cyber-bg rounded mb-4 flex items-center justify-center border border-cyber-border overflow-hidden relative p-2">
          <img src="${firstVariant.imageUrl}" alt="${modelName}" class="object-contain h-full w-full drop-shadow-[0_0_15px_rgba(0,255,170,0.2)]">
        </div>
        <h3 class="text-xl font-display uppercase tracking-wide text-cyber-text mb-2">${modelName}</h3>
        
        <label class="block text-xs uppercase tracking-wider text-cyber-muted mb-1">Выбрать вкус:</label>
        <select id="select-${firstVariant.id}" class="w-full bg-cyber-bg border border-cyber-border p-2 rounded text-cyber-text mb-4 focus:outline-none focus:border-cyber-neon">
          ${optionsHtml}
        </select>
      </div>
      
      <div class="flex justify-between items-center mt-4 pt-4 border-t border-cyber-border">
        <span class="text-2xl font-bold text-cyber-neon">${firstVariant.price} ¥</span>
        <button onclick="addToCartFromCard('${firstVariant.id}')" class="bg-cyber-neon text-cyber-bg font-bold px-4 py-2 rounded text-sm uppercase tracking-wider hover:bg-white transition shadow-[0_0_10px_rgba(0,255,170,0.5)]">
          В корзину
        </button>
      </div>`;
    
    container.appendChild(card);
  });
}

function addToCartFromCard(baseId) {
  const selectElement = document.getElementById(`select-${baseId}`);
  const selectedId = selectElement.value; 
  const product = products.find(p => p.id == selectedId);

  if (!product || !product.isAvailable) {
    alert('Этого вкуса нет в наличии.');
    return;
  }

  const cartItem = cart.find(item => item.id === product.id);
  if (cartItem) {
    cartItem.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  updateCartUI();
  // Анимация добавления
  const btn = event.currentTarget;
  const originalText = btn.innerText;
  btn.innerText = 'Добавлено!';
  btn.classList.add('bg-white');
  setTimeout(() => {
    btn.innerText = originalText;
    btn.classList.remove('bg-white');
  }, 1000);
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
        <button onclick="changeQty('${item.id}', -1)" class="bg-cyber-panel px-3 py-1 rounded text-cyber-text hover:text-cyber-magenta border border-cyber-border">-</button>
        <span class="font-bold text-cyber-text w-4 text-center">${item.quantity}</span>
        <button onclick="changeQty('${item.id}', 1)" class="bg-cyber-panel px-3 py-1 rounded text-cyber-text hover:text-cyber-neon border border-cyber-border">+</button>
      </div>
    `;
    itemsContainer.appendChild(row);
  });
  
  document.getElementById('cart-total').innerText = total;
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id == id);
  if (!item) return;
  
  item.quantity += delta;
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

  const clientContact = contactType === 'telegram' ? '@' + tgUsername : 'WeChat: ' + wechatId;

  if (contactType === 'telegram' && !tgUsername) {
    alert('Пожалуйста, введите ваш Telegram username');
    return;
  }
  if (contactType === 'wechat' && !wechatId) {
    alert('Пожалуйста, введите ваш WeChat ID');
    return;
  }

  // Проверка актуальности товара в базе
  for (const item of cart) {
    const { data: product, error } = await supabaseClient
      .from('products')
      .select('is_available')
      .eq('id', item.id)
      .single();

    if (error || !product || product.is_available === false) {
      alert(`Извините, товар со вкусом "${item.displayFlavor}" уже раскупили.`);
      return;
    }
  }

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Описание для базы
  let dbItemsSummary = '';
  cart.forEach(item => {
    dbItemsSummary += `[${item.displayName} - ${item.displayFlavor} x${item.quantity}] `;
  });

  // Запись заказа в базу
  const { error: dbError } = await supabaseClient.from('orders').insert([{ 
    client_name: contactType === 'telegram' ? tgUsername : 'WeChat User', 
    wechat_alipay_id: contactType === 'wechat' ? wechatId : 'TG: ' + tgUsername, 
    delivery_address: 'Заказ: ' + dbItemsSummary,
    total_price: totalPrice
  }]);

  if (dbError) console.error("Ошибка сохранения в базу:", dbError);

  // Сообщение для Telegram бота
  let orderText = `🛍️ **НОВЫЙ ЗАКАЗ С САЙТА!**\n\n`;
  orderText += `👤 **Клиент:** ${clientContact}\n\n`;
  orderText += `📦 **Выбранные позиции:**\n`;
  cart.forEach(item => {
    orderText += `• ${item.displayName} (Вкус: ${item.displayFlavor}) — ${item.quantity} шт. (${item.price * item.quantity} ¥)\n`;
  });
  orderText += `\n💰 **Итого к оплате:** ${totalPrice} ¥\n`;

  try {
    const originalBtnText = event.submitter.innerText;
    event.submitter.innerText = 'Отправка...';
    
    await fetch(`https://api.puzzlebot.top/api/v1/telegram/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PUZZLE_BOT_API_KEY}` },
      body: JSON.stringify({
        chat_id: MY_PERSONAL_TG_ID,
        text: orderText,
        parse_mode: 'Markdown'
      })
    });

    alert('Заказ успешно отправлен! Мы свяжемся с вами в ближайшее время.');
    cart = [];
    updateCartUI();
    toggleCart();
    loadProducts(); 
    event.submitter.innerText = originalBtnText;
  } catch (err) {
    console.error(err);
    alert('Ошибка при отправке уведомления, но заказ зафиксирован.');
  }
}

loadProducts();