import { pictures } from "./floor.js";
import { machinePictures } from "./floor.js";
import { kinds } from "./floor.js";
import { spotKinds } from "./floor.js";
import { otherKinds } from "./floor.js";
import { canRemove } from "./floor.js";
import { removeOldPieces } from "./floor.js";
import { addMissingPieces } from "./floor.js";
import { fits } from "./floor.js";
import { findPiece } from "./floor.js";
import { realLength } from "./floor.js";
import { makePieceBox } from "./floor.js";
import { loadSavedLayouts } from "./floor.js";
import { saveLayout } from "./floor.js";

//layout tab: the bakery floor seen from above. the user adds machines and work spots,
//drags them, sizes them and turns them. the floor is a picture only, the engine never reads it

let config = null;
//the floor of the open config. it lives in config.layout, so it is saved with the config
let layout = null;

const layoutHost = document.getElementById("layout-floor-host");
const layoutFloor = document.getElementById("layout-floor");
const tileSizeBox = document.getElementById("layout-tile-size");
const tileUnitBox = document.getElementById("layout-tile-unit");
const floorSizeText = document.getElementById("layout-floor-size");
const addLayoutButton = document.getElementById("add-layout");
const layoutDialog = document.getElementById("layout-dialog");
const layoutDialogHeader = document.getElementById("layout-dialog-header");
const layoutDialogBody = document.getElementById("layout-dialog-body");
const cancelLayoutButton = document.getElementById("cancel-layout");

//pixels for one tile, draw() sets it
let tile = 20;
//the piece the user clicked, null if none
let selected = null;
//a new piece that follows the mouse until the user clicks the floor, null if none
let placing = null;
//a move or a resize that is going on, null if none
let drag = null;
//a piece to show red for a moment when it has no room to turn
let refused = null;
//the piece the dialog is filling in, and true when the dialog edits a piece on the floor
let dialogPiece = null;

const smallestPiece = 2;
const smallestFloor = 6;

//get data from config.js
export function startLayoutTab(data) {
  config = data;
  if (config.layout === undefined || config.layout === null) {
    const layouts = loadSavedLayouts();
    config.layout = layouts[config.name];
  }
  //a config without a floor yet gets an empty one
  if (config.layout === undefined || config.layout === null) {
    config.layout = {
      width: 24,
      depth: 16,
      tileSize: 1,
      tileUnit: "ft",
      nextId: 1,
      pieces: []
    };
  }
  layout = config.layout;
  showLayoutTab();
}

//config.js calls this when the Layout tab opens, the floor must be visible to measure its box
export function showLayoutTab() {
  //data is not loaded yet
  if (layout === null) {
    return;
  }
  removeOldPieces(config, layout);
  addMissingPieces(config, layout);
  selected = null;
  stopPlacing();
  tileSizeBox.value = layout.tileSize;
  tileUnitBox.value = layout.tileUnit;
  draw();
}

//draw the whole floor again from layout. the floor is small, so every change redraws all of it
function draw() {
  //pixels per tile so the whole floor fits in its box, with room left for the + and - buttons
  tile = Math.floor(Math.min((layoutHost.clientWidth - 100) / layout.width, (layoutHost.clientHeight - 100) / layout.depth));
  if (tile < 8) {
    tile = 8;
  }
  if (tile > 34) {
    tile = 34;
  }
  layoutFloor.style.width = layout.width * tile + "px";
  layoutFloor.style.height = layout.depth * tile + "px";
  //one grid square per tile
  layoutFloor.style.backgroundSize = tile + "px " + tile + "px";
  layoutFloor.replaceChildren();
  for (let i = 0; i < layout.pieces.length; i++) {
    const piece = layout.pieces[i];
    const pieceBox = makePieceBox(piece, tile);
    if (piece === selected) {
      pieceBox.classList.add("selected");
      //small square at the bottom right corner, drag it to size the piece
      const handle = document.createElement("div");
      handle.className = "handle";
      pieceBox.appendChild(handle);
    }
    if (piece === refused) {
      pieceBox.classList.add("ghost");
      pieceBox.classList.add("bad");
    }
    layoutFloor.appendChild(pieceBox);
  }
  if (selected !== null && drag === null) {
    drawTools();
  }
  drawEdges();
  if (placing !== null && placing.x !== null) {
    drawGhost();
  }
  floorSizeText.textContent = realLength(layout, layout.width) + " × " + realLength(layout, layout.depth);
  saveLayout(config.name, layout);
}

