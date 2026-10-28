import { createCell } from "./config.js";
import { convertUserInput } from "./config.js";
import { amountToText } from "./config.js";

const unitsListBody = document.getElementById("units-row");
let config = null;
export function startUnitsTab(data) {
  config = data;
  showUnits(config.units);
}

function showUnits(unitsList) {
  unitsListBody.replaceChildren();
  for (let i = 0; i < unitsList.length; i++) {
    const row = document.createElement("tr");
    //define edit and delete buttons
    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.type = "button";
    editButton.className = "row-edit";

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.type = "button";
    deleteButton.className = "row-delete";
    //create three columns for each row, convert equalof and owned show relevant info based on condition
    createCell(row, unitsList[i].unit);
    if (unitsList[i].equals === null) {
      createCell(row, "Not applicable");
    } else {
      createCell(row, `${unitsList[i].equals} ${unitsList[i].of}`);
    }
    if (unitsList[i].owned === null) {
      createCell(row, "No Limit");
    } else {
      createCell(row, `${unitsList[i].owned} ${unitsList[i].unit}`);
    }
    //create add/edit button
    const buttonCell = document.createElement("td");
    editButton.addEventListener("click", function () {
      openEditDialog(i);
    });
    deleteButton.addEventListener("click", function () {
      openDeleteDialog(i);
    });
    buttonCell.appendChild(editButton);
    buttonCell.appendChild(deleteButton);
    row.appendChild(buttonCell);
    unitsListBody.appendChild(row);
  }
}
const addButton = document.getElementById("add-units");
const form = document.getElementById("units-form");
const dialog = document.getElementById("units-dialog");
const header = document.getElementById("units-dialog-header");
const nameError = document.getElementById("units-name-error");
const equalOfError = document.getElementById("units-equals-error");
const ownedError = document.getElementById("units-owned-error");
const cancelDialogButton = document.getElementById("cancel-units");
const deleteDialog = document.getElementById("delete-units-dialog");
const deleteDialogHeader = document.getElementById("delete-units-dialog-header");
const cancelDeleteButton = document.getElementById("cancel-units-delete");
const confirmDeleteButton = document.getElementById("confirm-units-delete");
const unitsInUseDialog = document.getElementById("units-in-use-dialog");
const unitsInUseHeader = document.getElementById("units-in-use-header");
const unitsInUseText = document.getElementById("units-in-use-text");
const closeUnitsInUseButton = document.getElementById("close-units-in-use");
const cantEditHint = document.getElementById("units-name-hint");

let editIndex = null;

function fillEqualChoice(current) {
  const box = document.getElementById("units-equalOf");
  box.replaceChildren();
  //add one extra option
  const option = document.createElement("option");
  option.value = "";
  option.textContent = "";
  box.appendChild(option);
  for (let i = 0; i < config.units.length; i++) {
    //unit cant equal itself so continue
    if (config.units[i].unit === current) {
      continue;
    }
    const option = document.createElement("option");
    option.value = config.units[i].unit;
    option.textContent = config.units[i].unit;
    box.appendChild(option);
  }
}
function clearError() {
  equalOfError.textContent = "";
  ownedError.textContent = "";
  nameError.textContent = "";
}

addButton.addEventListener("click", function() {
  editIndex = null;
  clearError();
  header.textContent = "Add Unit";
  form.reset();
  form.elements.unit.disabled = false;
  cantEditHint.textContent = "";
  fillEqualChoice("");
  dialog.showModal();
});
cancelDialogButton.addEventListener("click", function() {
  dialog.close();
});

//save new unit
form.addEventListener("submit", function(event) {
  event.preventDefault();
  clearError();
  const fields = form.elements;
  let hasError = false;
  if (fields.unit.value.trim() === "") {
    nameError.textContent = "Name something!";
    hasError = true;
  }
  //has error if user typed unit that already exists
  for (let i = 0; i < config.units.length; i++) {
    if (fields.unit.value.trim().toLowerCase() === config.units[i].unit.toLowerCase() && i !== editIndex) {
      nameError.textContent = "Unit already exists!";
      hasError = true;
    }
  }
  //first box cant be blank when second box is not blank, both box can be blank
  if (fields.equals.value !== "" && fields.equalOf.value === "") {
    equalOfError.textContent = "Please choose a unit on the right!";
    hasError = true;
  }
  //second box cant be blank when first box is not blank, both box can be blank
  if (fields.equals.value === "" && fields.equalOf.value !== "") {
    equalOfError.textContent = `Please type a value that equals to ${fields.equalOf.value}`;
    hasError = true;
  }
  if(fields.equals.value <= 0 && fields.equals.value !== "") {
    equalOfError.textContent = "Please type a valid number!";
    hasError = true;
  }
  if(fields.owned.value < 1 && fields.owned.value !== "") {
    ownedError.textContent = "This can't be less than 1!";
    hasError = true;
  }
  //if has error, return
  if (hasError) {
    return;
  }
  //collect user input
  const newUnit = {
    unit: fields.unit.value.trim(),
    //"" input should be converted to null
    equals: convertUserInput(fields.equals.value),
    of: fields.equalOf.value,
    owned: convertUserInput(fields.owned.value),
  };
  //push data to table if not edit, update if edit
  if(editIndex === null) {
    config.units.push(newUnit);
  } else {
    config.units[editIndex] = newUnit;
  }
  //show updated units list
  showUnits(config.units);
  dialog.close();
});

