const user = protectPage("customer");
let returnOrderId = null;

if (new URLSearchParams(window.location.search).get("placed")) {
  showMsg("success-msg", "Order placed. It stays pending until an admin confirms it.", true);
}

function paymentBadge(o) {
  const p = o.payment || { method: "cod" };
  return p.method === "paypal"
    ? `<span class="badge paid">Paid with PayPal</span>`
    : `<span class="badge cod">Pay on delivery</span>`;
}

function orderCard(o) {
  const canRate = o.status === "confirmed" && o.returnStatus !== "approved";
  const days = returnDaysLeft(o);
  return `
  <article class="card">
    <div class="order-head">
      <div>
        <h3>Order #${o.id}</h3>
        <div class="order-meta">${formatDate(o.createdAt)}</div>
      </div>
      <div class="badges">
        <span class="badge ${esc(o.status)}">${esc(o.status)}</span>
        ${paymentBadge(o)}
        ${o.returnStatus ? `<span class="badge ${esc(o.returnStatus)}">Return ${esc(o.returnStatus)}</span>` : ""}
      </div>
    </div>
    <ul class="items">
      ${o.items
        .map(
          (i) => `<li>
            <span>${esc(i.name)} <span class="muted">x ${i.quantity}</span></span>
            <span>${money(i.price * i.quantity)}
              ${canRate ? `<button class="btn btn-sm" data-rate="${i.productId}">Rate</button>` : ""}</span>
          </li>`
        )
        .join("")}
    </ul>
    <div class="order-total">Total: ${money(o.total)}</div>
    ${o.status === "pending" ? `<p class="order-meta">Waiting for an admin to confirm your order.</p>` : ""}
    ${o.returnStatus ? `<div class="note"><strong>Return ${esc(o.returnStatus)}.</strong> Reason: ${esc(o.returnReason)}${o.returnStatus === "approved" && o.payment && o.payment.method === "paypal" ? " The shop will refund your PayPal payment." : ""}</div>` : ""}
    ${canRequestReturn(o) ? `<div class="order-actions">
        <button class="btn" data-return="${o.id}">Request a return</button>
        <span class="order-meta" style="align-self:center">${days} day${days === 1 ? "" : "s"} left to return</span></div>` : ""}
  </article>`;
}

async function showOrders() {
  const orders = (await getOrdersByUser(user.id)).sort((a, b) => b.id - a.id);
  document.getElementById("orders").innerHTML = orders.length
    ? orders.map(orderCard).join("")
    : `<div class="empty">You have no orders yet. <a href="shop.html">Browse the shop</a>.</div>`;
}

document.getElementById("orders").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.rate) openReviews(Number(btn.dataset.rate), user, showOrders);
  if (btn.dataset.return) {
    returnOrderId = Number(btn.dataset.return);
    document.getElementById("return-form").reset();
    showFieldErrors(["reason", "note"], {});
    showMsg("return-message", "");
    document.getElementById("return-label").textContent = `Order #${returnOrderId}. The whole order will be returned.`;
    document.getElementById("return-dialog").showModal();
  }
});

document.getElementById("return-cancel").addEventListener("click", () => document.getElementById("return-dialog").close());

document.getElementById("return-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    reason: document.getElementById("return-reason").value,
    note: document.getElementById("return-note").value.trim(),
  };
  const errors = validateReturn(data);
  showFieldErrors(["reason", "note"], errors);
  if (Object.keys(errors).length) return;

  const result = await requestReturn(user.id, returnOrderId, data.reason, data.note);
  if (!result.ok) return showMsg("return-message", result.message);

  document.getElementById("return-dialog").close();
  showMsg("success-msg", result.message, true);
  showOrders();
});

showOrders();
