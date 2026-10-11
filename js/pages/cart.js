const user = protectPage("customer");
let paypalStarted = false;

async function showCart() {
  const cart = await getCart(user.id);
  const products = await getProducts();
  const box = document.getElementById("items");
  const totalBox = document.getElementById("total");

  // Join each cart row with its product. Drop products the admin deleted.
  const lines = [];
  for (const row of cart) {
    const product = products.find((p) => p.id === row.productId);
    if (product) lines.push({ product, quantity: row.quantity });
    else await removeFromCart(user.id, row.productId);
  }

  updateCartCount(user.id);

  if (!lines.length) {
    box.innerHTML = `<div class="empty">Your cart is empty. <a href="shop.html">Browse the shop</a>.</div>`;
    totalBox.textContent = "";
    document.getElementById("checkout").hidden = true;
    return;
  }

  box.innerHTML = lines
    .map(
      ({ product: p, quantity }) => `
    <div class="cart-line">
      <img src="${esc(p.image)}" alt="${esc(p.name)}" />
      <div>
        <h3>${esc(p.name)}</h3>
        <div class="muted">${money(p.price)} each</div>
        ${quantity > p.stock ? `<div class="error">Only ${p.stock} left in stock. Lower the quantity.</div>` : ""}
      </div>
      <div class="field" style="margin:0">
        <label for="qty-${p.id}" class="muted" style="font-weight:500">Quantity</label>
        <input class="qty" id="qty-${p.id}" type="number" min="1" value="${quantity}" data-qty="${p.id}" />
      </div>
      <div>
        <div class="line-total">${money(p.price * quantity)}</div>
        <button class="link-btn" data-remove="${p.id}">Remove</button>
      </div>
    </div>`
    )
    .join("");

  const total = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
  totalBox.textContent = `Total: ${money(total)}`;
  document.getElementById("checkout").hidden = false;
  setupPayPal();
}

document.getElementById("items").addEventListener("change", async (e) => {
  if (!e.target.dataset.qty) return;
  showMsg("cart-message", "");
  const result = await setCartQuantity(user.id, Number(e.target.dataset.qty), Number(e.target.value));
  if (!result.ok) showMsg("cart-message", result.message);
  showCart();
});

document.getElementById("items").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-remove]");
  if (!btn) return;
  showMsg("cart-message", "");
  await removeFromCart(user.id, Number(btn.dataset.remove));
  showCart();
});

/* ---------- pay on delivery ---------- */

document.getElementById("place-order").addEventListener("click", async () => {
  showMsg("cart-message", "");
  const result = await placeOrder(user, { method: "cod", status: "unpaid" });
  if (!result.ok) return showMsg("cart-message", result.message);
  window.location.href = "orders.html?placed=1";
});

/* ---------- PayPal sandbox ---------- */

function loadPayPal() {
  return new Promise((resolve, reject) => {
    if (window.paypal) return resolve();
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}&currency=${CURRENCY}`;
    s.onload = resolve;
    s.onerror = () => reject(new Error("PayPal could not be loaded."));
    document.head.appendChild(s);
  });
}

async function setupPayPal() {
  if (paypalStarted) return; // draw the buttons only once
  paypalStarted = true;
  const box = document.getElementById("paypal-buttons");

  try {
    await loadPayPal();
  } catch (err) {
    box.innerHTML = `<p class="error">PayPal is not available right now. You can still pay on delivery.</p>`;
    return;
  }

  paypal
    .Buttons({
      style: { layout: "vertical", shape: "rect" },

      // Runs when the customer clicks the PayPal button.
      createOrder: async (data, actions) => {
        showMsg("cart-message", "");
        const check = await checkCart(user.id); // re-check stock before charging
        if (!check.ok) {
          showMsg("cart-message", check.message);
          throw new Error(check.message);
        }
        return actions.order.create({
          purchase_units: [{ amount: { currency_code: CURRENCY, value: check.total.toFixed(2) } }],
        });
      },

      // Runs after the customer approves the payment in the PayPal window.
      onApprove: async (data, actions) => {
        const details = await actions.order.capture();
        const capture = details.purchase_units?.[0]?.payments?.captures?.[0];
        const payment = {
          method: "paypal",
          status: details.status,
          paypalOrderId: details.id,
          payerEmail: details.payer?.email_address || "",
          amount: capture?.amount?.value || "",
          currency: CURRENCY,
        };
        const result = await placeOrder(user, payment);
        if (!result.ok) {
          // The payment went through but the cart changed in the meantime.
          showMsg("cart-message", `${result.message} Your PayPal payment (${details.id}) was received. Please contact the shop to fix this order or get a refund.`);
          return;
        }
        window.location.href = "orders.html?placed=1";
      },

      onCancel: () => showMsg("cart-message", "Payment cancelled. You were not charged."),
      onError: (err) => {
        console.error(err);
        if (!document.getElementById("cart-message").textContent)
          showMsg("cart-message", "The PayPal payment did not go through. You were not charged.");
      },
    })
    .render("#paypal-buttons");
}

showCart();
