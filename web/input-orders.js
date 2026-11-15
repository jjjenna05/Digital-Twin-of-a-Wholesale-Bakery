// DTWB-14: Input Orders
// enter tonight's orders, staff, equipment and stock, then save them with a
// name and description so they can be reused for simulations later.
// the data follows the same shape as data/scenario.sample.json

//saved inputs and the inputs being edited are kept in the browser for now
//(until flask has a route to save them)
const SAVED_KEY = "bakery.savedInputs";
const CURRENT_KEY = "bakery.currentInputs";

let config = null;      //bakery config from flask, used to fill the dropdowns
let inputs = null;      //tonight's inputs being edited
let savedInputs = [];   //list of {name, description, data}
let currentIndex = null; //index of the saved inputs the header dropdown shows

//helper to read/write browser storage without crashing if it is blocked
function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch (e) {
    return null;
  }
}
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    //storage blocked, keep working in memory
  }
}

//keep the edited inputs so a refresh doesnt lose them
function keepCurrent() {
  writeStorage(CURRENT_KEY, inputs);
}

//new empty inputs, every machine from the config starts at its usual quantity
function newInputs() {
  const equipment = [];
  for (let i = 0; i < config.equipment.length; i++) {
    equipment.push({
      name: config.equipment[i].name,
      count: config.equipment[i].quantity,
      from: "",
      to: "",
    });
  }
  return {
    name: "Tonight",
    startClock: "22:00",
    orders: [],
    staff: [],
    equipment: equipment,
    stock: [],
  };
}

//helper to show 24h time as 12h, "" stays ""
function showTime(text) {
  if (!text) {
    return "";
  }
  const parts = text.split(":");
  const hour = Number(parts[0]);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return hour12 + ":" + parts[1] + " " + suffix;
}

//helper to fill a <select> with names, first one is a placeholder
function fillSelect(select, names, placeholder) {
  select.replaceChildren();
  if (placeholder) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = placeholder;
    select.appendChild(option);
  }
  for (let i = 0; i < names.length; i++) {
    const option = document.createElement("option");
    option.value = names[i];
    option.textContent = names[i];
    select.appendChild(option);
  }
}

//helper to make one table row with text cells + edit/delete buttons
function makeRow(cells, onEdit, onDelete) {
  const row = document.createElement("tr");
  for (let i = 0; i < cells.length; i++) {
    const cell = document.createElement("td");
    //textContent since the user typed this
    cell.textContent = cells[i];
    row.appendChild(cell);
  }
  const buttonCell = document.createElement("td");
  buttonCell.className = "config-buttons";
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "row-edit";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", onEdit);
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "row-delete";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", onDelete);
  buttonCell.appendChild(editButton);
  buttonCell.appendChild(deleteButton);
  row.appendChild(buttonCell);
  return row;
}

//helper to show a grey "nothing yet" row
function emptyRow(body, columns, text) {
  const row = document.createElement("tr");
  row.className = "empty-row";
  const cell = document.createElement("td");
  cell.colSpan = columns;
  cell.textContent = text;
  row.appendChild(cell);
  body.appendChild(row);
}

//helper to clear every error in a form
function clearErrors(form) {
  const errors = form.querySelectorAll(".error");
  for (let i = 0; i < errors.length; i++) {
    errors[i].textContent = "";
  }
  const boxes = form.querySelectorAll(".error-box");
  for (let i = 0; i < boxes.length; i++) {
    boxes[i].classList.remove("error-box");
  }
}
//helper to show one error and mark the field red
function showError(errorId, field, message) {
  document.getElementById(errorId).textContent = message;
  if (field) {
    field.classList.add("error-box");
  }
}

//one delete dialog for every tab, onConfirm runs when Delete is clicked
const deleteDialog = document.getElementById("delete-dialog");
let deleteAction = null;
function openDeleteDialog(title, text, onConfirm) {
  document.getElementById("delete-dialog-header").textContent = title;
  document.getElementById("delete-dialog-text").textContent = text;
  deleteAction = onConfirm;
  deleteDialog.showModal();
}
document.getElementById("cancel-delete").addEventListener("click", function () {
  deleteDialog.close();
});
document.getElementById("confirm-delete").addEventListener("click", function () {
  deleteAction();
  keepCurrent();
  deleteDialog.close();
});

