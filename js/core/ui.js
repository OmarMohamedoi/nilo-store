/* ui.js - small helpers shared by every page. */

// Stops text typed by users from being treated as HTML.
function esc(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function money(n) {
  return "$" + Number(n).toFixed(2);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Shows (or clears) a message box: <p id="..." class="msg"></p>
function showMsg(id, text, ok = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || "";
  el.className = "msg" + (text ? (ok ? " ok" : " err") : "");
}

// A small popup in the corner that disappears by itself.
function toast(text, ok = true) {
  let box = document.getElementById("toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts";
    box.setAttribute("aria-live", "polite");
    document.body.appendChild(box);
  }
  const el = document.createElement("div");
  el.className = "toast" + (ok ? "" : " err");
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// Writes errors under each field: <small class="error" id="error-FIELD">
function showFieldErrors(fields, errors) {
  fields.forEach((f) => {
    const el = document.getElementById("error-" + f);
    if (el) el.textContent = errors[f] || "";
  });
}

function starsHtml(avg) {
  const full = Math.round(avg);
  return `<span class="stars" aria-label="${avg.toFixed(1)} out of 5">${"★".repeat(full)}<span class="off">${"★".repeat(5 - full)}</span></span>`;
}

function ratingHtml(r) {
  return r && r.count
    ? `${starsHtml(r.avg)} <small class="muted">${r.avg.toFixed(1)} (${r.count})</small>`
    : `<small class="muted">No reviews yet</small>`;
}

/* ---------- pagination ---------- */

function paginate(list, page, perPage) {
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  const current = Math.min(Math.max(1, page), pages);
  return { items: list.slice((current - 1) * perPage, current * perPage), page: current, pages };
}

function renderPager(id, page, pages, onGo) {
  const box = document.getElementById(id);
  if (!box) return;
  if (pages <= 1) { box.innerHTML = ""; return; }

  let html = `<button class="btn btn-sm" data-p="${page - 1}" ${page === 1 ? "disabled" : ""}>Previous</button>`;
  let last = 0;
  for (let n = 1; n <= pages; n++) {
    if (n !== 1 && n !== pages && Math.abs(n - page) > 1) continue;
    if (n - last > 1) html += `<span class="dots">...</span>`;
    html += `<button class="btn btn-sm ${n === page ? "btn-primary" : ""}" data-p="${n}">${n}</button>`;
    last = n;
  }
  html += `<button class="btn btn-sm" data-p="${page + 1}" ${page === pages ? "disabled" : ""}>Next</button>`;

  box.innerHTML = html;
  box.querySelectorAll("button[data-p]").forEach((b) =>
    b.addEventListener("click", () => onGo(Number(b.dataset.p)))
  );
}
