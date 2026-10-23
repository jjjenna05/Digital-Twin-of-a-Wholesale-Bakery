const bodyList = document.getElementById("equipment-row");
const unitsListBody = document.getElementById("units-row");
const rolesListBody = document.getElementById("roles-row");
const recipesListBody = document.getElementById("recipe-row");
const stepsListBody = document.getElementById("steps-row");
let config = null;
// helper function to fill the amount correctly. if user dont type, return None
function showAmount(value) {
    if (value.amount === null) {
      return "None";
    }
  return `${value.amount} ${value.unit}`;
}
//helper function to create and fill the cell from config data
function createCell(row, text) {
  const cell = document.createElement("td");
  //use textContent instead of innerHTML since user is filling the data
  cell.textContent = text;
  row.appendChild(cell);
}
function showEquipment(equipmentList) {
  bodyList.replaceChildren();
  //fill all equipments with its data from config data
  for (let i = 0; i < equipmentList.length; i++) {
    const row = document.createElement("tr");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    //fill all cells each equipment row
    createCell(row, equipmentList[i].name);
    createCell(row, equipmentList[i].canDo.join(", ")); 
    createCell(row, equipmentList[i].quantity);
    createCell(row, showAmount(equipmentList[i].capacity));
    createCell(row, equipmentList[i].loads);
    createCell(row, showAmount(equipmentList[i].switchTime));
    createCell(row, showAmount(equipmentList[i].warmUpTime));
    createCell(row, equipmentList[i].turnOn);
    //last cell is for buttons
    const buttonCell = document.createElement("td");
    editButton.addEventListener("click", function() {
      openEditDialog(i);
    });
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function() {
      openDeleteDialog(i);
    });
    buttonCell.appendChild(editButton);
    buttonCell.appendChild(deleteButton);
    row.appendChild(buttonCell);
    //add finished row to the table
    bodyList.appendChild(row);
  }
}
function showSteps(stepsList) {
  for (let i = 0; i < stepsList.length; i++) {
    const row = document.createElement("tr");
    createCell(row, stepsList[i].name);
    createCell(row, stepsList[i].kind);
    stepsListBody.appendChild(row);
  }
}
function showUnits(unitsList) {
  for (let i = 0; i < unitsList.length; i++) {
    const row = document.createElement("tr");
    createCell(row, unitsList[i].unit);
    createCell(row, `${unitsList[i].equals} ${unitsList[i].of}`);
    //no data yet
    createCell(row, "No limit");
    unitsListBody.appendChild(row);
  }
}
function showRoles(rolesList) {
  for (let i = 0; i < rolesList.length; i++) {
    const row = document.createElement("tr");
    createCell(row, rolesList[i].name);
    createCell(row, rolesList[i].canDo.join(", "));
    rolesListBody.appendChild(row);
  }
}
function showRecipes(recipesList) {
  for (let i = 0; i < recipesList.length; i++) {
    const row = document.createElement("tr");
    //display each recipe steps in correct format
    const stepNames = [];
    for (let j = 0; j < recipesList[i].steps.length; j++) {
      stepNames.push(recipesList[i].steps[j].step);
    }
    createCell(row, recipesList[i].name);
    createCell(row, stepNames.join(" > "));
    //no data yet
    createCell(row, "None");
    recipesListBody.appendChild(row);
  }
}

//load data from config.sample.json
async function loadConfig() {
  const response = await fetch("../data/config.sample.json");
  const configData = await response.json();
  showEquipment(configData.equipment);
  showSteps(configData.steps);
  showUnits(configData.units);
  showRoles(configData.roles);
  showRecipes(configData.recipes);

  config = configData;
}
loadConfig();

const tabButtons = document.querySelectorAll(".configTabs button");
const tabSections = document.querySelectorAll("main.config section");

