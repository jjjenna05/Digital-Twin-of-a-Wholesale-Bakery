const userNameText = document.getElementById("userName");
const logoutButton = document.getElementById("logoutBtn");

//get logged in user from flask, go to login page if not logged in
async function showUserName() {
  const response = await fetch("/api/me");
  if (response.ok === false) {
    window.location.href = "login.html";
    return;
  }
  const data = await response.json();
  userNameText.textContent = data.user.name;
}

//log out n go back to login page
logoutButton.addEventListener("click", async function () {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "login.html";
});

showUserName();