// ---------- start time ----------
const startClock = document.getElementById("start-clock");
startClock.addEventListener("change", function () {
  document.getElementById("start-clock-error").textContent = "";
  if (startClock.value === "") {
    document.getElementById("start-clock-error").textContent = "Pick a start time!";
    return;
  }
  inputs.startClock = startClock.value;
  keepCurrent();
});

// ---------- orders tab ----------
const ordersBody = document.getElementById("orders-row");
const orderDialog = document.getElementById("order-dialog");
const orderForm = document.getElementById("order-form");
let orderEditIndex = null;

function showOrders() {
  ordersBody.replaceChildren();
  if (inputs.orders.length === 0) {
    emptyRow(ordersBody, 5, "No orders yet. Click + Add Order to start.");
  }
  for (let i = 0; i < inputs.orders.length; i++) {
    const order = inputs.orders[i];
    ordersBody.appendChild(makeRow(
      [order.item, order.quantity + " " + order.unit, showTime(order.deadline), showTime(order.notBefore) || "Any time"],
      function () { openOrderDialog(i); },
      function () {
        openDeleteDialog("Delete " + order.item + " order?", "This will remove it from tonight's orders.", function () {
          inputs.orders.splice(i, 1);
          showOrders();
        });
      }
    ));
  }
}

function openOrderDialog(index) {
  orderEditIndex = index;
  orderForm.reset();
  clearErrors(orderForm);
  const fields = orderForm.elements;
  //item choices come from the recipes, units from the units tab
  fillSelect(fields.product, config.recipes.map(function (r) { return r.name; }), "Pick an item");
  fillSelect(fields.unit, config.units.map(function (u) { return u.unit; }));
  if (index === null) {
    document.getElementById("order-dialog-header").textContent = "Add Order";
    //most orders are in pieces, start there if the config has it
    if (config.units.some(function (u) { return u.unit === "Pieces"; })) {
      fields.unit.value = "Pieces";
    }
  } else {
    document.getElementById("order-dialog-header").textContent = "Edit Order";
    const order = inputs.orders[index];
    fields.product.value = order.item;
    fields.quantity.value = order.quantity;
    fields.unit.value = order.unit;
    fields.deadline.value = order.deadline;
    fields.notBefore.value = order.notBefore;
  }
  orderDialog.showModal();
}

document.getElementById("add-order").addEventListener("click", function () {
  openOrderDialog(null);
});
document.getElementById("cancel-order").addEventListener("click", function () {
  orderDialog.close();
});

orderForm.addEventListener("submit", function (event) {
  event.preventDefault();
  clearErrors(orderForm);
  const fields = orderForm.elements;
  let hasError = false;
  if (fields.product.value === "") {
    showError("order-item-error", fields.product, "Pick an item!");
    hasError = true;
  }
  if (fields.quantity.value === "" || Number(fields.quantity.value) < 1) {
    showError("order-quantity-error", fields.quantity, "Quantity must be at least 1!");
    hasError = true;
  }
  if (fields.deadline.value === "") {
    showError("order-deadline-error", fields.deadline, "Pick a deadline!");
    hasError = true;
  }
  if (hasError) {
    return;
  }
  const order = {
    item: fields.product.value,
    quantity: Number(fields.quantity.value),
    unit: fields.unit.value,
    deadline: fields.deadline.value,
    notBefore: fields.notBefore.value,
  };
  if (orderEditIndex === null) {
    inputs.orders.push(order);
  } else {
    inputs.orders[orderEditIndex] = order;
  }
  showOrders();
  keepCurrent();
  orderDialog.close();
});

// ---------- staff tab ----------
const staffBody = document.getElementById("staff-row");
const staffDialog = document.getElementById("staff-dialog");
const staffForm = document.getElementById("staff-form");
const breakRows = document.getElementById("break-rows");
let staffEditIndex = null;

