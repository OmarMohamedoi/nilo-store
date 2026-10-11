/* auth.js - who is logged in, page guards, and the top navigation bar. */

const NAV_LINKS = {
  admin: [
    ["admin-products.html", "Products"],
    ["admin-categories.html", "Categories"],
    ["admin-orders.html", "Orders"],
    ["admin-admins.html", "Admins"],
  ],
  customer: [
    ["shop.html", "Shop"],
    ["wishlist.html", "Wish list"],
    ["cart.html", "Cart"],
    ["orders.html", "My orders"],
  ],
};

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser"));
  } catch (e) {
    return null;
  }
}

function homeFor(user) {
  return user.role === "admin" ? "admin-products.html" : "shop.html";
}

function renderNav(user) {
  const box = document.getElementById("navbar");
  if (!box) return;
  const here = location.pathname.split("/").pop() || "admin-products.html";

  const links = NAV_LINKS[user.role]
    .map(([href, label]) => {
      const badge = href === "cart.html" ? '<span class="badge-count" id="cart-count" hidden></span>' : "";
      return `<a href="${href}" class="${href === here ? "active" : ""}">${label}${badge}</a>`;
    })
    .join("");

  box.innerHTML = `
    <header class="topbar"><div class="topbar-inner">
      <a class="brand" href="${homeFor(user)}">nilo<span>.</span></a>
      <nav class="menu">${links}</nav>
      <div class="user">
        <span>${esc(user.name)}${user.role === "admin" ? " (admin)" : ""}</span>
        <button class="btn btn-ghost btn-sm" onclick="logout()">Logout</button>
      </div>
    </div></header>`;

  renderFooter();
  if (user.role === "customer") updateCartCount(user.id);
}

function renderFooter() {
  if (document.getElementById("site-footer")) return;
  const f = document.createElement("footer");
  f.id = "site-footer";
  f.className = "site-footer";
  f.innerHTML = `<div class="footer-inner">
      <span class="brand">nilo<span>.</span></span>
      <span>A demo store built with HTML, CSS and JavaScript.</span>
    </div>`;
  document.body.appendChild(f);
}

async function updateCartCount(userId) {
  const el = document.getElementById("cart-count");
  if (!el) return;
  const rows = await getCart(userId);
  const n = rows.reduce((sum, r) => sum + r.quantity, 0);
  if (el.textContent !== String(n)) {
    el.classList.remove("bump");
    void el.offsetWidth; // restart the animation
    el.classList.add("bump");
  }
  el.textContent = n;
  el.hidden = n === 0;
}

// Call at the top of a page that needs a logged-in user of this role.
function protectPage(role) {
  const user = getCurrentUser();

  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  if (role && user.role !== role) {
    window.location.href = homeFor(user);
    return null;
  }

  renderNav(user);
  return user;
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "login.html";
}
