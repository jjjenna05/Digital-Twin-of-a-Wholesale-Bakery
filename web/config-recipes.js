import { createCell } from "./config.js";

const recipesListBody = document.getElementById("recipe-row");
let config = null;

export function startRecipesTab(data) {
  config = data;
  showRecipes(config.recipes);
}

function showRecipes(recipesList) {
  recipesListBody.replaceChildren();
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
    //edit/delete buttons
    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.type = "button";
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.type = "button";
    editButton.className = "row-edit";
    deleteButton.className = "row-delete";
    //edit opens the dialog for this recipe
    editButton.addEventListener("click", function () {
      openEditDialog(i);
    });
    //delete removes this recipe and shows the list again
    deleteButton.addEventListener("click", function () {
      config.recipes.splice(i, 1);
      showRecipes(config.recipes);
    });
    //create cell for both buttons
    const buttonCell = document.createElement("td");
    buttonCell.appendChild(editButton);
    buttonCell.appendChild(deleteButton);
    //put cell in row
    row.appendChild(buttonCell);
    //show the table
    recipesListBody.appendChild(row);
  }
}

const addButton = document.getElementById("add-recipes");
const dialog = document.getElementById("recipes-dialog");
const form = document.getElementById("recipes-form");
const header = document.getElementById("recipes-dialog-header");
const cancelButton = document.getElementById("cancel-recipes");

function fillBatchUnits() {
  const box = document.getElementById("recipes-batch-unit");
  box.replaceChildren();
  //blank option on top first
  const blankBox = document.createElement("option");
  blankBox.textContent = "";
  blankBox.value = "";
  box.appendChild(blankBox);

  for (let i = 0; i < config.units.length; i++){
    const option = document.createElement("option");
    //get all units from config and create each option
    option.value = config.units[i].unit;
    option.textContent = config.units[i].unit;
    box.appendChild(option);
  }
}
const nameError = document.getElementById("recipes-name-error");
const madeFromError = document.getElementById("recipes-made-from-error");
const stepsError = document.getElementById("recipes-steps-error");
const capacityError = document.getElementById("recipes-capacity-error");

let editIndex = null;
addButton.addEventListener("click", function () {
  clearError();
  editIndex = null;
  header.textContent = "Add Recipe";
  form.reset();

  madeFromRows.replaceChildren();
  capacityRows.replaceChildren();
  //clear and start with one
  stepRows.replaceChildren();
  addStepRow();
  dialog.showModal();
});
//open the dialog to edit a recipe, only the name for now, will finish in next task
function openEditDialog(index) {
  clearError();
  editIndex = index;
  header.textContent = "Edit Recipe";
  form.reset();
  madeFromRows.replaceChildren();
  capacityRows.replaceChildren();
  stepRows.replaceChildren();
  addStepRow();
  form.elements.name.value = config.recipes[index].name;
  dialog.showModal();
}
cancelButton.addEventListener("click", function() {
  dialog.close();
});

const stepRows = document.getElementById("recipes-step-rows");
const addStepButton = document.getElementById("recipes-add-step");
const madeFromRows = document.getElementById("recipes-made-from-rows");
const addMadeFromButton = document.getElementById("recipes-add-made-from");
//helper to create select dropdown
function makeSelectDropdown(className, choices) {
  const box = document.createElement("select");
  //create class name
  box.className = className;
  for (let i = 0; i < choices.length; i++) {
    const option = document.createElement("option");
    //each index became a choice
    option.value = choices[i];
    option.textContent = choices[i];
    box.appendChild(option);
  }
  return box;
}
//helper to create number box
function makeNumberBox(className, placeholder) {
  //<input type="number" class="max-wait" placeholder="No limit">
  const box = document.createElement("input");
  box.type = "number";
  box.className = className;
  box.placeholder = placeholder;
  //minimum is 0
  box.min = "0";
  //allow decimal values
  box.step = "any";
  return box;
}

//helper to make cell with a time number box
function addTimeCell(row, className, placeholder) {
  const cell = document.createElement("td");
  const pair = document.createElement("span");
  pair.className = "cell-pair";
  //numberbox
  pair.appendChild(makeNumberBox(className, placeholder));
  //time unit dropdown
  const unit = makeSelectDropdown(className + "-unit", ["hr", "min", "sec"]);
  //min is default
  unit.value = "min";
  pair.appendChild(unit);
  cell.appendChild(pair);
  row.appendChild(cell);
}