function showStaff() {
  staffBody.replaceChildren();
  if (inputs.staff.length === 0) {
    emptyRow(staffBody, 6, "No staff yet. Click + Add Staff to start.");
  }
  for (let i = 0; i < inputs.staff.length; i++) {
    const person = inputs.staff[i];
    const breakText = [];
    for (let j = 0; j < person.breaks.length; j++) {
      breakText.push(person.breaks[j].minutes + " min at " + showTime(person.breaks[j].at));
    }
    staffBody.appendChild(makeRow(
      [person.role, person.count, showTime(person.shiftStart) + " - " + showTime(person.shiftEnd),
        breakText.join(", ") || "None", person.afterShift],
      function () { openStaffDialog(i); },
      function () {
        openDeleteDialog("Delete " + person.role + "?", "This will remove them from tonight's staff.", function () {
          inputs.staff.splice(i, 1);
          showStaff();
        });
      }
    ));
  }
}

//one break row: minutes + start time + remove button
function addBreakRow(minutes, at) {
  const row = document.createElement("div");
  row.className = "break-row";
  const minutesBox = document.createElement("input");
  minutesBox.type = "number";
  minutesBox.min = "1";
  minutesBox.placeholder = "Minutes";
  minutesBox.className = "break-minutes";
  minutesBox.value = minutes;
  const atBox = document.createElement("input");
  atBox.type = "time";
  atBox.className = "break-at";
  atBox.value = at;
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "row-remove";
  removeButton.textContent = "×";
  removeButton.setAttribute("aria-label", "Remove break");
  removeButton.addEventListener("click", function () {
    row.remove();
  });
  row.append(minutesBox, atBox, removeButton);
  breakRows.appendChild(row);
}
document.getElementById("add-break").addEventListener("click", function () {
  addBreakRow("", "");
});

function openStaffDialog(index) {
  staffEditIndex = index;
  staffForm.reset();
  clearErrors(staffForm);
  breakRows.replaceChildren();
  const fields = staffForm.elements;
  fillSelect(fields.role, config.roles.map(function (r) { return r.name; }), "Pick a role");
  if (index === null) {
    document.getElementById("staff-dialog-header").textContent = "Add Staff";
    fields.count.value = 1;
  } else {
    document.getElementById("staff-dialog-header").textContent = "Edit Staff";
    const person = inputs.staff[index];
    fields.role.value = person.role;
    fields.count.value = person.count;
    fields.shiftStart.value = person.shiftStart;
    fields.shiftEnd.value = person.shiftEnd;
    fields.afterShift.value = person.afterShift;
    for (let i = 0; i < person.breaks.length; i++) {
      addBreakRow(person.breaks[i].minutes, person.breaks[i].at);
    }
  }
  staffDialog.showModal();
}

document.getElementById("add-staff").addEventListener("click", function () {
  openStaffDialog(null);
});
document.getElementById("cancel-staff").addEventListener("click", function () {
  staffDialog.close();
});

staffForm.addEventListener("submit", function (event) {
  event.preventDefault();
  clearErrors(staffForm);
  const fields = staffForm.elements;
  let hasError = false;
  if (fields.role.value === "") {
    showError("staff-role-error", fields.role, "Pick a role!");
    hasError = true;
  }
  if (fields.count.value === "" || Number(fields.count.value) < 1) {
    showError("staff-count-error", fields.count, "Count must be at least 1!");
    hasError = true;
  }
  if (fields.shiftStart.value === "" || fields.shiftEnd.value === "") {
    showError("staff-shift-error", null, "Pick a shift start and end!");
    hasError = true;
  } else if (fields.shiftStart.value === fields.shiftEnd.value) {
    //the engine stops if start and end are the same
    showError("staff-shift-error", fields.shiftEnd, "Shift end must be different from shift start!");
    hasError = true;
  }
  //every break needs both minutes and a time
  const breaks = [];
  const rows = breakRows.querySelectorAll(".break-row");
  for (let i = 0; i < rows.length; i++) {
    const minutes = rows[i].querySelector(".break-minutes");
    const at = rows[i].querySelector(".break-at");
    if (minutes.value === "" || Number(minutes.value) < 1 || at.value === "") {
      showError("staff-breaks-error", minutes, "Each break needs minutes and a start time!");
      hasError = true;
      continue;
    }
    breaks.push({ minutes: Number(minutes.value), at: at.value });
  }
  if (hasError) {
    return;
  }
  const person = {
    role: fields.role.value,
    count: Number(fields.count.value),
    shiftStart: fields.shiftStart.value,
    shiftEnd: fields.shiftEnd.value,
    breaks: breaks,
    afterShift: fields.afterShift.value,
  };
  if (staffEditIndex === null) {
    inputs.staff.push(person);
  } else {
    inputs.staff[staffEditIndex] = person;
  }
  showStaff();
  keepCurrent();
  staffDialog.close();
});

