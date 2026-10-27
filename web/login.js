document.querySelector("main.login form").addEventListener("submit", async function (e) {
   e.preventDefault();

   const errorEl = document.getElementById("loginError");
   errorEl.textContent = "";

   const userID = this.elements.userID.value.trim();
   if (!userID) {
      this.elements.userID.value = "";
      this.elements.userID.reportValidity();
      return;
   }

   try {
      const res = await fetch("/api/login", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ userID })
      });
      const data = await res.json();

      if (!res.ok) {
         errorEl.textContent = data.error.message;
         return;
      }

      sessionStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "dashboard.html";
   } catch (err) {
      errorEl.textContent = "Could not reach the server.";
   }
});