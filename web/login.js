const form = document.querySelector("main.login form");
const errorEl = document.getElementById("loginError");

form.addEventListener("submit", async function (e) {
   e.preventDefault();
   errorEl.textContent = "";

   const userID = this.elements.userID.value.trim();
   if (!userID) {
      this.elements.userID.value = "";
      this.elements.userID.reportValidity();
      return;
   }

   // 1. Send the request. Only a real connection failure lands here.
   let res;
   try {
      res = await fetch("/api/login", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ userID })
      });
   } catch (err) {
      console.error("Network error:", err);
      errorEl.textContent = "Could not reach the server.";
      return;
   }

   // 2. Read the reply. The server answered, so this is never a connection problem.
   let data = null;
   try {
      data = await res.json();
   } catch (err) {
      console.error("Response was not JSON:", err);
   }

   // 3. Show the server's error message, or a generic fallback.
   if (!res.ok) {
      errorEl.textContent = data?.error?.message || "Login failed. Please try again.";
      return;
   }

   window.location.href = "dashboard.html";
});