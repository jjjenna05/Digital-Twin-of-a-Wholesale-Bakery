const bodyList = document.getElementById("equipment-row");
const stepsListBody = document.getElementById("steps-row");

// helper function to fill the amount correctly, if user dont type, return None
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

//load data from config.sample.json
async function loadConfig() {
  const response = await fetch("../data/config.sample.json");
  const configData = await response.json();
  showEquipment(configData.equipment);
  showSteps(configData.steps);
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