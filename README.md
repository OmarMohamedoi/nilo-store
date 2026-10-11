# Nilo - online store (HTML, CSS, JavaScript)

Plain HTML, CSS and JavaScript. No frameworks, no themes. Products come from an online fake API
(DummyJSON) on the first run; after that all data lives in the browser's localStorage.

## Run it

Open `index.html` (or `login.html`) in a browser. Double-click it, or use the VS Code "Live Server" extension.
The first load needs internet once, to fetch the starting products.

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@shop.com | Admin123 |
| Customer | register your own on the Register page | |

To start over: DevTools (F12) > Application > Local Storage > Clear, then refresh.

## Folder structure

```
index.html                  entry page: sends you to login or to your home page
login.html  register.html   account pages
admin-products.html         admin: products (add, edit, delete, search, pages)
admin-categories.html       admin: categories
admin-orders.html           admin: confirm / reject orders, return requests
admin-admins.html           admin: add other admins
shop.html  wishlist.html    customer: shop with filters, wish list
cart.html  orders.html      customer: cart + payment, order history + returns

css/
  style.css                 all styles

js/
  core/                     used by every page
    config.js               PayPal client id, currency
    db.js                   data layer: seed from the fake API + localStorage
    auth.js                 who is logged in, page guards, navigation bar
    ui.js                   helpers: toasts, messages, pagination, escaping
    validators.js           validation rules
  components/               reusable pieces
    cart-controls.js        "Add to cart" button, + / - stepper, "In cart" line
    reviews.js              ratings and reviews popup
  pages/                    one file per page
    login.js register.js shop.js wishlist.js cart.js orders.js
    admin-products.js admin-categories.js admin-orders.js admin-admins.js
```

## Requirements checklist

| Requirement | Where |
|---|---|
| Admin and Customer users | `js/core/auth.js`, `js/core/db.js` (role field) |
| Admin login, admin adds admins | `login.html`, `admin-admins.html` |
| Customer register, login, logout with validation and clear errors | `register.html`, `login.html`, `js/core/validators.js` |
| Product: id, name, image, category, price, description, stock | `admin-products.html` |
| Admin CRUD on products and categories (with validation) | `admin-products.html`, `admin-categories.html` |
| Admin confirms / rejects orders, sees all orders | `admin-orders.html` |
| Customer: view products with filters | `shop.html` (search, category, price range, sort, pagination) |
| Wish list | `wishlist.html` (localStorage) |
| Shopping cart | `shop.html` (live +/- on each card), `cart.html` |
| Place order, pending until admin decides | `cart.html`, `admin-orders.html` |
| See previous orders | `orders.html` |
| localStorage as database, online fake API for seed data | `js/core/db.js` |
| Bonus: PayPal sandbox payment | `js/pages/cart.js`, `js/core/config.js` |
| Bonus: feedback and rating for products | `js/components/reviews.js` |
| Bonus: returning orders | `orders.html`, `admin-orders.html` |

## Business rules

- Each product card shows how many of that item are in the cart ("In cart: 2 of 5 available") and updates instantly.
- Stock is checked when adding to the cart, when changing quantity, when placing the order and again when the admin confirms.
- Stock goes down when the admin **confirms** an order. Rejecting does not change stock.
- A category that still has products cannot be deleted.
- Reviews: only customers with a **confirmed** order of that product can review it (one review per product, editable). Admin can delete reviews.
- Returns: a customer can request a return on a confirmed order within 14 days (`RETURN_WINDOW_DAYS` in `js/core/db.js`). When the admin approves, the items go back into stock.

## PayPal sandbox

`js/core/config.js` uses PayPal's public demo client id `test`. To use your own sandbox app:
developer.paypal.com > Apps & Credentials > Sandbox > create an app > copy the Client ID into `PAYPAL_CLIENT_ID`.
Pay with a sandbox buyer account (developer.paypal.com > Testing Tools > Sandbox Accounts).



## limits

- Everything is stored in each visitor's own browser, so every visitor has their own data.
- Passwords are stored as plain text and page protection is done in the browser. This is fine for a class project and not for a real shop (a real backend hashes passwords and checks permissions on the server).

## Upload to GitHub

```bash
git init
git add .
git commit -m "Nilo online store"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

For a live link: on GitHub open Settings > Pages > Source: Deploy from branch > main > Save, then open `index.html` on that site.
