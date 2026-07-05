// app.js
// Фронтенд-логика магазина: рендер товаров, корзина, оформление заказа.

/* ==============================
   БЕЗОПАСНЫЕ ЗАГЛУШКИ
   Если где-то в проекте эти функции будут случайно
   удалены/сломаны, сайт всё равно не "упадёт" в чёрный экран.
================================= */
if (typeof window.renderProducts !== "function") {
  window.renderProducts = function () {
    console.warn("renderProducts() не определена — используется заглушка.");
    const container = document.getElementById("products");
    if (container && !container.dataset.stubRendered) {
      container.innerHTML =
        "<p>Товары временно недоступны. Обновите страницу позже.</p>";
      container.dataset.stubRendered = "true";
    }
  };
}

if (typeof window.updateCartUI !== "function") {
  window.updateCartUI = function () {
    console.warn("updateCartUI() не определена — используется заглушка.");
    const counter = document.getElementById("cart-count");
    if (counter && Array.isArray(window.cart)) {
      counter.textContent = window.cart.length;
    }
  };
}

if (typeof window.toggleCart !== "function") {
  window.toggleCart = function () {
    console.warn("toggleCart() не определена — используется заглушка.");
    const cartPanel = document.getElementById("cart");
    if (cartPanel) {
      cartPanel.classList.toggle("open");
    }
  };
}

/* ==============================
   ГЛОБАЛЬНОЕ СОСТОЯНИЕ
================================= */
window.cart = window.cart || [];

/* ==============================
   ИНИЦИАЛИЗАЦИЯ
================================= */
document.addEventListener("DOMContentLoaded", function () {
  try {
    renderProducts();
  } catch (err) {
    console.error("Ошибка при вызове renderProducts():", err);
  }

  try {
    updateCartUI();
  } catch (err) {
    console.error("Ошибка при вызове updateCartUI():", err);
  }

  const orderForm = document.getElementById("order-form");
  if (orderForm) {
    orderForm.addEventListener("submit", placeOrder);
  }
});

/* ==============================
   ФОРМИРОВАНИЕ ТЕКСТА ЗАКАЗА
================================= */
function buildOrderText(cart, customerName, contactType, contactValue) {
  if (!Array.isArray(cart) || cart.length === 0) {
    return null;
  }

  let total = 0;
  const lines = cart.map((item, index) => {
    const name = item.name || "Без названия";
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 1;
    const subtotal = price * quantity;
    total += subtotal;
    return `${index + 1}. ${name} — ${quantity} × ${price}₽ = ${subtotal}₽`;
  });

  const text =
    `🛒 Новый заказ!\n\n` +
    `👤 Имя: ${customerName}\n` +
    `📱 Способ связи: ${contactType} (${contactValue})\n\n` +
    `Товары:\n${lines.join("\n")}\n\n` +
    `💰 Итого: ${total}₽`;

  return text;
}

/* ==============================
   ВАЛИДАЦИЯ
================================= */
function validateOrderInput(customerName, contactType, contactValue) {
  const errors = [];

  if (!customerName || customerName.trim().length < 2) {
    errors.push("Укажите ваше имя (минимум 2 символа).");
  }

  if (!contactType || (contactType !== "telegram" && contactType !== "wechat")) {
    errors.push("Выберите способ связи: Telegram или WeChat.");
  }

  if (!contactValue || contactValue.trim().length < 3) {
    errors.push("Укажите корректный контакт (username/ID).");
  }

  if (!Array.isArray(window.cart) || window.cart.length === 0) {
    errors.push("Корзина пуста. Добавьте товары перед оформлением заказа.");
  }

  return errors;
}

/* ==============================
   ОСНОВНАЯ ФУНКЦИЯ ОФОРМЛЕНИЯ ЗАКАЗА
================================= */
async function placeOrder(event) {
  if (event && typeof event.preventDefault === "function") {
    event.preventDefault();
  }

  const form = event && event.target ? event.target : document.getElementById("order-form");

  const customerNameInput = form.querySelector("[name='customerName']");
  const contactTypeInput = form.querySelector("[name='contactType']:checked");
  const contactValueInput = form.querySelector("[name='contactValue']");
  const submitButton = form.querySelector("[type='submit']");

  const customerName = customerNameInput ? customerNameInput.value.trim() : "";
  const contactType = contactTypeInput ? contactTypeInput.value : "";
  const contactValue = contactValueInput ? contactValueInput.value.trim() : "";

  const errors = validateOrderInput(customerName, contactType, contactValue);

  if (errors.length > 0) {
    alert(errors.join("\n"));
    return;
  }

  const orderText = buildOrderText(window.cart, customerName, contactType, contactValue);

  if (!orderText) {
    alert("Не удалось сформировать заказ. Проверьте корзину.");
    return;
  }

  // ID чата, куда Puzzlebot должен отправить уведомление.
  // Замените на реальный chat_id получателя, если это не он.
  const CHAT_ID = "8940120225";

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Отправка...";
  }

  try {
    const response = await fetch("/.netlify/functions/sendorder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: orderText,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Неизвестная ошибка сервера");
    }

    alert("✅ Заказ успешно отправлен! Мы свяжемся с вами в ближайшее время.");

    window.cart = [];
    try {
      updateCartUI();
    } catch (err) {
      console.error("Ошибка при обновлении корзины после заказа:", err);
    }

    form.reset();

    try {
      toggleCart();
    } catch (err) {
      console.error("Ошибка при закрытии корзины:", err);
    }
  } catch (err) {
    console.error("Ошибка при отправке заказа:", err);
    alert("❌ Не удалось отправить заказ. Попробуйте ещё раз позже.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Оформить заказ";
    }
  }
}

/* ==============================
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ РАБОТЫ С КОРЗИНОЙ
   (на случай, если старые версии были биты/утеряны)
================================= */
function addToCart(product) {
  if (!product || !product.name) {
    console.warn("addToCart: некорректный товар", product);
    return;
  }

  const existing = window.cart.find((item) => item.name === product.name);
  if (existing) {
    existing.quantity = (Number(existing.quantity) || 1) + 1;
  } else {
    window.cart.push({
      name: product.name,
      price: Number(product.price) || 0,
      quantity: 1,
    });
  }

  try {
    updateCartUI();
  } catch (err) {
    console.error("Ошибка при обновлении корзины:", err);
  }
}

function removeFromCart(productName) {
  window.cart = window.cart.filter((item) => item.name !== productName);
  try {
    updateCartUI();
  } catch (err) {
    console.error("Ошибка при обновлении корзины:", err);
  }
}