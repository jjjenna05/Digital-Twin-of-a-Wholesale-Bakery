import { createCell } from "./config.js";
import { startEquipmentTab } from "./config-equipment.js";
import { startRolesTab } from "./config-roles.js";
import { startUnitsTab } from "./config-units.js";
import { startStepsTab } from "./config-steps.js";
import { startRecipesTab } from "./config-recipes.js";

let config = null;
//get data from async cal
export function startPreferencesTab(data) {
  config = data;
}

const saveConfigButton = document.getElementById("save-config");
const saveConfigButtonError = document.getElementById("save-config-button-error");
const saveConfigDialog = document.getElementById("save-config-dialog");
const saveConfigDialogHeader = document.getElementById("save-config-dialog-header");
const saveConfigForm = document.getElementById("save-config-form");
const cancelSaveConfig = document.getElementById("cancel-save-config");

const saveConfigError = document.getElementById("save-config-error");
const preferencesRow = document.getElementById("preferences-row");
const deleteConfigDialog = document.getElementById("delete-config-dialog");
const deleteConfigDialogHeader = document.getElementById("delete-config-dialog-header");
const cancelConfigDelete = document.getElementById("cancel-config-delete");
const confirmConfigDelete = document.getElementById("confirm-config-delete");
//store each saved name, description and its config
const savedConfigs = [];
const configPick = document.getElementById("config-pick");
//null means adding a new one, otherwise the index being edited
let editingIndex = null;
let deletingIndex = null;
//index of the saved config the dropdown is showing, null if none
let currentIndex = null;

//build the table and the dropdown from savedConfigs
function showSavedConfigs() {
  preferencesRow.innerHTML = "";
  //keep the first placeholder option, remove the saved names
  while (configPick.options.length > 1) {
    configPick.remove(1);
  }
  for (let i = 0; i < savedConfigs.length; i++) {
    const row = document.createElement("tr");
    createCell(row, savedConfigs[i].name);
    createCell(row, savedConfigs[i].description);

    const buttonCell = document.createElement("td");
    buttonCell.className = "config-buttons";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "row-edit";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", function () {
      openEditDialog(i);
    });
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "row-delete";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function () {
      openDeleteDialog(i);
    });
    buttonCell.appendChild(editButton);
    buttonCell.appendChild(deleteButton);
    row.appendChild(buttonCell);
    preferencesRow.appendChild(row);

    //add name as option of dropdown
    const option = document.createElement("option");
    option.value = i;
    option.textContent = savedConfigs[i].name;
    configPick.appendChild(option);
  }
  //"" is the placeholder option
  if (currentIndex === null) {
    configPick.value = "";
  } else {
    configPick.value = currentIndex;
  }
}

//open the dialog with an empty name box
saveConfigButton.addEventListener("click", function () {
  //clear error
  saveConfigButtonError.textContent = "";
  //same data as a saved config, no need to save it again
  for (let i = 0; i < savedConfigs.length; i++) {
    if (JSON.stringify(savedConfigs[i].data) === JSON.stringify(config)) {
      saveConfigButtonError.textContent = "Already saved as " + savedConfigs[i].name + "!";
      return;
    }
  }
  editingIndex = null;
  saveConfigDialogHeader.textContent = "Save configuration";
  saveConfigForm.reset();
  //clear error
  saveConfigError.textContent = "";
  saveConfigForm.elements.name.classList.remove("error-box");
  saveConfigDialog.showModal();
});

//open the dialog filled with the saved name and description
function openEditDialog(index) {
  editingIndex = index;
  saveConfigDialogHeader.textContent = "Edit configuration";
  saveConfigForm.reset();
  saveConfigForm.elements.name.value = savedConfigs[index].name;
  saveConfigForm.elements.description.value = savedConfigs[index].description;
  //clear error
  saveConfigError.textContent = "";
  saveConfigForm.elements.name.classList.remove("error-box");
  saveConfigDialog.showModal();
}

//cancel button
cancelSaveConfig.addEventListener("click", function () {
  saveConfigDialog.close();
});

//save 
saveConfigForm.addEventListener("submit", function (event) {
  event.preventDefault();
  //get the saved name and description
  const nameBox = saveConfigForm.elements.name;
  const name = nameBox.value.trim();
  const description = saveConfigForm.elements.description.value.trim();
  //name cant be blank
  if (name === "") {
    saveConfigError.textContent = "Name something!";
    nameBox.classList.add("error-box");
    return;
  }
  //name cant be used by another saved config, ignore the one being edited
  for (let i = 0; i < savedConfigs.length; i++) {
    if (i !== editingIndex && savedConfigs[i].name.toLowerCase() === name.toLowerCase()) {
      saveConfigError.textContent = "That name is already used!";
      nameBox.classList.add("error-box");
      return;
    }
  }
  if (editingIndex === null) {
    //later edit shouldnt change the save one, use copy
    savedConfigs.push({
      name: name,
      description: description,
      //get full copy
      data: structuredClone(config),
    });
    currentIndex = savedConfigs.length - 1;
  } else {
    //edit only changes the name and description, not the saved data
    savedConfigs[editingIndex].name = name;
    savedConfigs[editingIndex].description = description;
  }
  showSavedConfigs();
  saveConfigDialog.close();
});

//open the delete dialog
function openDeleteDialog(index) {
  deletingIndex = index;
  deleteConfigDialogHeader.textContent = "Delete " + savedConfigs[index].name + "?";
  deleteConfigDialog.showModal();
}

//cancel button
cancelConfigDelete.addEventListener("click", function () {
  deleteConfigDialog.close();
});

//delete
confirmConfigDelete.addEventListener("click", function () {
  savedConfigs.splice(deletingIndex, 1);
  //keep the dropdown pointing at the same config after the indexes shift
  if (currentIndex === deletingIndex) {
    currentIndex = null;
  } else if (currentIndex !== null && currentIndex > deletingIndex) {
    currentIndex = currentIndex - 1;
  }
  showSavedConfigs();
  deleteConfigDialog.close();
});

//show the saved config in every tab when picked from the dropdown
configPick.addEventListener("change", function () {
  currentIndex = Number(configPick.value);
  saveConfigButtonError.textContent = "";
  //edits made while looking at it shouldnt change the save one, use copy
  config = structuredClone(savedConfigs[currentIndex].data);
  startEquipmentTab(config);
  startStepsTab(config);
  startUnitsTab(config);
  startRolesTab(config);
  startRecipesTab(config);
});