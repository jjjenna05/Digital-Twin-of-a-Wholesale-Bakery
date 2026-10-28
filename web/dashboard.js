async function init() {
   const res = await fetch("/api/me");
   if (!res.ok) {
      window.location.href = "login.html";
      return;
   }
   const data = await res.json();
   document.getElementById("userName").textContent = data.user.name;
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
   await fetch("/api/logout", { method: "POST" });
   window.location.href = "login.html";
});

init();