import { createCell } from "./config.js";
const stepsListBody = document.getElementById("steps-row");
let config = null;

export function startStepsTab(data) {
  config = data;
  showSteps(config.steps);
}
//show the table
function showSteps(stepsList) {
  stepsListBody.replaceChildren();
  for (let i = 0; i < stepsList.length; i++) {
    //create row 
    const row = document.createElement("tr");
    //show both field
    createCell(row, stepsList[i].name);
    createCell(row, stepsList[i].kind);
    //for edit/delete button
    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.type = "button";
    editButton.className = "row-edit";
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.type = "button";
    deleteButton.className = "row-delete";
    editButton.addEventListener("click", function() {
      openEditDialog(i);
    });
    deleteButton.addEventListener("click", function() {
      openDeleteDialog(i);
    });
    //create td for both button
    const buttonCell = document.createElement("td");
    buttonCell.appendChild(editButton);
    buttonCell.appendChild(deleteButton);
    row.appendChild(buttonCell);
    stepsListBody.appendChild(row);
  }
}
const addButton = document.getElementById("add-steps");
const dialog = document.getElementById("steps-dialog");
const form = document.getElementById("steps-form");
const header = document.getElementById("steps-dialog-header");
const nameError = document.getElementById("steps-name-error");
const kindError = document.getElementById("steps-kind-error");
const nameHint = document.getElementById("steps-name-hint");
const kindHint = document.getElementById("steps-kind-hint");
const cancelButton = document.getElementById("cancel-steps");
const canStopField = document.getElementById("steps-can-stop-field");

let editIndex = null;

addButton.addEventListener("click", function () {
  clearError();
  editIndex = null;
  header.textContent = "Add Step";
  form.reset();
  canStopField.hidden = true;
  //remove disable on kind and hint when add
  form.elements.kind.disabled = false;
  kindHint.textContent = "";
  //remove disable on name and hint when add
  form.elements.name.disabled = false;
  nameHint.textContent = "";
  dialog.showModal();
});

cancelButton.addEventListener("click", function() {
  dialog.close();
});
//helper to show canStop field, only by hand and hands-on machine show it
function showCanStopField(kind) {
  if (kind === "By hand" || kind === "Hands-on machine") {
    canStopField.hidden = false;
  } else {
    canStopField.hidden = true;
  }
}
form.elements.kind.addEventListener("change", function() {
  const kind = form.elements.kind.value;
  //if form.kind change, show or hide canStop field
  showCanStopField(kind);
  //by hand default is yes, and hands-on is no, user can change
  if (kind === "By hand") {
    form.elements.canStop.value = "Yes";
  }
  if (kind === "Hands-on machine") {
    form.elements.canStop.value = "No";
  }
});
//helper to clear error message
function clearError() {
  nameError.textContent = "";
  kindError.textContent = "";
}

//save new steps
form.addEventListener("submit", function (event) {
  event.preventDefault();
  clearError();
  const fields = form.elements;
  let hasError = false;
  //name cant be blank
  if (fields.name.value.trim() === "") {
    nameError.textContent = "Name something!";
    hasError = true;
  }
  //kind cant be blank
  if (fields.kind.value === "") {
    kindError.textContent = "Choose one";
    hasError = true;
  }
  //user cant type step that already exist
  for (let i = 0; i < config.steps.length; i++){
    if (fields.name.value.trim().toLowerCase() === config.steps[i].name.trim().toLowerCase() && i !== editIndex) {
      nameError.textContent = "Give a different step name, this name already exists!";
      hasError = true;
    }
  }
  //return if has error
  if (hasError === true) {
    return;
  }
  //canStop is null for wait and machine kind
  let canStop = null;
  if (fields.kind.value === "By hand" || fields.kind.value === "Hands-on machine") {
    if (fields.canStop.value === "Yes") {
      //true is yes
      canStop = true;
    }
    else {
      //false is no
      canStop = false;
    }
  }
  //collect user input
  const newStep = {
    name: fields.name.value.trim(),
    kind: fields.kind.value,
    canStop: canStop,
  };
  //push to table
  if (editIndex === null) {
    config.steps.push(newStep);
  }
  else {
    config.steps[editIndex] = newStep;
  }
  //show updated list
  showSteps(config.steps);
  dialog.close();
});

