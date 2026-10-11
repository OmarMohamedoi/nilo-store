/**
 * reviews.js - the "Reviews" popup used by the shop, the orders page and the admin.
 * Needs ui.js, db.js and validators.js.
 *
 * openReviews(productId, viewer, onChange)
 *   viewer   = the logged-in user ({ id, name, role })
 *   onChange = called after a review is saved or deleted
 *   Customers see a form (only if they own a confirmed order with the product).
 *   Admins see a Delete button on each review.
 */
let reviewDialog = null;

function getReviewDialog() {
  if (!reviewDialog) {
    reviewDialog = document.createElement("dialog");
    reviewDialog.className = "modal";
    document.body.appendChild(reviewDialog);
    reviewDialog.addEventListener("click", (e) => {
      if (e.target === reviewDialog) reviewDialog.close();
    });
  }
  return reviewDialog;
}

async function openReviews(productId, viewer, onChange) {
  const dialog = getReviewDialog();
  const product = await getProduct(productId);
  if (!product) return;

  const reviews = (await getReviews(productId)).sort((a, b) => b.id - a.id);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const isCustomer = viewer.role === "customer";
  const isAdmin = viewer.role === "admin";
  const mine = isCustomer ? reviews.find((r) => r.userId === viewer.id) : null;
  const eligible = isCustomer && (await canReview(viewer.id, productId));

  const list = reviews.length
    ? reviews
        .map(
          (r) => `
        <div class="review">
          <div class="review-head">
            <span><strong>${esc(r.userName)}</strong> ${starsHtml(r.rating)}</span>
            <span class="muted">${formatDate(r.updatedAt || r.createdAt)}
              ${isAdmin ? `<button class="btn btn-danger btn-sm" data-del="${r.id}">Delete</button>` : ""}</span>
          </div>
          ${r.comment ? `<p>${esc(r.comment)}</p>` : ""}
        </div>`
        )
        .join("")
    : `<p class="muted">No reviews yet.</p>`;

  let form = "";
  if (isCustomer && eligible) {
    form = `
      <hr style="border:0;border-top:1px solid var(--line);margin:16px 0" />
      <h3>${mine ? "Edit your review" : "Write a review"}</h3>
      <form id="review-form" novalidate>
        <div class="field">
          <label for="rv-rating">Rating</label>
          <select id="rv-rating">
            <option value="">Choose a rating</option>
            ${[5, 4, 3, 2, 1].map((n) => `<option value="${n}" ${mine && mine.rating === n ? "selected" : ""}>${n} - ${["", "Poor", "Fair", "Good", "Very good", "Excellent"][n]}</option>`).join("")}
          </select>
          <small class="error" id="error-rating"></small>
        </div>
        <div class="field">
          <label for="rv-comment">Comment (optional)</label>
          <textarea id="rv-comment" maxlength="300">${mine ? esc(mine.comment) : ""}</textarea>
          <small class="error" id="error-comment"></small>
        </div>
        <p class="msg" id="review-message"></p>
        <button type="submit" class="btn btn-primary">${mine ? "Update review" : "Submit review"}</button>
      </form>`;
  } else if (isCustomer) {
    form = `<p class="note">You can review this product after one of your orders with it is confirmed.</p>`;
  }

  dialog.innerHTML = `
    <div class="modal-body">
      <div class="review-head"><h2>${esc(product.name)}</h2>
        <button class="btn btn-sm" data-close>Close</button></div>
      <p>${reviews.length ? `${starsHtml(avg)} <strong>${avg.toFixed(1)}</strong> <span class="muted">(${reviews.length} review${reviews.length > 1 ? "s" : ""})</span>` : ""}</p>
      ${list}
      ${form}
    </div>`;

  dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());

  dialog.querySelectorAll("[data-del]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this review?")) return;
      await deleteReview(btn.dataset.del);
      if (onChange) await onChange();
      openReviews(productId, viewer, onChange);
    })
  );

  const formEl = dialog.querySelector("#review-form");
  if (formEl) {
    formEl.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        rating: Number(document.getElementById("rv-rating").value) || 0,
        comment: document.getElementById("rv-comment").value.trim(),
      };
      const errors = validateReview(data);
      showFieldErrors(["rating", "comment"], errors);
      if (Object.keys(errors).length) return;

      const result = await saveReview(viewer, productId, data.rating, data.comment);
      if (!result.ok) return showMsg("review-message", result.message);
      if (onChange) await onChange();
      await openReviews(productId, viewer, onChange);
      showMsg("review-message", result.message, true);
    });
  }

  if (!dialog.open) dialog.showModal();
}
