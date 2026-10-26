import { showAmount } from "./config.js";
import { createCell } from "./config.js";
import { convertUserInput } from "./config.js";
import { amountToText } from "./config.js";

const bodyList = document.getElementById("equipment-row");
let config = null;
//get data from config.js
export function startEquipmentTab(data) {
  config = data;
  showEquipment(config.equipment);
}
function showEquipment(equipmentList) {
  bodyList.replaceChildren();
  //fill all equipments with its data from config data
  for (let i = 0; i < equipmentList.length; i++) {
    const row = document.createElement("tr");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "row-edit";
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
    deleteButton.className = "row-delete";
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
    //update canDo everytime its ticked or untick
    checkbox.addEventListener("change", showCanDoSummary);
    label.appendChild(checkbox);
    label.append(" " + config.steps[i].name);
    box.appendChild(label);
  }
}

function fillUnitChoices() {
 const select = document.getElementById("equipment-unit");
  select.replaceChildren();

  //create dropdown for all units in config
  for (let i = 0; i < config.units.length; i++) {
    const dropdownOption = document.createElement("option");
    dropdownOption.value = config.units[i].unit;
    dropdownOption.textContent = config.units[i].unit;
    select.appendChild(dropdownOption);
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
  showCanDoSummary();
  canDoDropdown.open = false;
  equipmentDialog.showModal();
});

cancelButton.addEventListener("click", function () {
  equipmentDialog.close();
});

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
  //update canDo summary
  showCanDoSummary();
  canDoDropdown.open = false;
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
  deleteHeader.textContent = `Delete ${config.equipment[index].name}?`;
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

//can do dropdown
const canDoDropdown = document.getElementById("can-do-dropdown");
const canDoSummary = document.getElementById("can-do-summary");
//show the checked item as user check items
function showCanDoSummary() {
  const checkedName = [];
  const checkedItems = canDoDropdown.querySelectorAll("input[name='canDo']:checked");
  for (let i = 0; i < checkedItems.length; i++){
    checkedName.push(checkedItems[i].value);
  }
  canDoSummary.textContent = checkedName.join(", ");
}
//close list when user click anywhere outside
equipmentDialog.addEventListener("click", function(event) {
  if (canDoDropdown.contains(event.target) === false) {
    canDoDropdown.open = false;
  }
});