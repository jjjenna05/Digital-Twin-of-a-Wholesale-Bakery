const bodyList = document.getElementById("equipment-row");
// fill the amount correctly, if user dont type, return None
function showAmount(value) {
    if (value.amount === null) {
      return "None";
    }
  return `${value.amount} ${value.unit}`;
}