//show relevant tab as the user click
function showTab(sectionID, userClickButton) {
  for (let i =0; i < tabSections.length; i++){
    tabSections[i].hidden = true;
  }
  document.getElementById(sectionID).hidden = false;

  for(let i = 0; i < tabButtons.length; i++) {
    tabButtons[i].classList.remove("active");
  }
  userClickButton.classList.add("active");
}
for(let i = 0; i <tabButtons.length; i++) {
  tabButtons[i].addEventListener("click", function () {
    showTab(tabButtons[i].dataset.tab, tabButtons[i]);
  });
}


//dropdown for canDo section of equipment dialog 
function fillCanDoBoxes() {
  const box = document.getElementById("can-do-boxes");
  //empty everytime function get called
  box.replaceChildren();
  for (let i = 0; i < config.steps.length; i++) {
    const kind = config.steps[i].kind;
    //only Machine and Hands-on machine has can-do step
    if (kind!== "Machine" && kind !== "Hands-on machine") {
      continue;
    }
    //make this format: <div><label><input type="checkbox" name="canDo" value="configstepdata">configstepdata</label></div>
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "canDo";
    checkbox.value = config.steps[i].name;
    label.appendChild(checkbox);
    label.append(" " + config.steps[i].name);
    box.appendChild(label);
  }
}

function fillUnitChoices() {
 const select = document.getElementById("equipment-unit");
  select.replaceChildren();
  //array to colect all units fron config
  const units = [];
  //get units from config.units
  for (let i = 0; i < config.units.length; i++){
    addUnit(units, config.units[i].unit);
    addUnit(units, config.units[i].of);
  }
  //get units from config.equipment.capacity unit
  for (let i = 0; i < config.equipment.length; i++){
    addUnit(units, config.equipment[i].capacity.unit);
  }
  //create dropdown
  for (let i = 0; i < units.length; i++) {
    const dropdownOption = document.createElement("option");
    dropdownOption.value = units[i];
    dropdownOption.textContent = units[i];
    select.appendChild(dropdownOption);
  }
}
function addUnit(units, name) {
  //add only if it isnt there yet
  if (!units.includes(name)) {
    //add to end of list
    units.push(name);
  }
}

const equipmentDialog = document.getElementById("equipment-dialog");
const addButton = document.getElementById("add-equipment");
const cancelButton = document.getElementById("cancel-equipment");
const nameError = document.getElementById("name-error");
const canDoError = document.getElementById("can-do-error");
const quantityError = document.getElementById("quantity-error");
const capacityAmountError = document.getElementById("capacity-amount-error");
const dialogHeader = document.getElementById("equipment-dialog-header");
const switchedByError = document.getElementById("switched-by-error");

let editIndex = null;
//helper function to clear errors for every new dialog open
function clearErrors() {
  nameError.textContent = "";
  canDoError.textContent = "";
  quantityError.textContent = "";
  capacityAmountError.textContent = "";
  switchedByError.textContent = "";
}

addButton.addEventListener("click", function () {
  editIndex = null;
  dialogHeader.textContent = "Add Equipment";
  equipmentForm.reset();
  clearErrors();
  fillCanDoBoxes();
  fillUnitChoices();
  equipmentDialog.showModal();
});

