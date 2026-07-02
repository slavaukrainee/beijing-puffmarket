let cart = [];

// Функция для отрисовки товаров (твоя логика ассортимента)
function renderProducts() {
    const container = document.getElementById('product-list');
    if (!container) return;
    // ... твой код отображения товаров ...
    console.log("Ассортимент загружен");
}

async function placeOrder(event) {
  event.preventDefault();
  
  if (cart.length === 0) {
    alert('Корзина пуста');
    return;
  }

  const orderText = "Новый заказ: " + cart.map(i => i.displayName).join(", ");

  try {
    const btn = event.submitter;
    btn.innerText = 'Отправка...';
    
    // Вызываем СВОЮ функцию, а не API бота
    const response = await fetch('/.netlify/functions/sendorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: '8940120225', 
        text: orderText
      })
    });

    if (response.ok) {
      alert('Успешно!');
      cart = [];
    } else {
      throw new Error('Ошибка сервера');
    }
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    const form = document.getElementById('order-form');
    if (form) form.addEventListener('submit', placeOrder);
});