/**
 * db.js — the data layer.
 *
 * 1. On the very first run it fetches ready-made products from an online
 *    fake API (DummyJSON) and copies them into localStorage.
 * 2. After that, every read and write (add, edit, delete) uses localStorage,
 *    because the online fake API does not really save changes.
 *
 * Every page loads this file first, then calls the functions below.
 */

const SEED_URL =
  "https://dummyjson.com/products?limit=100&select=title,description,category,price,stock,thumbnail";

const KEYS = {
  products: "shop_products",
  categories: "shop_categories",
  users: "shop_users",
  counters: "shop_counters",
  seeded: "shop_seeded",
};

/* ---------- low-level helpers ---------- */

function readTable(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    return [];
  }
}

function writeTable(key, rows) {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch (e) {
    throw new Error("Browser storage is full. Delete some data and try again.");
  }
}

// Gives out 1, 2, 3... and never reuses an id, even after a delete.
function nextId(table, rows) {
  const counters = JSON.parse(localStorage.getItem(KEYS.counters) || "{}");
  const highest = Math.max(0, ...rows.map((r) => r.id));
  const next = Math.max(counters[table] || 0, highest) + 1;
  counters[table] = next;
  localStorage.setItem(KEYS.counters, JSON.stringify(counters));
  return next;
}

