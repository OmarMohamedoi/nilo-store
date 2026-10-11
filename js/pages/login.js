// Already logged in? Go straight to your page.
(function () {
  try {
    const u = JSON.parse(localStorage.getItem("currentUser"));
    if (u && u.role) window.location.href = u.role === "admin" ? "admin-products.html" : "shop.html";
  } catch (e) {}
})();

if (new URLSearchParams(window.location.search).get("registered")) {
  showMsg("success-msg", "Account created. You can log in now.", true);
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  showMsg("error-form", "");

  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  const errors = {};
  if (!email) errors.email = "Enter your email.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email, like name@mail.com.";
  if (!password) errors.password = "Enter your password.";
  showFieldErrors(["email", "password"], errors);
  if (Object.keys(errors).length) return;

  const user = await findUser(email, password);
  if (!user) return showMsg("error-form", "Incorrect email or password.");

  // Save who is logged in (never save the password).
  localStorage.setItem(
    "currentUser",
    JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role })
  );
  window.location.href = user.role === "admin" ? "admin-products.html" : "shop.html";
});