//create new step row
function addStepRow() {
  const row = document.createElement("tr");

  row.className = "step-row";
  const stepName = [""];
  //get all steps name from config of steps
  for (let i = 0; i < config.steps.length; i++){
    stepName.push(config.steps[i].name);
  }
  const stepCell = document.createElement("td");
  //row-step as classname, dropdown for step field
  const stepBox = makeSelectDropdown("row-step", stepName);
  //update everytime stepBox changes
  stepBox.addEventListener("change", function () {
    //machine rows are for old steps
    removeMachineRows(row);
    refreshStepRows();
  });
  stepCell.appendChild(stepBox);
  row.appendChild(stepCell);
  //machine and staff time field with time dropdown
  addTimeCell(row, "machine-time", "");
  addTimeCell(row, "staff-time", "");
  //make cell for two worker box
  const workerCell = document.createElement("td");
  const workerPair = document.createElement("span");
  workerPair.className = "cell-pair";
  //first box
  workerPair.appendChild(makeNumberBox("workers", "1"));
  //second box
  workerPair.appendChild(makeNumberBox("workers-up-to", "1"));
  workerCell.appendChild(workerPair);
  row.appendChild(workerCell);

  //wait time field with time dropdown
  addTimeCell(row, "wait-time", "");
  //per unit dropdown
  const perBox = document.createElement("select");
  perBox.className = "per-box";
  //default is per load
   const perLoad = document.createElement("option");
  perLoad.value = "load";
  perLoad.textContent = "per load";
  perBox.appendChild(perLoad);
  //get unit from config and creeate option
  for (let i = 0; i < config.units.length; i++){
    const option = document.createElement("option");
    option.value = config.units[i].unit;
    option.textContent = "per " + config.units[i].unit;
    perBox.appendChild(option);
  }
  //add in td and tr
  const perCell = document.createElement("td");
  perCell.appendChild(perBox);
  row.appendChild(perCell);

  //create time box and dropdown for max waitn and inside
  addTimeCell(row, "max-wait", "No limit");
  addTimeCell(row, "inside", "No limit");

  //remove button x
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "row-remove";
  removeButton.textContent = "x";
  removeButton.addEventListener("click", function () {
    //include its machine rows too
    removeMachineRows(row);
    row.remove();
    //refresh
    refreshStepRows();
  });
  //create add machine button +
  const addMachineButton = document.createElement("button");
  addMachineButton.type = "button";
  addMachineButton.className = "row-add-machine";
  addMachineButton.textContent = "+";
  addMachineButton.addEventListener("click", function () {
    addMachineRow(row);
  });
  
  const buttonCell = document.createElement("td");
  //add and remove button as last td
  buttonCell.appendChild(addMachineButton);
  buttonCell.appendChild(removeButton);
  row.appendChild(buttonCell);

  stepRows.appendChild(row);
  //update
  refreshStepRows();
}

addStepButton.addEventListener("click", function () {
  addStepRow();
});

