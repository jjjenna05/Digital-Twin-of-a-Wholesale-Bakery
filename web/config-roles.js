import { createCell } from "./config.js";

const rolesBodyList = document.getElementById("roles-row");
let config = null;

export function startRolesTab(data) {
  config = data;
  showRoles(config.roles);
}
//role table
function showRoles(rolesList) {
  rolesBodyList.replaceChildren();
  for (let i = 0; i < rolesList.length; i++) {
    const row = document.createElement("tr");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "row-edit";
    editButton.textContent = "Edit";
    deleteButton.type = "button";
    deleteButton.className = "row-delete";
    deleteButton.textContent = "Delete";
    //fill cells
    createCell(row, rolesList[i].name);
    createCell(row, rolesList[i].canDo.join(", "));
    //for edit/delete buttons
    const buttonCell = document.createElement("td");
    editButton.addEventListener("click", function (){
      openEditDialog(i);
    });
    deleteButton.addEventListener("click", function (){
      openDeleteDialog(i);
    });
    buttonCell.appendChild(editButton);
    buttonCell.appendChild(deleteButton);
    row.appendChild(buttonCell);
    rolesBodyList.appendChild(row);
    
  }
}
//dropdown list for canDo section
function fillCanDoBoxes() {
  const box = document.getElementById("roles-can-do-boxes");
  //empty first
  box.replaceChildren();
  for(let i = 0; i < config.steps.length; i++) {
    const kind = config.steps[i].kind;

    //only show kinds for hands, hand-on machine, and machine
    if(kind !== "By hand" && kind !== "Hands-on machine" && kind !== "Machine") {
      continue;
    }
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "canDo";
    checkbox.value = config.steps[i].name;
    //update everytime its ticked or unticked
    checkbox.addEventListener("change", showCanDoSummary);
    label.appendChild(checkbox);
    label.append(" " + config.steps[i].name);
    box.appendChild(label);
  }
}
const canDoDropdown = document.getElementById("roles-can-do-dropdown");
const canDoSummary = document.getElementById("roles-can-do-summary");
//show checked item as user chck item
function showCanDoSummary() {
  const checkedName = [];
  const checkedItems = canDoDropdown.querySelectorAll("input[name='canDo']:checked");
  for(let i = 0; i < checkedItems.length; i++) {
    checkedName.push(checkedItems[i].value);
  }
  canDoSummary.textContent = checkedName.join(", ");
}
const dialog = document.getElementById("roles-dialog");
const form = document.getElementById("roles-form");
const header = document.getElementById("roles-dialog-header");
const nameError = document.getElementById("roles-name-error");
const canDoError = document.getElementById("roles-can-do-error");
const cancelButton = document.getElementById("cancel-roles");
const deleteDialog = document.getElementById("delete-roles-dialog");
const deleteDialogHeader = document.getElementById("delete-roles-dialog-header");
const cancelDeleteButton = document.getElementById("cancel-roles-delete");
const confirmDeleteButton = document.getElementById("confirm-roles-delete");
const addButton = document.getElementById("add-roles");
let editIndex = null;
//helper to clear errors
function clearErrors() {
  canDoError.textContent = "";
  nameError.textContent = "";
}
//upon click add button
addButton.addEventListener("click", function () {
  editIndex = null;
  clearErrors();
  header.textContent = "Add role";
  form.reset();
  fillCanDoBoxes();
  showCanDoSummary();
  canDoDropdown.open = false;
  dialog.showModal();
});
cancelButton.addEventListener("click", function () {
  dialog.close();
});
//close dropdown when click outside
dialog.addEventListener("click", function(event) {
  if(canDoDropdown.contains(event.target) === false) {
    canDoDropdown.open = false;
  }
});

//save new role
form.addEventListener("submit", function (event) {
  //prevent browser reload
  event.preventDefault();
  //remove last error message
  clearErrors();
  const fields = form.elements;
  const userSelectedBoxes = form.querySelectorAll('input[name="canDo"]:checked');
  const canDo = [];
  //push userselected boxes
  for (let i = 0; i < userSelectedBoxes.length; i++){
    canDo.push(userSelectedBoxes[i].value);
  }

  //error handling
  let hasError = false;
  if (fields.name.value.trim() === "") {
    nameError.textContent = "Name something";
    hasError = true;
  }
  if(userSelectedBoxes.length === 0) {
    canDoError.textContent = "Select at least one option";
    hasError = true;
  }
  //return if there is error
  if(hasError) {
    return;
  }
  //fill new role data
  const newRole = {
    name: fields.name.value.trim(),
    canDo: canDo,
  };
  //push data to table if not edit
  if(editIndex === null) {
    config.roles.push(newRole);
  } else {
    config.roles[editIndex] = newRole;
  }
  //show updated roles list in table
  showRoles(config.roles);
  dialog.close();
});
//open edit dialog and show user current data
function openEditDialog(index) {
  editIndex = index;
  header.textContent = "Edit Role";
  form.reset();
  clearErrors();
  fillCanDoBoxes();
  const currentRole = config.roles[index];
  const fields = form.elements;
  //fill current roles data
  fields.name.value = currentRole.name;
  const boxes = form.querySelectorAll('input[name="canDo"]');
  //check current role's checkboxes
  for (let i = 0; i < boxes.length; i++){
    if(currentRole.canDo.includes(boxes[i].value)) {
      boxes[i].checked = true;
    }
  }
  showCanDoSummary();
  canDoDropdown.open = false;
  dialog.showModal();
}

//delete dialog
let deleteIndex = null;
function openDeleteDialog(index) {
  deleteIndex = index;
  deleteDialogHeader.textContent = `Delete ${config.roles[index].name}?`;
  deleteDialog.showModal();
}
cancelDeleteButton.addEventListener("click", function() {
  deleteDialog.close();
});
confirmDeleteButton.addEventListener("click", function () {
  //delete current role data
  config.roles.splice(deleteIndex, 1);
  //show updated list in table
  showRoles(config.roles);
  deleteDialog.close();
});