//the new piece under the mouse: green where it fits, red where it does not
function drawGhost() {
  const ghostBox = makePieceBox(placing, tile);
  ghostBox.classList.add("ghost");
  if (fits(layout, placing.x, placing.y, placing.width, placing.depth, null)) {
    ghostBox.classList.add("ok");
  } else {
    ghostBox.classList.add("bad");
  }
  layoutFloor.appendChild(ghostBox);
}

//the small bar next to the selected piece: its real size, Turn, Edit, Remove
function drawTools() {
  const bar = document.createElement("div");
  bar.className = "tools";
  const size = document.createElement("span");
  size.textContent = realLength(layout, selected.width) + " × " + realLength(layout, selected.depth);
  bar.appendChild(size);
  bar.appendChild(makeToolButton("Turn", turnSelected));
  //only a machine (its picture) and a table (its steps) have something to edit
  if (selected.kind === "machine") {
    bar.appendChild(makeToolButton("Edit", editSelected));
  } else {
    const removeButton = makeToolButton("Remove", removeSelected);
    removeButton.className = "remove";
    if (canRemove(config, layout, selected) === false) {
      removeButton.disabled = true;
      removeButton.title = kinds[selected.kind].why;
    }
    bar.appendChild(removeButton);
  }
  //line up with the left side of the piece, or with its right side near the right wall
  if (selected.x + 9 <= layout.width) {
    bar.style.left = selected.x * tile + "px";
  } else {
    bar.style.right = (layout.width - selected.x - selected.width) * tile + "px";
  }
  //above the piece, or below it when the piece is near the top wall
  if (selected.y * tile >= 44) {
    bar.style.top = selected.y * tile - 44 + "px";
  } else {
    bar.style.top = (selected.y + selected.depth) * tile + 10 + "px";
  }
  layoutFloor.appendChild(bar);
}

function makeToolButton(text, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.addEventListener("click", action);
  return button;
}

//the + and - on each wall: add or remove one row or one column of tiles
function drawEdges() {
  const sides = ["top", "bottom", "left", "right"];
  for (let i = 0; i < sides.length; i++) {
    const side = sides[i];
    const edge = document.createElement("div");
    edge.className = "edge " + side;
    const growButton = document.createElement("button");
    growButton.type = "button";
    growButton.textContent = "+";
    growButton.title = "Add floor";
    growButton.addEventListener("click", function () {
      growFloor(side);
    });
    const shrinkButton = document.createElement("button");
    shrinkButton.type = "button";
    shrinkButton.textContent = "−";
    shrinkButton.title = "Remove floor";
    if (canShrink(side) === false) {
      shrinkButton.disabled = true;
    }
    shrinkButton.addEventListener("click", function () {
      shrinkFloor(side);
    });
    edge.appendChild(growButton);
    edge.appendChild(shrinkButton);
    layoutFloor.appendChild(edge);
  }
}

function growFloor(side) {
  if (side === "top" || side === "bottom") {
    layout.depth = layout.depth + 1;
  } else {
    layout.width = layout.width + 1;
  }
  //a new row at the top or a new column at the left moves every piece one tile over
  for (let i = 0; i < layout.pieces.length; i++) {
    if (side === "top") {
      layout.pieces[i].y = layout.pieces[i].y + 1;
    }
    if (side === "left") {
      layout.pieces[i].x = layout.pieces[i].x + 1;
    }
  }
  draw();
}

//a row or a column can go only when no piece is on it and the floor stays big enough
function canShrink(side) {
  if ((side === "top" || side === "bottom") && layout.depth <= smallestFloor) {
    return false;
  }
  if ((side === "left" || side === "right") && layout.width <= smallestFloor) {
    return false;
  }
  for (let i = 0; i < layout.pieces.length; i++) {
    const piece = layout.pieces[i];
    if (side === "top" && piece.y === 0) {
      return false;
    }
    if (side === "left" && piece.x === 0) {
      return false;
    }
    if (side === "bottom" && piece.y + piece.depth === layout.depth) {
      return false;
    }
    if (side === "right" && piece.x + piece.width === layout.width) {
      return false;
    }
  }
  return true;
}

function shrinkFloor(side) {
  if (canShrink(side) === false) {
    return;
  }
  if (side === "top" || side === "bottom") {
    layout.depth = layout.depth - 1;
  } else {
    layout.width = layout.width - 1;
  }
  for (let i = 0; i < layout.pieces.length; i++) {
    if (side === "top") {
      layout.pieces[i].y = layout.pieces[i].y - 1;
    }
    if (side === "left") {
      layout.pieces[i].x = layout.pieces[i].x - 1;
    }
  }
  draw();
}

