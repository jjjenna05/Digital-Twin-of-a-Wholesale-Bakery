// DTWB-62: Staffing. Add, edit and delete staff entries (role, count, shift,
// breaks), then Next saves them and continues to the equipment section.

const STORAGE_KEY = "bakery.staffing";

const sampleStaff = [
  { role: "Baker", count: 4, start: "22:00", end: "06:00", breaks: 30 },
  { role: "Fryer operator", count: 2, start: "23:00", end: "05:00", breaks: 15 },
  { role: "Packer", count: 3, start: "02:00", end: "06:00", breaks: 15 },
];

function loadStaff() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (e) { /* storage unavailable, fall back to samples */ }
  return sampleStaff.slice();
}

function saveStaff(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
}

function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

let staff = loadStaff();
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
  staff.forEach((s, i) => {
    const tr = document.createElement("tr");
    tr.append(
      cell(s.role, "item"),
      cell(s.count),
      cell(`${formatTime(s.start)} - ${formatTime(s.end)}`),
      cell(`${s.breaks} min`)
    );
    const actions = document.createElement("td");
    actions.className = "row-actions";
    actions.innerHTML = `<button class="link" data-edit="${i}">Edit</button>
                         <button class="link delete" data-delete="${i}">Delete</button>`;
    tr.append(actions);
    rows.append(tr);
  });
  document.getElementById("empty").classList.toggle("hidden", staff.length > 0);
}

function openForm(index) {
  editingIndex = index;
  form.reset();
  formError.classList.add("hidden");
  form.querySelectorAll("input").forEach((el) => el.classList.remove("invalid"));
  const editing = index !== null;
  document.getElementById("form-title").textContent = editing ? "Edit staff" : "Add staff";
  document.getElementById("form-submit").textContent = editing ? "Save" : "Add";
  if (editing) {
    const s = staff[index];
    form.role.value = s.role;
    form.count.value = s.count;
    form.start.value = s.start;
    form.end.value = s.end;
    form.breaks.value = s.breaks;
  }
  formDialog.classList.remove("hidden");
  form.role.focus();
}

function closeDialogs() {
  formDialog.classList.add("hidden");
  deleteDialog.classList.add("hidden");
}

function validate() {
  form.querySelectorAll("input").forEach((el) => el.classList.remove("invalid"));
  const checks = [
    [form.role, form.role.value.trim() !== "", "Role is required"],
    [form.count, form.count.value !== "", "Count is required"],
    [form.count, Number(form.count.value) >= 1, "Count must be at least 1"],
    [form.start, form.start.value !== "", "Shift start is required"],
    [form.end, form.end.value !== "", "Shift end is required"],
    [form.end, form.end.value !== form.start.value, "Shift end must be different from shift start"],
    [form.breaks, form.breaks.value !== "", "Breaks is required (use 0 for none)"],
    [form.breaks, Number(form.breaks.value) >= 0, "Breaks can't be negative"],
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
    role: form.role.value.trim(),
    count: Number(form.count.value),
    start: form.start.value,
    end: form.end.value,
    breaks: Number(form.breaks.value),
  };
  if (editingIndex === null) staff.push(entry);
  else staff[editingIndex] = entry;
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
      `Delete ${staff[deletingIndex].role}?`;
    deleteDialog.classList.remove("hidden");
  }
});

document.getElementById("delete-confirm").addEventListener("click", () => {
  staff.splice(deletingIndex, 1);
  render();
  closeDialogs();
});

document.querySelectorAll("[data-close]").forEach((btn) =>
  btn.addEventListener("click", closeDialogs)
);

document.getElementById("next-btn").addEventListener("click", () => {
  const error = document.getElementById("next-error");
  if (staff.length === 0) { error.classList.remove("hidden"); return; }
  error.classList.add("hidden");
  saveStaff(staff);
  window.location.href = "config.html"; // equipment section
});

render();