//edit dialog
function openEditDialog(index) {
  editIndex = index;
  clearError();
  form.reset();
  header.textContent = "Edit Step";
  const currentStep = config.steps[index];
  const fields = form.elements;
  fields.name.value = currentStep.name;
  //user cant edit name while in use by others and show hint user why
  const usedBy = collectUsedBy(countUsedSteps(currentStep.name));
  if (usedBy !== "") {
    //disable name field
    fields.name.disabled = true;
    nameHint.textContent = `Edit is not allowed while ${currentStep.name} is used by ${usedBy}.`
  }
  else {
    fields.name.disabled = false;
    nameHint.textContent = "";
  }
  fields.kind.value = currentStep.kind;
  //user cant edit kind once saved and show hint user why
  fields.kind.disabled = true;
  kindHint.textContent = "You can't edit kind field once saved, make a new step instead.";

  //show or hide canstop field
  showCanStopField(currentStep.kind);
  //show current canStop value
  if (currentStep.canStop === true) {
    fields.canStop.value = "Yes";
  }
  else {
    fields.canStop.value = "No";
  }

  dialog.showModal();
}
//get the total number time this step is used in pages
function countUsedSteps(stepname) {
  let machines = 0;
  let roles = 0;
  let recipes = 0;
  //check in equipment
  for (let i = 0; i < config.equipment.length; i++) {
    if(config.equipment[i].canDo.includes(stepname)) {
      machines++;
    }
  }
  //check in roles
  for (let i = 0; i < config.roles.length; i++){
    if (config.roles[i].canDo.includes(stepname)) {
      roles++;
    }
  }
  for (let i = 0; i < config.recipes.length; i++){
    //count one recipe as one
    let usesStep = false;
    //check recipe's step 
    for (let j = 0; j < config.recipes[i].steps.length; j++) {
      if (config.recipes[i].steps[j].step === stepname) {
        usesStep = true;
      }
    }
    //only count as one
    if (usesStep === true) {
      recipes++;
    }
  }
  //return object
  return {
    machines: machines,
    roles: roles,
    recipes: recipes,
  };
}
//format count as 1 machine, 2 machines
function countFormat(count, usedBy) {
  if (count === 1) {
    return `${count} ${usedBy}`;
  }
  return `${count} ${usedBy}s`;
}
//collect and produce 1 machine, 2 recipes
function collectUsedBy(countStep) {
  let parts = [];
  if (countStep.machines > 0) {
    parts.push(countFormat(countStep.machines, "machine"));
  }
  if (countStep.roles > 0) {
    parts.push(countFormat(countStep.roles, "role"));
  }
  if (countStep.recipes > 0) {
    parts.push(countFormat(countStep.recipes, "recipe"));
  }
  //all push in parts and join
  return parts.join(", ");
}

const deleteDialog = document.getElementById("delete-steps-dialog");
const deleteDialogHeader = document.getElementById("delete-steps-dialog-header");
const cancelDeleteButton = document.getElementById("cancel-steps-delete");
const confirmDeleteButton = document.getElementById("confirm-steps-delete");
const stepsInUseDialog = document.getElementById("steps-in-use-dialog");
const stepsInUseHeader = document.getElementById("steps-in-use-header");
const stepsInUseText = document.getElementById("steps-in-use-text");
const closeStepsInUseButton = document.getElementById("close-steps-in-use");

//delete dialog
let deleteIndex = null;
function openDeleteDialog(index) {
  //current step name
  const stepName = config.steps[index].name;
  const usedBy = collectUsedBy(countUsedSteps(stepName));
  //if empty, proceed delete, if not, prevent delete
  if (usedBy !== "") {
    stepsInUseHeader.textContent = `${stepName} cannot be deleted!`;
    stepsInUseText.textContent = `Because ${stepName} is used by ${usedBy}. Remove ${stepName} from there first!`;
    stepsInUseDialog.showModal();
    return;
  }
  //delete current
  deleteIndex = index;
  deleteDialogHeader.textContent = `Delete ${stepName}?`;
  deleteDialog.showModal();
}
cancelDeleteButton.addEventListener("click", function() {
  deleteDialog.close();
});
confirmDeleteButton.addEventListener("click", function() {
  config.steps.splice(deleteIndex, 1);
  showSteps(config.steps);
  deleteDialog.close();
});
closeStepsInUseButton.addEventListener("click", function() {
  stepsInUseDialog.close();
});