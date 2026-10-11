protectPage("admin");

const PER_PAGE = 6;
let page = 1;

function paymentBadge(o) {
  const p = o.payment || { method: "cod" };
  return p.method === "paypal"
    ? `<span class="badge paid">Paid with PayPal</span>`
    : `<span class="badge cod">Pay on delivery</span>`;
}

function orderCard(o) {
  const p = o.payment || {};
  return `
  <article class="card">
    <div class="order-head">
      <div>
        <h3>Order #${o.id}</h3>
        <div class="order-meta">${esc(o.userName)} · ${formatDate(o.createdAt)}</div>
      </div>
      <div class="badges">
        <span class="badge ${esc(o.status)}">${esc(o.status)}</span>
        ${paymentBadge(o)}
        ${o.returnStatus ? `<span class="badge ${esc(o.returnStatus)}">Return ${esc(o.returnStatus)}</span>` : ""}
      </div>
    </div>
    <ul class="items">
      ${o.items.map((i) => `<li><span>${esc(i.name)} <span class="muted">x ${i.quantity}</span></span><span>${money(i.price * i.quantity)}</span></li>`).join("")}
    </ul>
    <div class="order-total">Total: ${money(o.total)}</div>
    ${p.method === "paypal" ? `<p class="order-meta">PayPal transaction: ${esc(p.paypalOrderId || "-")}${p.payerEmail ? " · " + esc(p.payerEmail) : ""}</p>` : ""}
    ${o.returnStatus ? `<div class="note"><strong>Return ${esc(o.returnStatus)}:</strong> ${esc(o.returnReason)}${o.returnNote ? " - " + esc(o.returnNote) : ""}</div>` : ""}
    <div class="order-actions">
      ${o.status === "pending" ? `
        <button class="btn btn-primary" data-order="${o.id}" data-status="confirmed">Confirm</button>
        <button class="btn btn-danger" data-order="${o.id}" data-status="rejected">Reject</button>` : ""}
      ${o.returnStatus === "requested" ? `
        <button class="btn btn-primary" data-order="${o.id}" data-return="approved">Approve return</button>
        <button class="btn btn-danger" data-order="${o.id}" data-return="rejected">Reject return</button>` : ""}
    </div>
  </article>`;
}

async function showOrders() {
  const filter = document.getElementById("status-filter").value;
  let orders = (await getAllOrders()).sort((a, b) => b.id - a.id);
  if (filter === "return") orders = orders.filter((o) => o.returnStatus === "requested");
  else if (filter) orders = orders.filter((o) => o.status === filter);

  const view = paginate(orders, page, PER_PAGE);
  page = view.page;
  document.getElementById("result-count").textContent = `${orders.length} order${orders.length === 1 ? "" : "s"}`;
  document.getElementById("orders").innerHTML = view.items.length
    ? view.items.map(orderCard).join("")
    : `<div class="empty">No orders found.</div>`;
  renderPager("pager", page, view.pages, (n) => { page = n; showOrders(); window.scrollTo({ top: 0 }); });
}

document.getElementById("orders").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-order]");
  if (!btn) return;
  const id = Number(btn.dataset.order);

  let result;
  if (btn.dataset.status) {
    if (!confirm(`${btn.dataset.status === "confirmed" ? "Confirm" : "Reject"} order #${id}?`)) return;
    result = await setOrderStatus(id, btn.dataset.status);
  } else {
    if (!confirm(`${btn.dataset.return === "approved" ? "Approve" : "Reject"} the return for order #${id}?`)) return;
    result = await decideReturn(id, btn.dataset.return);
  }

  showMsg("order-message", result.message, result.ok);
  showOrders();
});

document.getElementById("status-filter").addEventListener("change", () => { page = 1; showOrders(); });
showOrders();
