const bodyList = document.getElementById("equipment-row");
// helper function to fill the amount correctly, if user dont type, return None
function showAmount(value) {
    if (value.amount === null) {
      return "None";
    }
  return `${value.amount} ${value.unit}`;
}
//helper function to create and fill the cell from data.js
function createCell(row, text) {
  const cell = document.createElement("td");
  //use textContent instead of innerHTML since user is filling the data
  cell.textContent = text;
  row.appendChild(cell);
}
//fill all equipments with its data from data.js
for (let i = 0; i < equipment.length; i++) {
  const row = document.createElement("tr");
  //fill all cells each equipment row
  createCell(row, equipment[i].equipmentName);
  createCell(row, equipment[i].canDo.join(", ")); 
  createCell(row, equipment[i].quantity);
  createCell(row, showAmount(equipment[i].capacity));
  createCell(row, equipment[i].loads);
  createCell(row, showAmount(equipment[i].switchTime));
  createCell(row, showAmount(equipment[i].warmUpTime));
  createCell(row, equipment[i].turnOn);
  //add finished row to the table
  bodyList.appendChild(row);
}