//a quarter turn around the middle of the piece: width and depth swap, the front moves one side on.
//turn 0 = front at the bottom, 1 = left, 2 = top, 3 = right
function turnSelected() {
  const piece = selected;
  const width = piece.depth;
  const depth = piece.width;
  //keep the middle where it was
  let x = Math.round(piece.x + piece.width / 2 - width / 2);
  let y = Math.round(piece.y + piece.depth / 2 - depth / 2);
  //stay inside the walls
  if (x > layout.width - width) {
    x = layout.width - width;
  }
  if (y > layout.depth - depth) {
    y = layout.depth - depth;
  }
  if (x < 0) {
    x = 0;
  }
  if (y < 0) {
    y = 0;
  }
  //no room to turn here: show the piece red for a moment
  if (fits(layout, x, y, width, depth, piece) === false) {
    refused = piece;
    draw();
    setTimeout(function () {
      refused = null;
      draw();
    }, 350);
    return;
  }
  piece.x = x;
  piece.y = y;
  piece.width = width;
  piece.depth = depth;
  piece.turn = (piece.turn + 1) % 4;
  piece.fresh = false;
  draw();
}

function removeSelected() {
  if (canRemove(config, layout, selected) === false) {
    return;
  }
  const index = layout.pieces.indexOf(selected);
  layout.pieces.splice(index, 1);
  selected = null;
  draw();
}

//edit opens the pictures of a machine or the steps of a table
function editSelected() {
  dialogPiece = selected;
  showPictures();
  layoutDialog.showModal();
}

//where the mouse is on the floor, in tiles (not rounded)
function mouseTile(event) {
  const box = layoutFloor.getBoundingClientRect();
  return { x: (event.clientX - box.left) / tile, y: (event.clientY - box.top) / tile };
}

layoutFloor.addEventListener("pointerdown", function (event) {
  //the tool bar and the + and - buttons handle their own clicks
  if (event.target.closest(".tools") !== null || event.target.closest(".edge") !== null) {
    return;
  }
  const mouse = mouseTile(event);
  //a new piece is following the mouse: put it down here
  if (placing !== null) {
    dropNewPiece(mouse);
    return;
  }
  //the corner square of the selected piece: start sizing it
  if (event.target.classList.contains("handle")) {
    drag = { what: "size", piece: selected };
    //keep getting the mouse moves even when the mouse leaves the floor
    layoutFloor.setPointerCapture(event.pointerId);
    draw();
    return;
  }
  const pieceBox = event.target.closest(".piece");
  //clicked the empty floor: nothing is selected
  if (pieceBox === null) {
    selected = null;
    draw();
    return;
  }
  selected = findPiece(layout, Number(pieceBox.dataset.id));
  //remember where inside the piece the mouse took hold of it
  drag = { what: "move", piece: selected, dx: mouse.x - selected.x, dy: mouse.y - selected.y };
  layoutFloor.setPointerCapture(event.pointerId);
  draw();
});

layoutFloor.addEventListener("pointermove", function (event) {
  const mouse = mouseTile(event);
  //the new piece follows the mouse, redraw only when it reaches another tile
  if (placing !== null) {
    const x = Math.round(mouse.x - placing.width / 2);
    const y = Math.round(mouse.y - placing.depth / 2);
    if (x !== placing.x || y !== placing.y) {
      placing.x = x;
      placing.y = y;
      draw();
    }
    return;
  }
  if (drag === null) {
    return;
  }
  //a piece only moves or grows to a place where it fits, so it never lands on another piece
  const piece = drag.piece;
  if (drag.what === "move") {
    const x = Math.round(mouse.x - drag.dx);
    const y = Math.round(mouse.y - drag.dy);
    if ((x !== piece.x || y !== piece.y) && fits(layout, x, y, piece.width, piece.depth, piece)) {
      piece.x = x;
      piece.y = y;
      piece.fresh = false;
      draw();
    }
  } else {
    let width = Math.round(mouse.x - piece.x);
    let depth = Math.round(mouse.y - piece.y);
    if (width < smallestPiece) {
      width = smallestPiece;
    }
    if (depth < smallestPiece) {
      depth = smallestPiece;
    }
    if ((width !== piece.width || depth !== piece.depth) && fits(layout, piece.x, piece.y, width, depth, piece)) {
      piece.width = width;
      piece.depth = depth;
      piece.fresh = false;
      draw();
    }
  }
});

