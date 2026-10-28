let config = null;
//get data from async cal
export function startPreferencesTab(data) {
  config = data;
}

const saveConfigButton = document.getElementById("save-config");
const saveConfigDialog = document.getElementById("save-config-dialog");
const saveConfigForm = document.getElementById("save-config-form");
const cancelSaveConfig = document.getElementById("cancel-save-config");

const saveConfigError = document.getElementById("save-config-error");
//store each saved name and its config
const savedConfigs = [];
const configPick = document.getElementById("config-pick");

//open the dialog with an empty name box
saveConfigButton.addEventListener("click", function () {
  saveConfigForm.reset();
  //clear error
  saveConfigError.textContent = "";
  saveConfigForm.elements.name.classList.remove("error-box");
  saveConfigDialog.showModal();
});
//cancel button
cancelSaveConfig.addEventListener("click", function () {
  saveConfigDialog.close();
});

//save 
saveConfigForm.addEventListener("submit", function (event) {
  event.preventDefault();
  //get the saved name
  const nameBox = saveConfigForm.elements.name;
  const name = nameBox.value.trim();
  //name cant be blank
  if (name === "") {
    saveConfigError.textContent = "Name something!";
    nameBox.classList.add("error-box");
    return;
  }
  //later edit shouldnt change the save one, use copy
  savedConfigs.push({
    name: name,
    //get full copy
    data: structuredClone(config),
  });
  //add name as option of dropdown
  const option = document.createElement("option");
  option.value = savedConfigs.length - 1;
  option.textContent = name;
  configPick.appendChild(option);
  configPick.value = option.value;
  saveConfigDialog.close();
});