function openEditDialog(index) {
  editIndex = index;
  clearError();
  form.reset();
  header.textContent = "Edit Unit";
  const currentUnits = config.units[index];
  const fields = form.elements;
  //create dropdown
  fillEqualChoice(currentUnits.unit);  
  fields.unit.value = currentUnits.unit;
  //user cant edit while unit name is in use and show hint
  const usedBy = collectUsedBy(countUsedUnits(currentUnits.unit));
  if (usedBy !== "") {
    fields.unit.disabled = true;
    cantEditHint.textContent = `You can't edit this field because ${currentUnits.unit} is used by ${usedBy}.`;
  }
  else {
    fields.unit.disabled = false;
    cantEditHint.textContent = "";
  }
  fields.equals.value = amountToText(currentUnits.equals);
  fields.equalOf.value = currentUnits.of;
  fields.owned.value = amountToText(currentUnits.owned);
  dialog.showModal();
}
//get the total number where unit are used in machine, recipes, unit 
function countUsedUnits(unitName) {
  let machines = 0;
  let units = 0;
  let recipes = 0;
  for (let i = 0; i < config.equipment.length; i++) {
    if (config.equipment[i].capacity.unit === unitName) {
      machines++;
    }
  }
  for (let i = 0; i < config.units.length; i++){
    if(config.units[i].of === unitName) {
      units++;
    }
  }
  //recipe has unit in three differnet places so check all three
  for (let i = 0; i < config.recipes.length; i++){
  const recipe = config.recipes[i];
    let usesUnit = false;
    //check in capacity
  for (let j = 0; j < recipe.capacity.length; j++) {
    if (recipe.capacity[j].unit === unitName || recipe.capacity[j].of === unitName) {
      usesUnit = true;
    }
  }
    //check in madeFrom
  for (let j = 0; j < recipe.madeFrom.length; j++) {
    if (recipe.madeFrom[j].unit === unitName) {
      usesUnit = true;
    }
  }
    //check in steps
  for (let j = 0; j < recipe.steps.length; j++) {
    if (recipe.steps[j].per === unitName) {
      usesUnit = true;
    }
  }
    //count only once
  if (usesUnit) {
    recipes++;
    }
  }
  //return count number in one object
  return {
    machines: machines,
    units: units,
    recipes: recipes,
  }
}
//format count number as 1 machine, 2 machines
function countFormat(count, usedBy) {
  if (count === 1) {
    return `${count} ${usedBy}`
  }
  return `${count} ${usedBy}s`
}
//collect all usedBy and produce like 2 machines, 3 units
function collectUsedBy(countUnit) {
  let parts = [];
  if (countUnit.machines > 0) {
    parts.push(countFormat(countUnit.machines, "machine"));
  }
  if (countUnit.units > 0) {
    parts.push(countFormat(countUnit.units, "unit"));
  }
  if (countUnit.recipes > 0) {
    parts.push(countFormat(countUnit.recipes, "recipe"));
  }
  return parts.join(", ");
}

//delete dialog, block delete when the unit is in use
let deleteIndex = null;
function openDeleteDialog(index) {
  //get current unit name
  const unitName = config.units[index].unit;
  //get used by string
  const usedBy = collectUsedBy(countUsedUnits(unitName));
  //if empty, proceed delete, if not, show why
  if (usedBy !== "") {
    unitsInUseHeader.textContent = `Cannot delete ${unitName}`;
    unitsInUseText.textContent = `Because ${unitName} is used by ${usedBy}. Remove ${unitName} from there first!`;
    unitsInUseDialog.showModal();
    return;
  }
  deleteIndex = index;
  deleteDialogHeader.textContent = `Delete ${unitName}?`;
  deleteDialog.showModal();
}
cancelDeleteButton.addEventListener("click", function() {
  deleteDialog.close();
});
confirmDeleteButton.addEventListener("click", function () {
  //delete current unit data
  config.units.splice(deleteIndex, 1);
  //update table
  showUnits(config.units);
  deleteDialog.close();
});
closeUnitsInUseButton.addEventListener("click", function() {
  unitsInUseDialog.close();
});