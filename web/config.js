import { startEquipmentTab } from "./config-equipment.js";
import { startRolesTab } from "./config-roles.js";
import { startUnitsTab } from "./config-units.js";
import { startStepsTab } from "./config-steps.js";
const recipesListBody = document.getElementById("recipe-row");
// helper function to fill the amount correctly. if user dont type, return None
export function showAmount(value) {
    if (value.amount === null) {
      return "None";
    }
  return `${value.amount} ${value.unit}`;
}
//helper function to create and fill the cell from config data
export function createCell(row, text) {
  const cell = document.createElement("td");
  //use textContent instead of innerHTML since user is filling the data
  cell.textContent = text;
  row.appendChild(cell);
}
//helper function to convert user input to valid number
export function convertUserInput(text) {
  if (text === "") {
    return null;
  }
    return Number(text);
}
//helper function to bring null back to ""
export function amountToText(amount) {
  if (amount === null) {
    return "";
  }
  return amount;
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
  //send data to config-equipment.js and call function
  startEquipmentTab(configData);
  startStepsTab(configData);
  startUnitsTab(configData);
  startRolesTab(configData);
  showRecipes(configData.recipes);
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