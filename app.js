let cart = [];

async function placeOrder(event) {
  event.preventDefault();
  
  if (cart.length === 0) {
    alert('Ваша корзина пуста');
    return;
  }

  const contactType = document.getElementById('contact-type').value;
  const tgUsername = document.getElementById('tg-username').value.trim().replace('@', '');
  const wechatId = document.getElementById('wechat-id').value.trim();
  
  // Исправлено: теперь тут корректные названия переменных
  const clientContact = contactType === 'telegram' ? '@' + tgUsername : 'WeChat: ' + wechatId;

  if ((contactType === 'telegram' && !tgUsername) || (contactType === 'wechat' && !wechatId)) {
    alert('Пожалуйста, введите ваши контактные данные');
    return;
  }

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  let orderText = "НОВЫЙ ЗАКАЗ С САЙТА!\n\n";
  orderText += "Клиент: " + clientContact + "\n\n";
  orderText += "Выбранные позиции:\n";
  cart.forEach(item => {
    orderText += "• " + item.displayName + " (" + item.displayFlavor + ") - " + item.quantity + " шт.\n";
  });
  orderText += "\nИТОГО к оплате: " + totalPrice + " ¥";

  try {
    const btn = event.submitter;
    const originalText = btn.innerText;
    btn.innerText = 'Отправка...';
    
    const response = await fetch('/.netlify/functions/sendorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: '8940120225', 
        text: orderText
      })
    });

    if (response.ok) {
      alert('Заказ успешно отправлен!');
      cart = [];
      if (typeof updateCartUI === 'function') updateCartUI();
      if (typeof toggleCart === 'function') toggleCart();
    } else {
      throw new Error('Ошибка сервера');
    }
    btn.innerText = originalText;
  } catch (err) {
    console.error(err);
    alert('Ошибка при отправке: ' + err.message);
  }
}

// Привязка события (убедись, что форма имеет id="order-form")
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('order-form');
  if (form) form.addEventListener('submit', placeOrder);
});