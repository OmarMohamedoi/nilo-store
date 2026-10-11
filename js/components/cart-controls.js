/**
 * cart-controls.js - the "Add to cart" button / quantity stepper on product cards,
 * plus the "In cart: 2 of 5 available" line. Used by shop.js and wishlist.js.
 * Needs ui.js, db.js and auth.js.
 *
 * How it works:
 *  - cartQty remembers how many of each product are in this customer's cart.
 *  - After every click we reload it, update the nav badge, and the page redraws
 *    just that one product card (no page reload, no jumping around).
 */
let cartQty = {}; // productId -> quantity in the logged-in customer's cart

async function loadCartQty(userId) {
  cartQty = {};
  (await getCart(userId)).forEach((row) => (cartQty[row.productId] = row.quantity));
}

// The line under the price: how many of this product are in the cart.
function cartInfoHtml(p) {
  const n = cartQty[p.id] || 0;
  if (!n) return "";
  const limit = n >= p.stock ? " (all available)" : ` of ${p.stock} available`;
  return `<span class="in-cart">In cart: <strong>${n}</strong>${limit}</span>`;
}

// Out of stock -> disabled button. Not in cart -> "Add to cart". In cart -> [-] 2 [+].
function cartControlHtml(p) {
  const n = cartQty[p.id] || 0;
  if (p.stock === 0) return `<button class="btn btn-sm btn-accent" disabled>Out of stock</button>`;
  if (n === 0) return `<button class="btn btn-sm btn-accent" data-cart-add="${p.id}">Add to cart</button>`;
  return `
    <div class="stepper" role="group" aria-label="Quantity in cart">
      <button class="btn btn-sm" data-cart-minus="${p.id}" aria-label="Remove one from cart">&minus;</button>
      <span class="stepper-qty" aria-live="polite">${n}</span>
      <button class="btn btn-sm" data-cart-plus="${p.id}" aria-label="Add one more to cart" ${n >= p.stock ? "disabled" : ""}>+</button>
    </div>`;
}

/**
 * Call this from a click listener. Returns true if the click was a cart button.
 * afterChange(productId) is where the page redraws the card.
 */
async function handleCartClick(btn, userId, afterChange) {
  const add = btn.dataset.cartAdd, plus = btn.dataset.cartPlus, minus = btn.dataset.cartMinus;
  if (!add && !plus && !minus) return false;

  const id = Number(add || plus || minus);
  let result = { ok: true, message: "" };

  if (add || plus) {
    result = await addToCart(userId, id, 1); // checks the stock for us
  } else {
    const n = cartQty[id] || 0;
    if (n <= 1) await removeFromCart(userId, id);
    else result = await setCartQuantity(userId, id, n - 1);
  }

  await loadCartQty(userId);
  updateCartCount(userId);
  if (!result.ok) toast(result.message, false);
  else if (add) toast(result.message);
  await afterChange(id);
  return true;
}