// ---------- equipment tab ----------
const equipmentBody = document.getElementById("equipment-row");
const equipmentDialog = document.getElementById("equipment-dialog");
const equipmentForm = document.getElementById("equipment-form");
let equipmentEditIndex = null;

function showEquipment() {
  equipmentBody.replaceChildren();
  if (inputs.equipment.length === 0) {
    emptyRow(equipmentBody, 4, "No equipment yet. Click + Add Equipment to start.");
  }
  for (let i = 0; i < inputs.equipment.length; i++) {
    const machine = inputs.equipment[i];
    let available = "All night";
    if (machine.from || machine.to) {
      available = (showTime(machine.from) || "Start") + " - " + (showTime(machine.to) || "End");
    }
    equipmentBody.appendChild(makeRow(
      [machine.name, machine.count, available],
      function () { openEquipmentDialog(i); },
      function () {
        openDeleteDialog("Delete " + machine.name + "?", "It won't be used in tonight's simulation.", function () {
          inputs.equipment.splice(i, 1);
          showEquipment();
        });
      }
    ));
  }
}

function openEquipmentDialog(index) {
  equipmentEditIndex = index;
  equipmentForm.reset();
  clearErrors(equipmentForm);
  const fields = equipmentForm.elements;
  fillSelect(fields.name, config.equipment.map(function (e) { return e.name; }), "Pick equipment");
  if (index === null) {
    document.getElementById("equipment-dialog-header").textContent = "Add Equipment";
    fields.count.value = 1;
  } else {
    document.getElementById("equipment-dialog-header").textContent = "Edit Equipment";
    const machine = inputs.equipment[index];
    fields.name.value = machine.name;
    fields.count.value = machine.count;
    fields.from.value = machine.from;
    fields.to.value = machine.to;
  }
  equipmentDialog.showModal();
}

document.getElementById("add-equipment").addEventListener("click", function () {
  openEquipmentDialog(null);
});
document.getElementById("cancel-equipment").addEventListener("click", function () {
  equipmentDialog.close();
});

equipmentForm.addEventListener("submit", function (event) {
  event.preventDefault();
  clearErrors(equipmentForm);
  const fields = equipmentForm.elements;
  let hasError = false;
  if (fields.name.value === "") {
    showError("equipment-name-error", fields.name, "Pick equipment!");
    hasError = true;
  } else {
    //same machine cant be listed twice, the engine only reads the first one
    for (let i = 0; i < inputs.equipment.length; i++) {
      if (i !== equipmentEditIndex && inputs.equipment[i].name === fields.name.value) {
        showError("equipment-name-error", fields.name, "Already in the list, edit that row instead!");
        hasError = true;
      }
    }
  }
  if (fields.count.value === "" || Number(fields.count.value) < 0) {
    showError("equipment-count-error", fields.count, "Count can't be empty or negative!");
    hasError = true;
  }
  if (hasError) {
    return;
  }
  const machine = {
    name: fields.name.value,
    count: Number(fields.count.value),
    from: fields.from.value,
    to: fields.to.value,
  };
  if (equipmentEditIndex === null) {
    inputs.equipment.push(machine);
  } else {
    inputs.equipment[equipmentEditIndex] = machine;
  }
  showEquipment();
  keepCurrent();
  equipmentDialog.close();
});

// ---------- stock tab ----------
const stockBody = document.getElementById("stock-row");
const stockDialog = document.getElementById("stock-dialog");
const stockForm = document.getElementById("stock-form");
let stockEditIndex = null;

function showStock() {
  stockBody.replaceChildren();
  if (inputs.stock.length === 0) {
    emptyRow(stockBody, 4, "No stock left over. Click + Add Stock if there is.");
  }
  for (let i = 0; i < inputs.stock.length; i++) {
    const item = inputs.stock[i];
    stockBody.appendChild(makeRow(
      [item.item, item.amount + " " + item.unit, item.alreadyPast],
      function () { openStockDialog(i); },
      function () {
        openDeleteDialog("Delete " + item.item + " stock?", "This will remove it from tonight's stock.", function () {
          inputs.stock.splice(i, 1);
          showStock();
        });
      }
    ));
  }
}

