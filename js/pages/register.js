const FIELDS = ["name", "email", "password", "confirm"];

document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  showMsg("error-form", "");

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
    // Everyone who registers here is a customer. Only admins can make admins.
    await addUser({ name: data.name, email: data.email, password: data.password, role: "customer" });
  } catch (err) {
    return showMsg("error-form", err.message);
  }
  window.location.href = "login.html?registered=1";
});
