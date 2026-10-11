protectPage("admin");

const FIELDS = ["name", "email", "password", "confirm"];

async function showAdmins() {
  const admins = (await getUsers()).filter((u) => u.role === "admin");
  document.getElementById("rows").innerHTML = admins
    .map((a) => `<tr><td>${a.id}</td><td><strong>${esc(a.name)}</strong></td><td>${esc(a.email)}</td></tr>`)
    .join("");
}

document.getElementById("admin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  showMsg("form-msg", "");

  const data = {
    name: document.getElementById("name").value.trim().replace(/\s+/g, " "),
    email: document.getElementById("email").value.trim().toLowerCase(),
    password: document.getElementById("password").value,
    confirm: document.getElementById("confirm").value,
  };

  const taken = data.email ? await emailExists(data.email) : false;
  const errors = validateRegistration(data, taken);
  showFieldErrors(FIELDS, errors);
  if (Object.keys(errors).length) return;

  try {
    await addUser({ name: data.name, email: data.email, password: data.password, role: "admin" });
  } catch (err) {
    return showMsg("form-msg", err.message);
  }

  e.target.reset();
  showMsg("form-msg", "Admin added.", true);
  showAdmins();
});

showAdmins();