function toTitle(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* ---------- first-run seeding ---------- */

async function seed() {
  // The first admin is created by hand: only admins can add other admins.
  if (!localStorage.getItem(KEYS.users)) {
    writeTable(KEYS.users, [
      { id: 1, name: "Main Admin", email: "admin@shop.com", password: "Admin123", role: "admin" },
    ]);
  }

  if (localStorage.getItem(KEYS.seeded)) return;

  try {
    const res = await fetch(SEED_URL);
    if (!res.ok) throw new Error("Server answered " + res.status);
    const data = await res.json();

    // The API gives each product a category NAME. We turn the names into
    // category rows with ids, and give every product a categoryId.
    const names = [...new Set(data.products.map((p) => toTitle(p.category)))];
    const categories = names.map((name, i) => ({ id: i + 1, name, description: "" }));

    const products = data.products.map((p) => ({
      id: p.id,
      name: p.title,
      image: p.thumbnail,
      categoryId: categories.find((c) => c.name === toTitle(p.category)).id,
      price: p.price,
      description: p.description,
      stock: p.stock,
    }));

    writeTable(KEYS.categories, categories);
    writeTable(KEYS.products, products);
    localStorage.setItem(KEYS.seeded, "yes");
  } catch (err) {
    // No internet or API down: the shop starts empty and tries again next time.
    console.error("Could not load starting products:", err);
  }
}

// Every function below waits for this before touching the data.
const dbReady = seed();

/* ---------- products ---------- */

async function getProducts() {
  await dbReady;
  return readTable(KEYS.products);
}

async function getProduct(id) {
  const all = await getProducts();
  return all.find((p) => p.id === Number(id)) || null;
}

async function addProduct(product) {
  const all = await getProducts();
  const created = { id: nextId("products", all), ...product };
  writeTable(KEYS.products, [...all, created]);
  return created;
}

async function updateProduct(id, product) {
  const all = await getProducts();
  const index = all.findIndex((p) => p.id === Number(id));
  if (index === -1) throw new Error("This product no longer exists.");
  all[index] = { ...all[index], ...product, id: Number(id) };
  writeTable(KEYS.products, all);
  return all[index];
}

async function deleteProduct(id) {
  const all = await getProducts();
  writeTable(KEYS.products, all.filter((p) => p.id !== Number(id)));
  writeTable(REVIEWS_KEY, readTable(REVIEWS_KEY).filter((r) => r.productId !== Number(id)));
}

/* ---------- categories ---------- */

async function getCategories() {
  await dbReady;
  return readTable(KEYS.categories);
}

async function getCategory(id) {
  const all = await getCategories();
  return all.find((c) => c.id === Number(id)) || null;
}

async function addCategory(category) {
  const all = await getCategories();
  const created = { id: nextId("categories", all), ...category };
  writeTable(KEYS.categories, [...all, created]);
  return created;
}

async function updateCategory(id, category) {
  const all = await getCategories();
  const index = all.findIndex((c) => c.id === Number(id));
  if (index === -1) throw new Error("This category no longer exists.");
  all[index] = { ...all[index], ...category, id: Number(id) };
  writeTable(KEYS.categories, all);
  return all[index];
}

async function deleteCategory(id) {
  const all = await getCategories();
  writeTable(KEYS.categories, all.filter((c) => c.id !== Number(id)));
}

/* ---------- users ---------- */

async function getUsers() {
  await dbReady;
  return readTable(KEYS.users);
}

async function findUser(email, password) {
  const all = await getUsers();
  return all.find((u) => u.email === email && u.password === password) || null;
}

async function addUser(user) {
  const all = await getUsers();
  const created = { id: nextId("users", all), ...user };
  writeTable(KEYS.users, [...all, created]);
  return created;
}

async function emailExists(email) {
  const all = await getUsers();
  return all.some((u) => u.email === email.toLowerCase());
}

const WISHLIST_KEY = "shop_wishlist";

async function getWishlist(userId) {
  await dbReady;
  return readTable(WISHLIST_KEY)
    .filter((w) => w.userId === userId)
    .map((w) => w.productId);
}

// Adds the product if it's not in the list, removes it if it is.
// Returns true if the product is now in the wish list.
async function toggleWishlist(userId, productId) {
  await dbReady;
  const all = readTable(WISHLIST_KEY);
  const index = all.findIndex((w) => w.userId === userId && w.productId === productId);

  if (index === -1) all.push({ userId, productId });
  else all.splice(index, 1);

  writeTable(WISHLIST_KEY, all);
  return index === -1;
}

const CART_KEY = "shop_cart";

async function getCart(userId) {
  await dbReady;
  return readTable(CART_KEY).filter((c) => c.userId === userId);
}

// Returns { ok: true/false, message }
async function addToCart(userId, productId, qty = 1) {
  const product = await getProduct(productId);
  if (!product) return { ok: false, message: "This product no longer exists." };
  if (product.stock === 0) return { ok: false, message: "This product is out of stock." };

  const all = readTable(CART_KEY);
  const row = all.find((c) => c.userId === userId && c.productId === productId);
  const inCart = row ? row.quantity : 0;

  if (inCart + qty > product.stock) {
    return {
      ok: false,
      message: `Only ${product.stock} of "${product.name}" in stock. You already have ${inCart} in your cart.`,
    };
  }

  if (row) row.quantity = inCart + qty;
  else all.push({ userId, productId, quantity: qty });

  writeTable(CART_KEY, all);
  return { ok: true, message: `"${product.name}" added to your cart.` };
}

async function setCartQuantity(userId, productId, qty) {
  const product = await getProduct(productId);
  if (!product) return { ok: false, message: "This product no longer exists." };

  if (!Number.isInteger(qty) || qty < 1)
    return { ok: false, message: "Quantity must be a whole number, 1 or more." };
  if (qty > product.stock)
    return { ok: false, message: `Only ${product.stock} of "${product.name}" in stock.` };

  const all = readTable(CART_KEY);
  const row = all.find((c) => c.userId === userId && c.productId === productId);
  if (!row) return { ok: false, message: "This item is not in your cart." };

  row.quantity = qty;
  writeTable(CART_KEY, all);
  return { ok: true, message: "" };
}

async function removeFromCart(userId, productId) {
  const all = readTable(CART_KEY);
  writeTable(
    CART_KEY,
    all.filter((c) => !(c.userId === userId && c.productId === productId))
  );
}

const ORDERS_KEY = "shop_orders";

async function getAllOrders() {
  await dbReady;
  return readTable(ORDERS_KEY);
}

async function getOrdersByUser(userId) {
  const all = await getAllOrders();
  return all.filter((o) => o.userId === userId);
}

// Checks every cart line (exists, enough stock) and works out the total.
// Returns { ok: true, items, total } or { ok: false, message }.
async function checkCart(userId) {
  const cart = await getCart(userId);
  if (cart.length === 0) return { ok: false, message: "Your cart is empty." };

  const products = await getProducts();
  const items = [];
  const problems = [];

  for (const row of cart) {
    const p = products.find((x) => x.id === row.productId);
    if (!p) {
      problems.push("A product in your cart no longer exists. Remove it and try again.");
    } else if (p.stock < row.quantity) {
      problems.push(`Only ${p.stock} of "${p.name}" in stock (you have ${row.quantity} in your cart).`);
    } else {
      items.push({ productId: p.id, name: p.name, price: p.price, quantity: row.quantity });
    }
  }
  if (problems.length > 0) return { ok: false, message: problems.join(" ") };

  const total = Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;
  return { ok: true, items, total };
}

// Turns the customer's cart into a pending order.
// payment: { method: "cod" | "paypal", status, paypalOrderId?, payerEmail?, amount? }
async function placeOrder(user, payment = { method: "cod", status: "unpaid" }) {
  const check = await checkCart(user.id);
  if (!check.ok) return check;

  const orders = readTable(ORDERS_KEY);
  const order = {
    id: nextId("orders", orders),
    userId: user.id,
    userName: user.name,
    items: check.items,
    total: check.total,
    status: "pending",
    payment,
    createdAt: new Date().toISOString(),
  };

  writeTable(ORDERS_KEY, [...orders, order]);
  writeTable(CART_KEY, readTable(CART_KEY).filter((c) => c.userId !== user.id));
  return { ok: true, order };
}

async function setOrderStatus(orderId, status) {
  if (status !== "confirmed" && status !== "rejected")
    return { ok: false, message: "Invalid status." };

  const orders = readTable(ORDERS_KEY);
  const order = orders.find((o) => o.id === Number(orderId));
  if (!order) return { ok: false, message: "This order no longer exists." };
  if (order.status !== "pending")
    return { ok: false, message: `Order #${order.id} was already ${order.status}.` };

  if (status === "confirmed") {
    // Check the stock again: it may have changed since the customer ordered.
    const products = await getProducts();
    const problems = [];
    for (const item of order.items) {
      const p = products.find((x) => x.id === item.productId);
      if (!p) problems.push(`"${item.name}" no longer exists.`);
      else if (p.stock < item.quantity)
        problems.push(`Only ${p.stock} of "${item.name}" in stock (the order needs ${item.quantity}).`);
    }
    if (problems.length > 0) return { ok: false, message: problems.join(" ") };

    // Everything is available, so take it out of the stock.
    for (const item of order.items) {
      products.find((x) => x.id === item.productId).stock -= item.quantity;
    }
    writeTable(KEYS.products, products);
  }

  order.status = status;
  order.decidedAt = new Date().toISOString();
  writeTable(ORDERS_KEY, orders);
  const refund =
    status === "rejected" && order.payment && order.payment.method === "paypal"
      ? " It was paid with PayPal, so refund the payment in your PayPal sandbox account."
      : "";
  return { ok: true, message: `Order #${order.id} ${status}.${refund}` };
}

/* ---------- bonus: reviews and ratings ---------- */

const REVIEWS_KEY = "shop_reviews";

async function getReviews(productId) {
  await dbReady;
  return readTable(REVIEWS_KEY).filter((r) => r.productId === Number(productId));
}

// { productId: { avg, count } } for every product that has reviews.
async function getRatingsMap() {
  await dbReady;
  const map = {};
  readTable(REVIEWS_KEY).forEach((r) => {
    const m = map[r.productId] || (map[r.productId] = { sum: 0, count: 0 });
    m.sum += r.rating;
    m.count += 1;
  });
  Object.values(map).forEach((m) => (m.avg = m.sum / m.count));
  return map;
}

// Only customers with a confirmed (and not returned) order of this product can review it.
async function canReview(userId, productId) {
  const orders = await getOrdersByUser(userId);
  return orders.some(
    (o) =>
      o.status === "confirmed" &&
      o.returnStatus !== "approved" &&
      o.items.some((i) => i.productId === Number(productId))
  );
}

// Creates the review, or updates the customer's earlier review of the same product.
async function saveReview(user, productId, rating, comment) {
  productId = Number(productId);
  if (!(await canReview(user.id, productId)))
    return { ok: false, message: "You can review a product after an order with it is confirmed." };

  const all = readTable(REVIEWS_KEY);
  const existing = all.find((r) => r.userId === user.id && r.productId === productId);
  if (existing) {
    existing.rating = rating;
    existing.comment = comment;
    existing.updatedAt = new Date().toISOString();
  } else {
    all.push({
      id: nextId("reviews", all),
      productId,
      userId: user.id,
      userName: user.name,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    });
  }
  writeTable(REVIEWS_KEY, all);
  return { ok: true, message: existing ? "Your review was updated." : "Thank you for your review." };
}

async function deleteReview(id) {
  writeTable(REVIEWS_KEY, readTable(REVIEWS_KEY).filter((r) => r.id !== Number(id)));
}

/* ---------- bonus: returning orders ---------- */

const RETURN_WINDOW_DAYS = 14;

function returnDaysLeft(order) {
  const since = (Date.now() - new Date(order.decidedAt || order.createdAt).getTime()) / 86400000;
  return Math.ceil(RETURN_WINDOW_DAYS - since);
}

function canRequestReturn(order) {
  return order.status === "confirmed" && !order.returnStatus && returnDaysLeft(order) > 0;
}

async function requestReturn(userId, orderId, reason, note) {
  const orders = readTable(ORDERS_KEY);
  const order = orders.find((o) => o.id === Number(orderId) && o.userId === userId);
  if (!order) return { ok: false, message: "Order not found." };
  if (order.status !== "confirmed")
    return { ok: false, message: "Only confirmed orders can be returned." };
  if (order.returnStatus)
    return { ok: false, message: `A return for this order is already ${order.returnStatus}.` };
  if (returnDaysLeft(order) <= 0)
    return { ok: false, message: `Returns are accepted within ${RETURN_WINDOW_DAYS} days of confirmation.` };

  order.returnStatus = "requested";
  order.returnReason = reason;
  order.returnNote = note;
  order.returnRequestedAt = new Date().toISOString();
  writeTable(ORDERS_KEY, orders);
  return { ok: true, message: "Return requested. An admin will review it." };
}

// Admin decision. Approving puts the items back into the stock.
async function decideReturn(orderId, decision) {
  if (decision !== "approved" && decision !== "rejected")
    return { ok: false, message: "Invalid decision." };

  const orders = readTable(ORDERS_KEY);
  const order = orders.find((o) => o.id === Number(orderId));
  if (!order) return { ok: false, message: "This order no longer exists." };
  if (order.returnStatus !== "requested")
    return { ok: false, message: `The return for order #${order.id} is already ${order.returnStatus || "not requested"}.` };

  if (decision === "approved") {
    const products = await getProducts();
    order.items.forEach((item) => {
      const p = products.find((x) => x.id === item.productId);
      if (p) p.stock += item.quantity;
    });
    writeTable(KEYS.products, products);
  }

  order.returnStatus = decision;
  order.returnDecidedAt = new Date().toISOString();
  writeTable(ORDERS_KEY, orders);

  const refund =
    decision === "approved" && order.payment && order.payment.method === "paypal"
      ? " It was paid with PayPal, so refund the payment in your PayPal sandbox account."
      : "";
  return { ok: true, message: `Return for order #${order.id} ${decision}.${refund}` };
}