//get kind type of the step
function findKind(stepName) {
  for (let i = 0; i < config.steps.length; i++) {
    if (config.steps[i].name === stepName) {
      return config.steps[i].kind;
    }
  }
  //return blank when stepname is not chosen
  return "";
}
//helper to show or hid cell
function showBoxCell(row, className, show) {
  const cell = row.querySelector("." + className).closest("td");
  if (show) {
    cell.style.visibility = "visible";
  } else {
    cell.style.visibility = "hidden";
  }
}
//refresh
function refreshStepRows() {
  const rows = stepRows.querySelectorAll(".step-row");
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    //get kind of step name
    const kind = findKind(row.querySelector(".row-step").value);
    const upTo = row.querySelector(".workers-up-to");
    const addMachine = row.querySelector(".row-add-machine");

    //all boxes hidden first
    showBoxCell(row, "machine-time", false);
    showBoxCell(row, "staff-time", false);
    showBoxCell(row, "workers", false);
    showBoxCell(row, "wait-time", false);
    showBoxCell(row, "per-box", false);
    showBoxCell(row, "max-wait", false);
    showBoxCell(row, "inside", false);
    upTo.style.visibility = "hidden";
    addMachine.style.visibility = "hidden";

    //show the boxes based on kind
    if (kind === "Machine") {
      showBoxCell(row, "machine-time", true);
      showBoxCell(row, "staff-time", true);
      showBoxCell(row, "workers", true);
      showBoxCell(row, "inside", true);
      upTo.style.visibility = "visible";
      addMachine.style.visibility = "visible";
    } else if (kind === "Hands-on machine") {
      showBoxCell(row, "machine-time", true);
      showBoxCell(row, "workers", true);
      addMachine.style.visibility = "visible";
    } else if (kind === "By hand") {
      showBoxCell(row, "staff-time", true);
      showBoxCell(row, "workers", true);
      upTo.style.visibility = "visible";
    } else if (kind === "Wait") {
      showBoxCell(row, "wait-time", true);
    }

    //per box field is always shown if step is chosen
    if (kind !== "") {
      showBoxCell(row, "per-box", true);
      //last step doesnt need max wait field because its last
      if (i < rows.length - 1) {
        showBoxCell(row, "max-wait", true);
      }
    }
  }
  //refresh madefrom
  refreshMadeFromSteps();
}
//create machine row under a step row
function addMachineRow(stepRow) {
  const row = document.createElement("tr");
  row.className = "machine-row";
  //only get machines that can do this step
  const stepName = stepRow.querySelector(".row-step").value;
  const machineNames = [];
  //collect all machine that can do this step
  for (let i = 0; i < config.equipment.length; i++) {
    if (config.equipment[i].canDo.includes(stepName)) {
      machineNames.push(config.equipment[i].name);
    }
  }
  const machineCell = document.createElement("td");
  machineCell.appendChild(makeSelectDropdown("row-machine", machineNames));
  row.appendChild(machineCell);
  //create field for machine time
  addTimeCell(row, "row-machine-time", "");
  //make 6 empty cells in between so x in last column
  for (let i = 0; i < 6; i++) {
    row.appendChild(document.createElement("td"));
  }
  //make remove button x for machine row
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "row-remove";
  removeButton.textContent = "x";
  removeButton.addEventListener("click", function () {
    row.remove();
  });
  const buttonCell = document.createElement("td");
  buttonCell.appendChild(removeButton);
  row.appendChild(buttonCell);
  //put it under the step row, after the machine rows it already has
  let lastRow = stepRow;
  while (lastRow.nextElementSibling !== null && lastRow.nextElementSibling.className === "machine-row") {
    lastRow = lastRow.nextElementSibling;
  }
  lastRow.after(row);
}
//remove  machine rows under a step row
function removeMachineRows(stepRow) {
  while (stepRow.nextElementSibling !== null && stepRow.nextElementSibling.className === "machine-row") {
    stepRow.nextElementSibling.remove();
  }
}
//create made from row: [item] [amount] [unit] before [step] x
function addMadeFromRow() {
  const row = document.createElement("div");
  row.className = "made-from-row";
  //item dropdown, blank first and then every recipe
  const itemNames = [""];
  for (let i = 0; i < config.recipes.length; i++) {
    itemNames.push(config.recipes[i].name);
  }
  row.appendChild(makeSelectDropdown("made-from-item", itemNames));
  //how much of it one batch takes
  row.appendChild(makeNumberBox("made-from-amount", ""));
  //unit dropdown, every unit first, then Batches
  const unitNames = [];
  for (let i = 0; i < config.units.length; i++) {
    unitNames.push(config.units[i].unit);
  }
  //batches is hardcoded by design
  unitNames.push("Batches");
  row.appendChild(makeSelectDropdown("made-from-unit", unitNames));
  //before which step
  const beforeText = document.createElement("span");
  //label
  beforeText.textContent = "before";
  row.appendChild(beforeText);
  const stepBox = document.createElement("select");
  stepBox.className = "made-from-step";
  row.appendChild(stepBox);
  //remove button x
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "row-remove";
  removeButton.textContent = "x";
  removeButton.addEventListener("click", function () {
    row.remove();
  });
  row.appendChild(removeButton);

  madeFromRows.appendChild(row);
  //fill step dropdown
  refreshMadeFromSteps();
}
addMadeFromButton.addEventListener("click", function () {
  addMadeFromRow();
});

//fill every before dropdown with the steps from steps rows
function refreshMadeFromSteps() {
  //collect the chosen steps
  const stepNames = [];
  const rows = stepRows.querySelectorAll(".step-row");
  for (let i = 0; i < rows.length; i++) {
    const name = rows[i].querySelector(".row-step").value;
    if (name !== "") {
      stepNames.push(name);
    }
  }
  const stepBoxes = madeFromRows.querySelectorAll(".made-from-step");
  for (let i = 0; i < stepBoxes.length; i++) {
    const box = stepBoxes[i];
    //save choice first before being rebuilt
    const chosen = box.value;
    box.replaceChildren();
    //blank means the first step
    const firstStep = document.createElement("option");
    firstStep.value = "";
    firstStep.textContent = "First step";
    box.appendChild(firstStep);
    for (let j = 0; j < stepNames.length; j++) {
      const option = document.createElement("option");
      option.value = stepNames[j];
      option.textContent = stepNames[j];
      box.appendChild(option);
    }
    //put back choice if  step is still in the recipe
    if (stepNames.includes(chosen)) {
      box.value = chosen;
    }
  }
}