//the mouse is let go: the move or the resize is over
function endDrag() {
  if (drag !== null) {
    drag = null;
    draw();
  }
}
layoutFloor.addEventListener("pointerup", endDrag);
layoutFloor.addEventListener("pointercancel", endDrag);

//escape stops adding a new piece
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && placing !== null) {
    stopPlacing();
    draw();
  }
});

//a new piece follows the mouse until the user clicks the floor
function startPlacing(piece) {
  placing = piece;
  //not over the floor yet
  placing.x = null;
  placing.y = null;
  selected = null;
  layoutHost.classList.add("placing");
  draw();
}

function stopPlacing() {
  placing = null;
  layoutHost.classList.remove("placing");
}

//put the new piece where the mouse is, only if it fits there
function dropNewPiece(mouse) {
  const x = Math.round(mouse.x - placing.width / 2);
  const y = Math.round(mouse.y - placing.depth / 2);
  if (fits(layout, x, y, placing.width, placing.depth, null) === false) {
    return;
  }
  const piece = placing;
  piece.x = x;
  piece.y = y;
  piece.id = layout.nextId;
  layout.nextId = layout.nextId + 1;
  layout.pieces.push(piece);
  stopPlacing();
  selected = piece;
  draw();
}

//a title over a group of cards in the dialog
function addGroupTitle(text) {
  const title = document.createElement("h3");
  title.textContent = text;
  layoutDialogBody.appendChild(title);
}

function addCardGrid() {
  const grid = document.createElement("div");
  grid.className = "cards";
  layoutDialogBody.appendChild(grid);
  return grid;
}

//one card: a small picture, a name, and a grey line when there is one
function addCard(grid, pictureName, text) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "card";
  const thumb = document.createElement("div");
  thumb.className = "thumb";
  //the svg text is ours, not user input, so innerHTML is safe here
  thumb.innerHTML = "<svg viewBox='0 0 100 100'>" + pictures[pictureName].svg + "</svg>";
  card.appendChild(thumb);
  const name = document.createElement("div");
  name.textContent = text;
  card.appendChild(name);
  grid.appendChild(card);
  return card;
}

//dialog view 1: everything that can go on the floor
function showList() {
  dialogPiece = null;
  layoutDialogHeader.textContent = "Add to floor";
  layoutDialogBody.replaceChildren();
  addGroupTitle("Work spots");
  let grid = addCardGrid();
  for (let i = 0; i < spotKinds.length; i++) {
    addKindCard(grid, spotKinds[i]);
  }
  addGroupTitle("Other");
  grid = addCardGrid();
  for (let i = 0; i < otherKinds.length; i++) {
    addKindCard(grid, otherKinds[i]);
  }
}

function addKindCard(grid, kind) {
  const kindCard = addCard(grid, kind, kinds[kind].label);
  kindCard.addEventListener("click", function () {
    layoutDialog.close();
    startPlacing({ kind: kind, turn: 0, width: kinds[kind].width, depth: kinds[kind].depth });
  });
}

//dialog view 2: the pictures a machine can use
function showPictures() {
  layoutDialogHeader.textContent = "Choose the look for " + dialogPiece.name;
  layoutDialogBody.replaceChildren();
  const grid = addCardGrid();
  for (let i = 0; i < machinePictures.length; i++) {
    const key = machinePictures[i];
    const pictureCard = addCard(grid, key, pictures[key].label + " look");
    //mark the picture it has now
    if (dialogPiece.picture === key) {
      pictureCard.classList.add("picked");
    }
    pictureCard.addEventListener("click", function () {
      dialogPiece.picture = key;
      dialogPiece.fresh = false;
      layoutDialog.close();
      draw();
    });
  }
}

//cancel button
cancelLayoutButton.addEventListener("click", function () {
  layoutDialog.close();
});

//open the dialog with the list of things
addLayoutButton.addEventListener("click", function () {
  stopPlacing();
  showList();
  layoutDialog.showModal();
});

//what one tile is in real life, only a label for people
tileSizeBox.addEventListener("input", function () {
  const size = Number(tileSizeBox.value);
  if (size > 0) {
    layout.tileSize = size;
    draw();
  }
});

tileUnitBox.addEventListener("input", function () {
  layout.tileUnit = tileUnitBox.value.trim();
  draw();
});

//a new window size gives the floor a new box size
window.addEventListener("resize", function () {
  if (layout !== null) {
    draw();
  }
});