//the "already past" choices are the steps of the picked recipe
function fillPastSteps(itemName) {
  const select = stockForm.elements.alreadyPast;
  const names = [];
  for (let i = 0; i < config.recipes.length; i++) {
    if (config.recipes[i].name === itemName) {
      for (let j = 0; j < config.recipes[i].steps.length; j++) {
        names.push(config.recipes[i].steps[j].step);
      }
    }
  }
  fillSelect(select, names, itemName ? "Pick a step" : "Pick an item first");
}
stockForm.elements.product.addEventListener("change", function () {
  fillPastSteps(stockForm.elements.product.value);
});

function openStockDialog(index) {
  stockEditIndex = index;
  stockForm.reset();
  clearErrors(stockForm);
  const fields = stockForm.elements;
  fillSelect(fields.product, config.recipes.map(function (r) { return r.name; }), "Pick an item");
  //batches plus the units from the config
  fillSelect(fields.unit, ["Batches"].concat(config.units.map(function (u) { return u.unit; })));
  fillPastSteps("");
  if (index === null) {
    document.getElementById("stock-dialog-header").textContent = "Add Stock";
  } else {
    document.getElementById("stock-dialog-header").textContent = "Edit Stock";
    const item = inputs.stock[index];
    fields.product.value = item.item;
    fillPastSteps(item.item);
    fields.amount.value = item.amount;
    fields.unit.value = item.unit;
    fields.alreadyPast.value = item.alreadyPast;
  }
  stockDialog.showModal();
}

document.getElementById("add-stock").addEventListener("click", function () {
  openStockDialog(null);
});
document.getElementById("cancel-stock").addEventListener("click", function () {
  stockDialog.close();
});

stockForm.addEventListener("submit", function (event) {
  event.preventDefault();
  clearErrors(stockForm);
  const fields = stockForm.elements;
  let hasError = false;
  if (fields.product.value === "") {
    showError("stock-item-error", fields.product, "Pick an item!");
    hasError = true;
  }
  if (fields.amount.value === "" || Number(fields.amount.value) < 1) {
    showError("stock-amount-error", fields.amount, "Amount must be at least 1!");
    hasError = true;
  }
  if (fields.alreadyPast.value === "") {
    showError("stock-past-error", fields.alreadyPast, "Pick the last step it finished!");
    hasError = true;
  }
  if (hasError) {
    return;
  }
  const item = {
    item: fields.product.value,
    amount: Number(fields.amount.value),
    unit: fields.unit.value,
    alreadyPast: fields.alreadyPast.value,
  };
  if (stockEditIndex === null) {
    inputs.stock.push(item);
  } else {
    inputs.stock[stockEditIndex] = item;
  }
  showStock();
  keepCurrent();
  stockDialog.close();
});

// ---------- saved inputs tab ----------
const savedBody = document.getElementById("saved-row");
const saveDialog = document.getElementById("save-inputs-dialog");
const saveForm = document.getElementById("save-inputs-form");
const saveButtonError = document.getElementById("save-inputs-button-error");
const inputsPick = document.getElementById("inputs-pick");
let saveEditIndex = null;

//build the saved table and the header dropdown
function showSaved() {
  savedBody.replaceChildren();
  //keep the placeholder option, remove the saved names
  while (inputsPick.options.length > 1) {
    inputsPick.remove(1);
  }
  if (savedInputs.length === 0) {
    emptyRow(savedBody, 3, "Nothing saved yet.");
  }
  for (let i = 0; i < savedInputs.length; i++) {
    const saved = savedInputs[i];
    savedBody.appendChild(makeRow(
      [saved.name, saved.description],
      function () { openSaveDialog(i); },
      function () {
        openDeleteDialog("Delete " + saved.name + "?", "This will remove the saved inputs!", function () {
          savedInputs.splice(i, 1);
          //keep the dropdown pointing at the same saved inputs after the indexes shift
          if (currentIndex === i) {
            currentIndex = null;
          } else if (currentIndex !== null && currentIndex > i) {
            currentIndex = currentIndex - 1;
          }
          writeStorage(SAVED_KEY, savedInputs);
          showSaved();
        });
      }
    ));
    const option = document.createElement("option");
    option.value = i;
    option.textContent = saved.name;
    inputsPick.appendChild(option);
  }
  inputsPick.value = currentIndex === null ? "" : currentIndex;
}

