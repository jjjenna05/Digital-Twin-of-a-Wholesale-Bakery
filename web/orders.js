// DTWB-77: sample orders loaded into the table
const orders = [
  { item: "Glazed Donuts", quantity: 200, recipe: "Donut dough", deadline: "05:00" },
  { item: "Conchas", quantity: 150, recipe: "Concha dough", deadline: "05:00" },
  { item: "Croissants", quantity: 100, recipe: "Croissant dough", deadline: "05:00" },
];

const tbody = document.getElementById("orders-body");

function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function renderOrders() {
  tbody.innerHTML = "";
  orders.forEach((o) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="item"></td>
      <td>${o.quantity}</td>
      <td></td>
      <td>${formatTime(o.deadline)}</td>
      <td class="row-actions"><a href="#">Edit</a> <a href="#" class="delete">Delete</a></td>
    `;
    // textContent keeps user-typed text from being treated as HTML
    row.children[0].textContent = o.item;
    row.children[2].textContent = o.recipe;
    tbody.appendChild(row);
  });
}

// DTWB-78
const dialog = document.getElementById("add-dialog");
const form = document.getElementById("add-form");

document.getElementById("add-btn").addEventListener("click", () => {
  form.reset();
  dialog.classList.remove("hidden");
});

document.getElementById("cancel-btn").addEventListener("click", () => {
  dialog.classList.add("hidden");
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(form);
  orders.push({
    item: data.get("item").trim(),
    quantity: Number(data.get("quantity")),
    recipe: data.get("recipe").trim(),
    deadline: data.get("deadline"),
  });
  renderOrders();
  dialog.classList.add("hidden");
});

renderOrders();