const capacityRows = document.getElementById("recipes-capacity-rows");
const addCapacityButton = document.getElementById("recipes-add-capacity");

//capacity row, 1 [unit] = [amount] [this item or unit] x
function addCapacityRow() {
  const row = document.createElement("div");
  row.className = "capacity-row";
  const oneText = document.createElement("span");
  //always equal with 1
  oneText.textContent = "1";
  row.appendChild(oneText);
  //left dropdown,
  const unitNames = [""];
  for (let i = 0; i < config.units.length; i++) {
    //exclude Pieces from unit and push others, Pieces is hardcoded by design
    if (config.units[i].unit !== "Pieces") {
      unitNames.push(config.units[i].unit);
    }
  }
  //add Batches to unit manually, Batches is another hardcoded unit
  unitNames.push("Batches");
  //build left dropdown
  row.appendChild(makeSelectDropdown("capacity-unit", unitNames));
  const equalsText = document.createElement("span");
  equalsText.textContent = "=";
  row.appendChild(equalsText);
  //number box
  row.appendChild(makeNumberBox("capacity-amount", ""));
  //right dropdown
  const ofBox = document.createElement("select");
  ofBox.className = "capacity-of";
  const itemOption = document.createElement("option");
  //1 recipe item is 1 pieces internally, use see it as recipe name
  itemOption.value = "Pieces";
  itemOption.className = "item-option";
  ofBox.appendChild(itemOption);
  for (let i = 0; i < config.units.length; i++) {
    //push everything except pieces
    if (config.units[i].unit !== "Pieces") {
      const option = document.createElement("option");
      option.value = config.units[i].unit;
      option.textContent = config.units[i].unit;
      ofBox.appendChild(option);
    }
  }
  row.appendChild(ofBox);
  //remove button x
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "row-remove";
  removeButton.textContent = "x";
  removeButton.addEventListener("click", function () {
    row.remove();
  });
  row.appendChild(removeButton);
  capacityRows.appendChild(row);
  refreshItemName();
}
addCapacityButton.addEventListener("click", function () {
  addCapacityRow();
});
//the item choice in capacity rows is the item name
function refreshItemName() {
  let name = form.elements.name.value;
  //if nothing typed yet, show pieces default
  if (name === "") {
    name = "Pieces";
  }
  const itemOptions = capacityRows.querySelectorAll(".item-option");
  for (let i = 0; i < itemOptions.length; i++) {
    itemOptions[i].textContent = name;
  }
}
//update the capacity rows everytimeletter typed in Item name
form.elements.name.addEventListener("input", function () {
  refreshItemName();
});

//helper to clear error messages n red box
function clearError() {
  nameError.textContent = "";
  madeFromError.textContent = "";
  stepsError.textContent = "";
  capacityError.textContent = "";
  const redBoxes = form.querySelectorAll(".error-box");
  for (let i = 0; i < redBoxes.length; i++) {
    redBoxes[i].classList.remove("error-box");
  }
}

//helper to show  message under  section and make the box red
function showError(errorLine, message, box) {
  //keep the first message of the section
  if (errorLine.textContent === "") {
    errorLine.textContent = message;
  }
  box.classList.add("error-box");
}
//item name cant be blank or is existing
function checkName() {
  let hasError = false;
  const nameBox = form.elements.name;
  const name = nameBox.value.trim();
  //name cant be blank
  if (name === "") {
    showError(nameError, "Name something!", nameBox);
    hasError = true;
  }
  //same name cant be saved
  for (let i = 0; i < config.recipes.length; i++) {
    if (name.toLowerCase() === config.recipes[i].name.trim().toLowerCase() && i !== editIndex) {
      showError(nameError, "Give a different name, this name already exists!", nameBox);
      hasError = true;
    }
  }
  return hasError;
}

