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
  //fill all equipments with its data from config data
  for (let i = 0; i < equipmentList.length; i++) {
    const row = document.createElement("tr");
    //fill all cells each equipment row
    createCell(row, equipmentList[i].name);
    createCell(row, equipmentList[i].canDo.join(", ")); 
    createCell(row, equipmentList[i].quantity);
    createCell(row, showAmount(equipmentList[i].capacity));
    createCell(row, equipmentList[i].loads);
    createCell(row, showAmount(equipmentList[i].switchTime));
    createCell(row, showAmount(equipmentList[i].warmUpTime));
    createCell(row, equipmentList[i].turnOn);
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

addButton.addEventListener("click", function () {
  fillCanDoBoxes();
  fillUnitChoices();
  equipmentDialog.showModal();
});

cancelButton.addEventListener("click", function () {
  equipmentDialog.close();
});
