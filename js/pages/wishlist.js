const user = protectPage("customer");

function card(p) {
  const stock = p.stock === 0 ? `<span class="stock-out">Out of stock</span>`
    : p.stock <= 5 ? `<span class="stock-low">Only ${p.stock} left</span>`
    : `<span class="stock-ok">In stock</span>`;
  return `
    <article class="product" data-card="${p.id}">
      <div class="thumb"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" /></div>
      <div class="body">
        <h3>${esc(p.name)}</h3>
        <div class="price">${money(p.price)}</div>
        <div>${stock}</div>
        <div class="cart-info">${cartInfoHtml(p)}</div>
        <div class="actions">
          <button class="btn btn-sm" data-remove="${p.id}">Remove</button>
          ${cartControlHtml(p)}
        </div>
      </div>
    </article>`;
}

async function showWishlist() {
  const ids = await getWishlist(user.id);
  const items = (await getProducts()).filter((p) => ids.includes(p.id));
  await loadCartQty(user.id);
  const box = document.getElementById("items");

  box.innerHTML = items.length
    ? items.map(card).join("")
    : `<div class="empty" style="grid-column:1/-1">Your wish list is empty. <a href="shop.html">Browse the shop</a>.</div>`;
}

document.getElementById("items").addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  if (await handleCartClick(btn, user.id, showWishlist)) return;

  if (btn.dataset.remove) {
    await toggleWishlist(user.id, Number(btn.dataset.remove));
    toast("Removed from your wish list.");
    showWishlist();
  }
});

showWishlist();