function openSaveDialog(index) {
  saveEditIndex = index;
  saveForm.reset();
  clearErrors(saveForm);
  if (index === null) {
    document.getElementById("save-inputs-dialog-header").textContent = "Save inputs";
  } else {
    document.getElementById("save-inputs-dialog-header").textContent = "Edit saved inputs";
    saveForm.elements.name.value = savedInputs[index].name;
    saveForm.elements.description.value = savedInputs[index].description;
  }
  saveDialog.showModal();
}

document.getElementById("save-inputs").addEventListener("click", function () {
  saveButtonError.textContent = "";
  if (inputs.orders.length === 0) {
    saveButtonError.textContent = "Add at least one order before saving!";
    return;
  }
  //same inputs as a saved one, no need to save it again
  for (let i = 0; i < savedInputs.length; i++) {
    const savedCopy = Object.assign({}, savedInputs[i].data, { name: inputs.name });
    if (JSON.stringify(savedCopy) === JSON.stringify(inputs)) {
      saveButtonError.textContent = "Already saved as " + savedInputs[i].name + "!";
      return;
    }
  }
  openSaveDialog(null);
});
document.getElementById("cancel-save-inputs").addEventListener("click", function () {
  saveDialog.close();
});

saveForm.addEventListener("submit", function (event) {
  event.preventDefault();
  clearErrors(saveForm);
  const nameBox = saveForm.elements.name;
  const name = nameBox.value.trim();
  const description = saveForm.elements.description.value.trim();
  if (name === "") {
    showError("save-inputs-error", nameBox, "Name something!");
    return;
  }
  //name cant be used by another saved inputs, ignore the one being edited
  for (let i = 0; i < savedInputs.length; i++) {
    if (i !== saveEditIndex && savedInputs[i].name.toLowerCase() === name.toLowerCase()) {
      showError("save-inputs-error", nameBox, "That name is already used!");
      return;
    }
  }
  if (saveEditIndex === null) {
    //later edits shouldnt change the saved one, use a copy
    const data = structuredClone(inputs);
    data.name = name;
    savedInputs.push({ name: name, description: description, data: data });
    currentIndex = savedInputs.length - 1;
  } else {
    //edit only changes the name and description, not the saved inputs
    savedInputs[saveEditIndex].name = name;
    savedInputs[saveEditIndex].description = description;
    savedInputs[saveEditIndex].data.name = name;
  }
  writeStorage(SAVED_KEY, savedInputs);
  showSaved();
  saveDialog.close();
});

//load saved inputs into every tab when picked from the header dropdown
inputsPick.addEventListener("change", function () {
  currentIndex = Number(inputsPick.value);
  saveButtonError.textContent = "";
  //edits made after loading shouldnt change the saved one, use a copy
  inputs = structuredClone(savedInputs[currentIndex].data);
  showAll();
  keepCurrent();
});

// ---------- tabs ----------
const tabButtons = document.querySelectorAll(".configTabs button");
const tabSections = document.querySelectorAll("main.config > section");
for (let i = 0; i < tabButtons.length; i++) {
  tabButtons[i].addEventListener("click", function () {
    for (let j = 0; j < tabSections.length; j++) {
      tabSections[j].hidden = true;
    }
    document.getElementById(tabButtons[i].dataset.tab).hidden = false;
    for (let j = 0; j < tabButtons.length; j++) {
      tabButtons[j].classList.remove("active");
    }
    tabButtons[i].classList.add("active");
  });
}

function showAll() {
  startClock.value = inputs.startClock;
  showOrders();
  showStaff();
  showEquipment();
  showStock();
}

//get the bakery config from flask, then fill the page
async function start() {
  const response = await fetch("/api/config");
  //if flask returns an error, go back to login page
  if (response.ok === false) {
    window.location.href = "login.html";
    return;
  }
  config = await response.json();
  savedInputs = readStorage(SAVED_KEY) || [];
  inputs = readStorage(CURRENT_KEY) || newInputs();
  showAll();
  showSaved();
}
start();
