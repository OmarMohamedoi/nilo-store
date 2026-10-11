const me = protectPage("admin");

const PER_PAGE = 10;
const FIELDS = ["name", "categoryId", "price", "stock", "image", "description"];
let categories = [];
let allProducts = [];
let ratings = {};
let editingId = null;
let page = 1;

/* ---------- validation ---------- */

function validateProduct(p) {
  const errors = {};

  if (!p.name) errors.name = "Enter a product name.";
  else if (p.name.length < 3) errors.name = "Name must be at least 3 characters.";
  else if (p.name.length > 80) errors.name = "Name must be 80 characters or fewer.";

  if (!categories.some((c) => c.id === p.categoryId)) errors.categoryId = "Choose a category.";

  if (!(p.price > 0)) errors.price = "Enter a price greater than 0.";
  else if (p.price > 1000000) errors.price = "Price cannot be more than 1,000,000.";

  if (!Number.isInteger(p.stock) || p.stock < 0) errors.stock = "Stock must be a whole number, 0 or more.";

  if (!/^https?:\/\//i.test(p.image)) errors.image = "Image link must start with http:// or https://";

  if (p.description.length < 10) errors.description = "Description must be at least 10 characters.";
  else if (p.description.length > 500) errors.description = "Description must be 500 characters or fewer.";

  return errors;
}

/* ---------- showing data ---------- */

function categoryName(id) {
  const c = categories.find((c) => c.id === id);
  return c ? c.name : "Unknown";
}

function fillCategorySelects() {
  const options = categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  document.getElementById("categoryId").innerHTML = `<option value="">Select a category</option>` + options;
  const filter = document.getElementById("filter-category");
  const keep = filter.value;
  filter.innerHTML = `<option value="">All categories</option>` + options;
  filter.value = keep;
}

function renderTable() {
  const q = document.getElementById("search").value.trim().toLowerCase();
  const cat = Number(document.getElementById("filter-category").value) || 0;
  const list = allProducts.filter(
    (p) => (!q || p.name.toLowerCase().includes(q)) && (!cat || p.categoryId === cat)
  );

  const view = paginate(list, page, PER_PAGE);
  page = view.page;
  const from = list.length ? (page - 1) * PER_PAGE + 1 : 0;
  document.getElementById("result-count").textContent =
    `Showing ${from}-${from ? from + view.items.length - 1 : 0} of ${list.length} products`;

  document.getElementById("rows").innerHTML = view.items.length
    ? view.items
        .map(
          (p) => `<tr>
          <td>${p.id}</td>
          <td><img class="row-thumb" src="${esc(p.image)}" alt="" loading="lazy" /></td>
          <td><strong>${esc(p.name)}</strong><div class="clamp">${esc(p.description)}</div></td>
          <td>${esc(categoryName(p.categoryId))}</td>
          <td class="num">${money(p.price)}</td>
          <td class="num"><span class="${p.stock === 0 ? "stock-out" : p.stock <= 5 ? "stock-low" : "stock-ok"}"><strong>${p.stock}</strong></span></td>
          <td><button class="link-btn" data-reviews="${p.id}">${ratingHtml(ratings[p.id])}</button></td>
          <td class="row-actions">
            <button class="btn btn-sm" data-edit="${p.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-delete="${p.id}">Delete</button>
          </td>
        </tr>`
        )
        .join("")
    : `<tr><td colspan="8"><div class="empty">${allProducts.length ? "No products match your search." : "No products yet. Add the first one above."}</div></td></tr>`;

  renderPager("pager", page, view.pages, (n) => { page = n; renderTable(); });
}

async function reload() {
  allProducts = await getProducts();
  ratings = await getRatingsMap();
  renderTable();
}

/* ---------- edit / delete ---------- */

function resetForm() {
  document.getElementById("product-form").reset();
  showFieldErrors(FIELDS, {});
  document.getElementById("form-title").textContent = "Add product";
  document.getElementById("cancel-btn").hidden = true;
  editingId = null;
}

async function startEdit(id) {
  const p = await getProduct(id);
  if (!p) return;
  document.getElementById("name").value = p.name;
  document.getElementById("categoryId").value = p.categoryId;
  document.getElementById("price").value = p.price;
  document.getElementById("stock").value = p.stock;
  document.getElementById("image").value = p.image;
  document.getElementById("description").value = p.description;
  document.getElementById("form-title").textContent = `Edit product #${p.id}`;
  document.getElementById("cancel-btn").hidden = false;
  editingId = id;
  document.getElementById("form-card").scrollIntoView({ behavior: "smooth" });
}

async function removeProduct(id) {
  const p = await getProduct(id);
  if (!p || !confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
  await deleteProduct(id);
  if (editingId === id) resetForm();
  toast("Product deleted.");
  reload();
}

document.getElementById("rows").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.edit) startEdit(Number(btn.dataset.edit));
  if (btn.dataset.delete) removeProduct(Number(btn.dataset.delete));
  if (btn.dataset.reviews) openReviews(Number(btn.dataset.reviews), me, reload);
});

/* ---------- form submit ---------- */

document.getElementById("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const num = (id) => {
    const v = document.getElementById(id).value.trim();
    return v === "" ? NaN : Number(v);
  };

  const product = {
    name: document.getElementById("name").value.trim(),
    categoryId: Number(document.getElementById("categoryId").value),
    price: num("price"),
    stock: num("stock"),
    image: document.getElementById("image").value.trim(),
    description: document.getElementById("description").value.trim(),
  };

  const errors = validateProduct(product);
  showFieldErrors(FIELDS, errors);
  if (Object.keys(errors).length) return;

  try {
    if (editingId) await updateProduct(editingId, product);
    else await addProduct(product);
  } catch (err) {
    return toast(err.message, false);
  }

  toast(editingId ? "Product updated." : "Product added.");
  resetForm();
  reload();
});

document.getElementById("cancel-btn").addEventListener("click", resetForm);
document.getElementById("search").addEventListener("input", () => { page = 1; renderTable(); });
document.getElementById("filter-category").addEventListener("change", () => { page = 1; renderTable(); });

/* ---------- start ---------- */

(async function start() {
  categories = await getCategories();
  fillCategorySelects();
  reload();
})();
