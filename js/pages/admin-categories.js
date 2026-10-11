protectPage("admin");

const FIELDS = ["name", "description"];
let editingId = null;

function validateCategory(c, all, ignoreId) {
  const errors = {};

  if (!c.name) {
    errors.name = "Enter a category name.";
  } else if (c.name.length < 2 || c.name.length > 40) {
    errors.name = "Name must be between 2 and 40 characters.";
  } else if (all.some((x) => x.id !== ignoreId && x.name.toLowerCase() === c.name.toLowerCase())) {
    errors.name = `A category named "${c.name}" already exists.`;
  }

  if (c.description.length > 200) errors.description = "Description must be 200 characters or fewer.";
  return errors;
}

async function showCategories() {
  const categories = await getCategories();
  const products = await getProducts();

  document.getElementById("rows").innerHTML = categories.length
    ? categories
        .map((c) => {
          const count = products.filter((p) => p.categoryId === c.id).length;
          return `<tr>
            <td>${c.id}</td>
            <td><strong>${esc(c.name)}</strong></td>
            <td class="muted">${esc(c.description) || "-"}</td>
            <td class="num">${count}</td>
            <td class="row-actions">
              <button class="btn btn-sm" data-edit="${c.id}">Edit</button>
              <button class="btn btn-sm btn-danger" data-delete="${c.id}">Delete</button>
            </td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="5"><div class="empty">No categories yet.</div></td></tr>`;
}

function resetForm() {
  document.getElementById("category-form").reset();
  showFieldErrors(FIELDS, {});
  showMsg("error-form", "");
  document.getElementById("form-title").textContent = "Add category";
  document.getElementById("save-btn").textContent = "Save category";
  document.getElementById("cancel-btn").hidden = true;
  editingId = null;
}

async function startEdit(id) {
  const c = await getCategory(id);
  if (!c) return;
  document.getElementById("name").value = c.name;
  document.getElementById("description").value = c.description || "";
  document.getElementById("form-title").textContent = `Edit category #${c.id}`;
  document.getElementById("save-btn").textContent = "Update category";
  document.getElementById("cancel-btn").hidden = false;
  editingId = id;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function removeCategory(id) {
  showMsg("error-form", "");
  // A category that still has products must not be deleted.
  const used = (await getProducts()).filter((p) => p.categoryId === id);
  if (used.length) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return showMsg("error-form", `Can't delete: ${used.length} product(s) use this category. Move or delete them first.`);
  }
  const c = await getCategory(id);
  if (!confirm(`Delete the category "${c.name}"?`)) return;
  await deleteCategory(id);
  if (editingId === id) resetForm();
  toast("Category deleted.");
  showCategories();
}

document.getElementById("rows").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.edit) startEdit(Number(btn.dataset.edit));
  if (btn.dataset.delete) removeCategory(Number(btn.dataset.delete));
});

document.getElementById("category-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const category = {
    name: document.getElementById("name").value.trim(),
    description: document.getElementById("description").value.trim(),
  };

  const errors = validateCategory(category, await getCategories(), editingId);
  showFieldErrors(FIELDS, errors);
  if (Object.keys(errors).length) return;

  try {
    if (editingId) await updateCategory(editingId, category);
    else await addCategory(category);
  } catch (err) {
    return showMsg("error-form", err.message);
  }

  toast(editingId ? "Category updated." : "Category added.");
  resetForm();
  showCategories();
});

document.getElementById("cancel-btn").addEventListener("click", resetForm);
showCategories();