cancelButton.addEventListener("click", function () {
  equipmentDialog.close();
});
//helper function to convert user input to valid number
function convertUserInput(text) {
  if (text === "") {
    return null;
  }
    return Number(text);
  
}
//helper function to bring null back to ""
function amountToText(amount) {
  if (amount === null) {
    return "";
  }
  return amount;
}
//edit dialog
function openEditDialog(index) {
  dialogHeader.textContent = "Edit Equipment";
  //edit index to existing equipment
  editIndex = index;
  equipmentForm.reset();
  clearErrors();
  fillCanDoBoxes();
  fillUnitChoices();
  //point to the equipment that user click the edit button
  const equipment = config.equipment[index];
  const fields = equipmentForm.elements;
  //fill current equipment's data
  fields.name.value = equipment.name;
  fields.quantity.value = equipment.quantity;
  fields.capacityAmount.value = amountToText(equipment.capacity.amount);
  fields.capacityUnit.value = equipment.capacity.unit;
  fields.loads.value = equipment.loads;
  fields.switchTime.value = amountToText(equipment.switchTime.amount);
  fields.switchTimeUnit.value = equipment.switchTime.unit;
  fields.switchedBy.value = amountToText(equipment.switchedBy);
  fields.warmUpTime.value = amountToText(equipment.warmUpTime.amount);
  fields.warmUpTimeUnit.value = equipment.warmUpTime.unit;
  fields.turnOn.value = equipment.turnOn;
  //check the exsiting checkbox and show
  const boxes = equipmentForm.querySelectorAll('input[name="canDo"]');
  for (let i = 0; i < boxes.length; i++) {
    if (equipment.canDo.includes(boxes[i].value)) {
      boxes[i].checked = true;
    }
  }
  equipmentDialog.showModal();
}
//save new equipment
const equipmentForm = document.getElementById("equipment-form");
equipmentForm.addEventListener("submit", function (event) {
  event.preventDefault();
//remove last error message
  clearErrors();
 const fields = equipmentForm.elements;
 const userSelectedBoxes = equipmentForm.querySelectorAll('input[name="canDo"]:checked');
  const canDo = [];
  //get only userselected checkboxes
  for (let i = 0; i < userSelectedBoxes.length; i++) {
    canDo.push(userSelectedBoxes[i].value);
  }
  //error handle
  let hasError = false;
  if (fields.name.value.trim() === "") {
    nameError.textContent = "Name something";
    hasError = true;
  }
  if(userSelectedBoxes.length === 0) {
    canDoError.textContent = "Select at least one option";
    hasError = true;
  }
  if(fields.capacityAmount.value === "") {
    capacityAmountError.textContent = "This field can't be blank";
    hasError = true;
  }
  if (fields.quantity.value !== "" && Number(fields.quantity.value) < 1) {
    quantityError.textContent = "Quantity must be at least 1";
    hasError = true;
  }
  if(fields.switchedBy.value !== "" && Number(fields.switchedBy.value) < 0) {
    switchedByError.textContent = "must be 0 or more";
    hasError = true;
  }
  //if there is error, return 
  if (hasError) {
    return;
  }
  //if user didnt fill in quantity, default is 1
  let quantity = 1;
  if (fields.quantity.value !== "") {
    quantity = convertUserInput(fields.quantity.value);
  }
  //fill new equipment data
  const newEquipment = {
    name: fields.name.value.trim(),
    canDo: canDo,
    quantity: quantity,
    capacity: {
      amount: convertUserInput(fields.capacityAmount.value),
      unit: fields.capacityUnit.value,
    },
    loads: fields.loads.value,
    switchTime: {
      amount: convertUserInput(fields.switchTime.value),
      unit: fields.switchTimeUnit.value,
    },
    switchedBy: convertUserInput(fields.switchedBy.value),
    warmUpTime: {
      amount: convertUserInput(fields.warmUpTime.value),
      unit: fields.warmUpTimeUnit.value,
    },
    turnOn: fields.turnOn.value,
  };
  //push data to equipment list
  if (editIndex === null) {
    //add new equipment
    config.equipment.push(newEquipment);
  } else {
    //replace existing equipment with new data
    config.equipment[editIndex] = newEquipment;
  }
  //display updated equipment list
  showEquipment(config.equipment);
  equipmentDialog.close();
});

//delete dislog
const deleteDialog = document.getElementById("delete-dialog");
const deleteHeader = document.getElementById("delete-dialog-header");
const cancelDeleteButton = document.getElementById("cancel-delete");
const confirmDeleteButton = document.getElementById("confirm-delete");
let deleteIndex = null;
function openDeleteDialog(index) {
  deleteIndex = index;
  deleteHeader.textContent = `Delete ${config.equipment[index].name}`;
  deleteDialog.showModal();
}
cancelDeleteButton.addEventListener("click", function() {
  deleteDialog.close();
});
confirmDeleteButton.addEventListener("click", function () {
  //delete relevant equipment data
  config.equipment.splice(deleteIndex, 1);
  //show list with updated data
  showEquipment(config.equipment);
  deleteDialog.close();
});

