const user = protectPage("customer");

const PER_PAGE = 12;
let allProducts = [];
let categories = [];
let wishlist = [];
let ratings = {};
let page = 1;

function categoryName(id) {
  const c = categories.find((c) => c.id === id);
  return c ? c.name : "Unknown";
}

function productCard(p) {
  const wished = wishlist.includes(p.id);
  const stock = p.stock === 0 ? `<span class="stock-out">Out of stock</span>`
    : p.stock <= 5 ? `<span class="stock-low">Only ${p.stock} left</span>`
    : `<span class="stock-ok">In stock</span>`;
  return `
    <article class="product" data-card="${p.id}">
      <div class="thumb"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" /></div>
      <div class="body">
        <span class="cat">${esc(categoryName(p.categoryId))}</span>
        <h3>${esc(p.name)}</h3>
        <button class="link-btn rating-line" data-reviews="${p.id}">${ratingHtml(ratings[p.id])}</button>
        <div class="price">${money(p.price)}</div>
        <div>${stock}</div>
        <div class="cart-info">${cartInfoHtml(p)}</div>
        <div class="actions">
          <button class="btn btn-sm btn-wish ${wished ? "on" : ""}" data-wish="${p.id}" title="${wished ? "Remove from wish list" : "Add to wish list"}">${wished ? "♥ Saved" : "♡ Save"}</button>
          ${cartControlHtml(p)}
        </div>
      </div>
    </article>`;
}

// Redraw one card only, so the page does not jump or lose its filters.
function refreshCard(id) {
  const el = document.querySelector(`[data-card="${id}"]`);
  const p = allProducts.find((x) => x.id === id);
  if (el && p) el.outerHTML = productCard(p);
}

function applyFilters() {
  const q = document.getElementById("search").value.trim().toLowerCase();
  const cat = Number(document.getElementById("category-filter").value) || 0;
  const min = parseFloat(document.getElementById("min-price").value);
  const max = parseFloat(document.getElementById("max-price").value);
  const sort = document.getElementById("sort").value;
  const count = document.getElementById("result-count");

  if (!isNaN(min) && !isNaN(max) && min > max) {
    count.textContent = "Min price can't be higher than max price.";
    document.getElementById("products").innerHTML = "";
    document.getElementById("pager").innerHTML = "";
    return;
  }

  const list = allProducts.filter(
    (p) =>
      (!q || p.name.toLowerCase().includes(q)) &&
      (!cat || p.categoryId === cat) &&
      (isNaN(min) || p.price >= min) &&
      (isNaN(max) || p.price <= max)
  );

  if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "rating") list.sort((a, b) => ((ratings[b.id] || {}).avg || 0) - ((ratings[a.id] || {}).avg || 0));

  const view = paginate(list, page, PER_PAGE);
  page = view.page;
  count.textContent = `Showing ${view.items.length} of ${list.length} products`;
  document.getElementById("products").innerHTML = view.items.length
    ? view.items.map(productCard).join("")
    : `<div class="empty" style="grid-column:1/-1">No products match your filters.</div>`;
  renderPager("pager", page, view.pages, (n) => { page = n; applyFilters(); window.scrollTo({ top: 0, behavior: "smooth" }); });
}

["search", "category-filter", "min-price", "max-price", "sort"].forEach((id) =>
  document.getElementById(id).addEventListener("input", () => { page = 1; applyFilters(); })
);

document.getElementById("clear-filters").addEventListener("click", () => {
  ["search", "category-filter", "min-price", "max-price", "sort"].forEach((id) => (document.getElementById(id).value = ""));
  page = 1;
  applyFilters();
});

document.getElementById("products").addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  // Add to cart, + and - buttons
  const handled = await handleCartClick(btn, user.id, async (id) => {
    allProducts = await getProducts(); // stock may have changed
    refreshCard(id);
  });
  if (handled) return;

  if (btn.dataset.wish) {
    const id = Number(btn.dataset.wish);
    const added = await toggleWishlist(user.id, id);
    wishlist = await getWishlist(user.id);
    refreshCard(id);
    toast(added ? "Added to your wish list." : "Removed from your wish list.");
  }
  if (btn.dataset.reviews) {
    openReviews(Number(btn.dataset.reviews), user, async () => {
      ratings = await getRatingsMap();
      applyFilters();
    });
  }
});

(async function start() {
  allProducts = await getProducts();
  categories = await getCategories();
  wishlist = await getWishlist(user.id);
  ratings = await getRatingsMap();
  await loadCartQty(user.id);

  document.getElementById("category-filter").innerHTML =
    `<option value="">All categories</option>` +
    categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  applyFilters();
})();
