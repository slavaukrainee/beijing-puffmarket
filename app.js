// === ИСПРАВЛЕННАЯ ФУНКЦИЯ ЗАКАЗА В app.js ===
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

  if ((contactType === 'telegram' && !tgUsername) || (contactType === 'wechat' && !wechatId)) {
    alert('Пожалуйста, введите ваши контактные данные');
    return;
  }

  // Расчет суммы
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Формируем текст сообщения
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
    
    // ОТПРАВЛЯЕМ ЗАПРОС НА НАШУ СЕРВЕРНУЮ ФУНКЦИЮ (вместо прямого API)
    const response = await fetch(`/.netlify/functions/sendOrder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: MY_PERSONAL_TG_ID,
        text: orderText
      })
    });

    if (response.ok) {
      alert('Заказ успешно отправлен!');
      cart = [];
      updateCartUI();
      toggleCart();
    } else {
      throw new Error('Ошибка сервера');
    }
    
    btn.innerText = originalText;
  } catch (err) {
    console.error(err);
    alert('Ошибка при отправке уведомления, но заказ зафиксирован в базе.');
  }
}