//every step row needs a step, n  time box its kind shows
function checkStepRows() {
  let hasError = false;
  const rows = stepRows.querySelectorAll(".step-row");
  //recipe should have at least one step
  if (rows.length === 0) {
    stepsError.textContent = "Add at least one step";
    hasError = true;
  }
  for (let i = 0; i < rows.length; i++) {
    const stepBox = rows[i].querySelector(".row-step");
    const machineTime = rows[i].querySelector(".machine-time");
    const staffTime = rows[i].querySelector(".staff-time");
    const waitTime = rows[i].querySelector(".wait-time");
    const kind = findKind(stepBox.value);
    //user need to choose a step
    if (kind === "") {
      showError(stepsError, "Choose one", stepBox);
      hasError = true;
    }

    if (kind === "Machine" || kind === "Hands-on machine") {
      //machine time cant be blank or less than equal 0
      if (machineTime.value === "") {
        showError(stepsError, "This field can't be blank", machineTime);
        hasError = true;
      } else if (Number(machineTime.value) === 0) {
        showError(stepsError, "Machine Time must be more than 0", machineTime);
        hasError = true;
      }
    }
    //staff time can be 0 but not blank
    if ((kind === "Machine" || kind === "By hand") && staffTime.value === "") {
      showError(stepsError, "This field can't be blank", staffTime);
      hasError = true;
    }
    if (kind === "Wait" && waitTime.value === "") {
      showError(stepsError, "This field can't be blank", waitTime);
      hasError = true;
    }
  }
  return hasError;
}
//save recipe
form.addEventListener("submit", function (event) {
  event.preventDefault();
  clearError();
  //only the name is saved for now, will finish in next task
  const nameBad = checkName();
  //return if has error
  if (nameBad) {
    return;
  }
  const name = form.elements.name.value.trim();
  if (editIndex === null) {
    //new recipe, the empty lists keep the other tabs working
    const newRecipe = {
      name: name,
      madeFrom: [],
      steps: [],
      capacity: [],
    };
    config.recipes.push(newRecipe);
  } else {
    //edit changes only the name for now
    config.recipes[editIndex].name = name;
  }
  //show updated list
  showRecipes(config.recipes);
  dialog.close();
});

//check for machine rows
function checkMachineRows() {
  let hasError = false;
  //step row in table
  const rows = stepRows.querySelectorAll(".step-row");
  for (let i = 0; i < rows.length; i++) {
    const usedMachines = [];
    //machine row
    let next = rows[i].nextElementSibling;
    while (next !== null && next.className === "machine-row") {
      const machineBox = next.querySelector(".row-machine");
      const timeBox = next.querySelector(".row-machine-time");
      if (machineBox.value === "") {
        //must choose 
        showError(stepsError, "Choose one", machineBox);
        hasError = true;
        //same machine cant be twice under same step
      } else if (usedMachines.includes(machineBox.value)) {
        showError(stepsError, machineBox.value + " already has a row under this step", machineBox);
        hasError = true;
      }
      //push seen machine
      usedMachines.push(machineBox.value);
      if (timeBox.value === "") {
        showError(stepsError, "This field can't be blank", timeBox);
        hasError = true;
      } else if (Number(timeBox.value) === 0) {
        showError(stepsError, "Machine Time must be more than 0", timeBox);
        hasError = true;
      }
      next = next.nextElementSibling;
    }
  }
  return hasError;
}
//mad efrom check
function checkMadeFrom() {
  let hasError = false;
  const rows = madeFromRows.querySelectorAll(".made-from-row");
  for (let i = 0; i < rows.length; i++) {
    const itemBox = rows[i].querySelector(".made-from-item");
    const amountBox = rows[i].querySelector(".made-from-amount");
    //cant be blank
    if (itemBox.value === "") {
      showError(madeFromError, "Choose one", itemBox);
      hasError = true;
    }
    //how much of it one batch take is needed
    if (amountBox.value === "") {
      showError(madeFromError, "This field can't be blank", amountBox);
      hasError = true;
    } else if (Number(amountBox.value) === 0) {
      showError(madeFromError, "Must be more than 0", amountBox);
      hasError = true;
    }
  }
  return hasError;
}
//check capacity
function checkCapacity() {
  let hasError = false;
  const usedUnits = [];
  const rows = capacityRows.querySelectorAll(".capacity-row");
  for (let i = 0; i < rows.length; i++) {
    const unitBox = rows[i].querySelector(".capacity-unit");
    const amountBox = rows[i].querySelector(".capacity-amount");
    const ofBox = rows[i].querySelector(".capacity-of");
    //cant be blank
    if (unitBox.value === "") {
      showError(capacityError, "Choose one", unitBox);
      hasError = true;
      //cant be the same as existing
    } else if (usedUnits.includes(unitBox.value)) {
      showError(capacityError, unitBox.value + " already has a row", unitBox);
      hasError = true;
      //cant equal itself
    } else if (unitBox.value === ofBox.value) {
      showError(capacityError, "A unit can't equal itself", ofBox);
      hasError = true;
    }
    //collect used units
    usedUnits.push(unitBox.value);
    if (amountBox.value === "") {
      showError(capacityError, "This field can't be blank", amountBox);
      hasError = true;
    } else if (Number(amountBox.value) === 0) {
      showError(capacityError, "Must be more than 0", amountBox);
      hasError = true;
    }
  }
  return hasError;
}
