// DTWB-137: Order entry. Add, edit and delete orders, then Next saves them and continues to the staffing section.

const STORAGE_KEY = "bakery.orders";

const sampleOrders = [
  { item: "Glazed Donuts", quantity: 200, recipe: "Donut dough", deadline: "05:00" },
  { item: "Conchas", quantity: 150, recipe: "Concha dough", deadline: "05:00" },
  { item: "Croissants", quantity: 100, recipe: "Croissant dough", deadline: "05:00" },
];

function loadOrders() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (e) {}
  return sampleOrders.slice();
}

function saveOrders(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
}

function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

let orders = loadOrders();
let editingIndex = null; 
let deletingIndex = null;

const rows = document.getElementById("rows");
const formDialog = document.getElementById("form-dialog");
const form = document.getElementById("entry-form");
const formError = document.getElementById("form-error");
const deleteDialog = document.getElementById("delete-dialog");

function cell(text, className) {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function render() {
  rows.innerHTML = "";
  orders.forEach((o, i) => {
    const tr = document.createElement("tr");
    tr.append(
      cell(o.item, "item"),
      cell(o.quantity),
      cell(o.recipe),
      cell(formatTime(o.deadline))
    );
    const actions = document.createElement("td");
    actions.className = "row-actions";
    actions.innerHTML = `<button class="link" data-edit="${i}">Edit</button>
                         <button class="link delete" data-delete="${i}">Delete</button>`;
    tr.append(actions);
    rows.append(tr);
  });
  document.getElementById("empty").classList.toggle("hidden", orders.length > 0);
}

function openForm(index) {
  editingIndex = index;
  form.reset();
  formError.classList.add("hidden");
  form.querySelectorAll("input").forEach((el) => el.classList.remove("invalid"));
  const editing = index !== null;
  document.getElementById("form-title").textContent = editing ? "Edit order" : "Add order";
  document.getElementById("form-submit").textContent = editing ? "Save" : "Add";
  if (editing) {
    const o = orders[index];
    form.item.value = o.item;
    form.quantity.value = o.quantity;
    form.recipe.value = o.recipe;
    form.deadline.value = o.deadline;
  }
  formDialog.classList.remove("hidden");
  form.item.focus();
}

function closeDialogs() {
  formDialog.classList.add("hidden");
  deleteDialog.classList.add("hidden");
}

// Returns the first error message, and marks the bad field in red
function validate() {
  form.querySelectorAll("input").forEach((el) => el.classList.remove("invalid"));
  const checks = [
    [form.item, form.item.value.trim() !== "", "Item is required"],
    [form.quantity, form.quantity.value !== "", "Quantity is required"],
    [form.quantity, Number(form.quantity.value) >= 1, "Quantity must be at least 1"],
    [form.recipe, form.recipe.value.trim() !== "", "Recipe is required"],
    [form.deadline, form.deadline.value !== "", "Deadline is required"],
  ];
  for (const [field, ok, message] of checks) {
    if (!ok) { field.classList.add("invalid"); return message; }
  }
  return null;
}

document.getElementById("add-btn").addEventListener("click", () => openForm(null));

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const error = validate();
  if (error) {
    formError.textContent = error;
    formError.classList.remove("hidden");
    return;
  }
  const entry = {
    item: form.item.value.trim(),
    quantity: Number(form.quantity.value),
    recipe: form.recipe.value.trim(),
    deadline: form.deadline.value,
  };
  if (editingIndex === null) orders.push(entry);
  else orders[editingIndex] = entry;
  render();
  closeDialogs();
});

rows.addEventListener("click", (e) => {
  const edit = e.target.dataset.edit;
  const del = e.target.dataset.delete;
  if (edit !== undefined) openForm(Number(edit));
  if (del !== undefined) {
    deletingIndex = Number(del);
    document.getElementById("delete-title").textContent =
      `Delete ${orders[deletingIndex].item} order?`;
    deleteDialog.classList.remove("hidden");
  }
});

document.getElementById("delete-confirm").addEventListener("click", () => {
  orders.splice(deletingIndex, 1);
  render();
  closeDialogs();
});

document.querySelectorAll("[data-close]").forEach((btn) =>
  btn.addEventListener("click", closeDialogs)
);

document.getElementById("next-btn").addEventListener("click", () => {
  const error = document.getElementById("next-error");
  if (orders.length === 0) { error.classList.remove("hidden"); return; }
  error.classList.add("hidden");
  saveOrders(orders);
  window.location.href = "staffing.html";
});

render();
