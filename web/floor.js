//every picture is drawn from above in a 100 x 100 box, with the front (where a worker stands) at the bottom
//b = body, dt = detail, ln = line, fr = front bar, fr2 = door line, ar = area
const body = "<rect class='b' x='3' y='3' width='94' height='94' rx='5'/>";
const front = "<rect class='fr' x='22' y='89' width='56' height='6' rx='2'/>";
const area = "<rect class='ar' x='3' y='3' width='94' height='94' rx='5'/>";
export const pictures = {
  plain: {
    label: "Plain", width: 3, depth: 3,
    svg: body + front
  },
  oven: {
    label: "Oven", width: 4, depth: 4,
    svg: body + "<rect class='dt' x='14' y='12' width='72' height='62' rx='4'/><circle class='dt' cx='74' cy='24' r='6'/>" + front
  },
  mixer: {
    label: "Mixer", width: 3, depth: 3,
    svg: body + "<rect class='dt' x='36' y='8' width='28' height='24' rx='4'/><circle class='dt' cx='50' cy='56' r='27'/>" +
      "<circle class='dt' cx='50' cy='56' r='9'/>" + front
  },
  proofer: {
    label: "Proofer", width: 3, depth: 4,
    svg: body + "<line class='ln' x1='14' y1='20' x2='86' y2='20'/><line class='ln' x1='14' y1='36' x2='86' y2='36'/>" +
      "<line class='ln' x1='14' y1='52' x2='86' y2='52'/><line class='ln' x1='14' y1='68' x2='86' y2='68'/>" + front
  },
  fryer: {
    label: "Fryer", width: 4, depth: 3,
    svg: body + "<rect class='dt' x='12' y='12' width='76' height='52' rx='4'/>" +
      "<circle class='dt' cx='30' cy='28' r='7'/><circle class='dt' cx='50' cy='28' r='7'/><circle class='dt' cx='70' cy='28' r='7'/>" +
      "<circle class='dt' cx='30' cy='48' r='7'/><circle class='dt' cx='50' cy='48' r='7'/><circle class='dt' cx='70' cy='48' r='7'/>" + front
  },
  sheeter: {
    label: "Sheeter", width: 6, depth: 3,
    svg: body + "<rect class='dt' x='6' y='28' width='88' height='40' rx='3'/><rect class='dt' x='40' y='12' width='20' height='70' rx='4'/>" + front
  },
  rackoven: {
    label: "Rack oven", width: 4, depth: 4,
    svg: body + "<circle class='dt' cx='50' cy='46' r='33'/><line class='ln' x1='50' y1='13' x2='50' y2='79'/>" +
      "<line class='ln' x1='17' y1='46' x2='83' y2='46'/>" + front
  },
  divider: {
    label: "Divider", width: 3, depth: 4,
    svg: body + "<circle class='dt' cx='50' cy='30' r='21'/><circle class='dt' cx='50' cy='30' r='8'/>" +
      "<rect class='dt' x='36' y='54' width='28' height='30' rx='3'/>" + front
  },
  stove: {
    label: "Stove", width: 4, depth: 3,
    svg: body + "<circle class='dt' cx='30' cy='28' r='14'/><circle class='dt' cx='70' cy='28' r='14'/>" +
      "<circle class='dt' cx='30' cy='64' r='14'/><circle class='dt' cx='70' cy='64' r='14'/>" + front
  },
  kettle: {
    label: "Kettle", width: 3, depth: 3,
    svg: body + "<circle class='dt' cx='50' cy='44' r='33'/><circle class='dt' cx='50' cy='44' r='24'/>" +
      "<line class='ln' x1='6' y1='44' x2='17' y2='44'/><line class='ln' x1='83' y1='44' x2='94' y2='44'/>" +
      "<rect class='dt' x='44' y='78' width='12' height='8' rx='2'/>" + front
  },
  depositor: {
    label: "Depositor", width: 4, depth: 3,
    svg: body + "<rect class='dt' x='28' y='8' width='44' height='26' rx='4'/>" +
      "<circle class='dt' cx='22' cy='54' r='6'/><circle class='dt' cx='36' cy='54' r='6'/><circle class='dt' cx='50' cy='54' r='6'/>" +
      "<circle class='dt' cx='64' cy='54' r='6'/><circle class='dt' cx='78' cy='54' r='6'/>" +
      "<line class='ln' x1='10' y1='74' x2='90' y2='74'/>" + front
  },
  conveyor: {
    label: "Conveyor", width: 6, depth: 2,
    svg: body + "<rect class='dt' x='6' y='20' width='88' height='54' rx='8'/>" +
      "<line class='ln' x1='18' y1='20' x2='18' y2='74'/><line class='ln' x1='34' y1='20' x2='34' y2='74'/>" +
      "<line class='ln' x1='50' y1='20' x2='50' y2='74'/><line class='ln' x1='66' y1='20' x2='66' y2='74'/>" +
      "<line class='ln' x1='82' y1='20' x2='82' y2='74'/>" + front
  },
  slicer: {
    label: "Slicer", width: 3, depth: 3,
    svg: body + "<rect class='dt' x='18' y='9' width='64' height='24' rx='3'/>" +
      "<line class='ln' x1='26' y1='38' x2='26' y2='62'/><line class='ln' x1='34' y1='38' x2='34' y2='62'/>" +
      "<line class='ln' x1='42' y1='38' x2='42' y2='62'/><line class='ln' x1='50' y1='38' x2='50' y2='62'/>" +
      "<line class='ln' x1='58' y1='38' x2='58' y2='62'/><line class='ln' x1='66' y1='38' x2='66' y2='62'/>" +
      "<line class='ln' x1='74' y1='38' x2='74' y2='62'/><rect class='dt' x='18' y='67' width='64' height='17' rx='3'/>" + front
  },
  packer: {
    label: "Packer", width: 5, depth: 3,
    svg: body + "<circle class='dt' cx='22' cy='44' r='14'/><circle class='dt' cx='22' cy='44' r='5'/>" +
      "<rect class='dt' x='42' y='22' width='50' height='46' rx='3'/><line class='ln' x1='67' y1='22' x2='67' y2='68'/>" + front
  },
  scale: {
    label: "Scale", width: 2, depth: 2,
    svg: body + "<rect class='dt' x='14' y='9' width='72' height='50' rx='4'/><circle class='dt' cx='50' cy='74' r='9'/>" +
      "<line class='ln' x1='50' y1='74' x2='56' y2='68'/>" + front
  },
  fridge: {
    label: "Fridge", width: 4, depth: 3,
    svg: body + "<line class='ln' x1='50' y1='8' x2='50' y2='86'/><rect class='dt' x='39' y='62' width='6' height='18' rx='2'/>" +
      "<rect class='dt' x='55' y='62' width='6' height='18' rx='2'/>" + front
  },
  table: {
    label: "Table", width: 6, depth: 3,
    svg: body + "<rect class='dt' x='10' y='16' width='36' height='56' rx='3'/><rect class='dt' x='54' y='16' width='36' height='56' rx='3'/>" + front
  },
  rackmachine: {
    label: "Rack", width: 2, depth: 4,
    svg: body + "<line class='ln' x1='12' y1='20' x2='88' y2='20'/><line class='ln' x1='12' y1='35' x2='88' y2='35'/>" +
      "<line class='ln' x1='12' y1='50' x2='88' y2='50'/><line class='ln' x1='12' y1='65' x2='88' y2='65'/>" +
      "<line class='ln' x1='12' y1='80' x2='88' y2='80'/>"
  },
  rack: {
    svg: area + "<line class='wl' x1='30' y1='38' x2='70' y2='38'/><line class='wl' x1='30' y1='50' x2='70' y2='50'/>" +
      "<line class='wl' x1='30' y1='62' x2='70' y2='62'/>"
  },
  done: {
    svg: area
  },
  door: {
    svg: "<path class='ln' d='M4 96 L4 6 A90 90 0 0 1 94 96'/><line class='fr2' x1='4' y1='96' x2='94' y2='96'/>"
  },
  sink: {
    svg: body + "<rect class='dt' x='16' y='22' width='68' height='58' rx='12'/><circle class='dt' cx='50' cy='13' r='5'/>"
  },
  shelf: {
    svg: body + "<line class='ln' x1='50' y1='6' x2='50' y2='94'/>" +
      "<circle class='dt' cx='27' cy='20' r='11'/><circle class='dt' cx='27' cy='50' r='11'/><circle class='dt' cx='27' cy='80' r='11'/>" +
      "<rect class='dt' x='60' y='10' width='28' height='22' rx='2'/><rect class='dt' x='60' y='40' width='28' height='22' rx='2'/>"
  }
};
//the pictures a machine can use, plain is the default
export const machinePictures = [
  "plain", "oven", "rackoven", "mixer", "divider", "sheeter",
  "proofer", "fryer", "stove", "kettle", "depositor", "conveyor",
  "slicer", "packer", "scale", "fridge", "table", "rackmachine"
];

//machine = one machine of the Equipment tab, table = where By hand steps happen, rack = where batches wait,
//done = where finished orders go, idle = where waiting workers stand. door, sink and shelf only look like the bakery
export const kinds = {
  machine: { label: "Machine", width: 3, depth: 3 },
  table: { label: "Work table", width: 6, depth: 3, why: "A By hand step needs a Work table" },
  rack: { label: "Waiting area", width: 4, depth: 4, why: "Batches that wait need a Waiting area" },
  done: { label: "Finished spot", width: 6, depth: 4, why: "Finished orders need a Finished spot" },
  door: { label: "Door", width: 3, depth: 3 },
  sink: { label: "Sink", width: 2, depth: 2 },
  shelf: { label: "Storage shelf", width: 2, depth: 5 }
};
//the kinds the Add dialog shows besides the machines
export const spotKinds = ["table", "rack", "done"];
export const otherKinds = ["door", "sink", "shelf"];

//the name of every machine piece: "Oven A", or "Oven A 1" and "Oven A 2" when the quantity is 2
export function machineNames(config) {
  const names = [];
  for (let i = 0; i < config.equipment.length; i++) {
    const machine = config.equipment[i];
    if (machine.quantity === 1) {
      names.push(machine.name);
    } else {
      for (let j = 1; j <= machine.quantity; j++) {
        names.push(machine.name + " " + j);
      }
    }
  }
  return names;
}

export function hasByHandStep(config) {
  for (let i = 0; i < config.steps.length; i++) {
    if (config.steps[i].kind === "By hand") {
      return true;
    }
  }
  return false;
}

export function needsKind(config, kind) {
  if (kind === "table") {
    return hasByHandStep(config);
  }
  return true;
}

export function countOfKind(layout, kind) {
  let count = 0;
  for (let i = 0; i < layout.pieces.length; i++) {
    if (layout.pieces[i].kind === kind) {
      count = count + 1;
    }
  }
  return count;
}

export function canRemove(config, layout, piece) {
  if (piece.kind === "machine") {
    return false;
  }
  if (spotKinds.includes(piece.kind) && needsKind(config, piece.kind)) {
    return countOfKind(layout, piece.kind) > 1;
  }
  return true;
}

//remove a machine that left the Equipment tab, and a table step that is no longer By hand
export function removeOldPieces(config, layout) {
  const names = machineNames(config);
  const kept = [];
  for (let i = 0; i < layout.pieces.length; i++) {
    const piece = layout.pieces[i];
    if (kinds[piece.kind] === undefined) {
      continue;
    }
    if (piece.kind === "machine" && names.includes(piece.name) === false) {
      continue;
    }
    kept.push(piece);
  }
  layout.pieces = kept;
}

export function addMissingPieces(config, layout) {
  const names = machineNames(config);
  for (let i = 0; i < names.length; i++) {
    if (machineOnFloor(layout, names[i]) === null) {
      addFreshPiece(layout, { kind: "machine", name: names[i], picture: "plain", width: kinds.machine.width, depth: kinds.machine.depth });
    }
  }
  for (let i = 0; i < spotKinds.length; i++) {
    const kind = spotKinds[i];
    if (needsKind(config, kind) && countOfKind(layout, kind) === 0) {
      addFreshPiece(layout, { kind: kind, width: kinds[kind].width, depth: kinds[kind].depth });
    }
  }
}

export function addFreshPiece(layout, piece) {
  const spot = freeSpot(layout, piece.width, piece.depth);
  piece.x = spot.x;
  piece.y = spot.y;
  piece.turn = 0;
  piece.fresh = true;
  piece.id = layout.nextId;
  layout.nextId = layout.nextId + 1;
  layout.pieces.push(piece);
}

export function freeSpot(layout, width, depth) {
  for (let y = 0; y + depth <= layout.depth; y++) {
    for (let x = 0; x + width <= layout.width; x++) {
      if (fits(layout, x, y, width, depth, null) && clearAround(layout, x, y, width, depth)) {
        return { x: x, y: y };
      }
    }
  }
  for (let y = 0; y + depth <= layout.depth; y++) {
    for (let x = 0; x + width <= layout.width; x++) {
      if (fits(layout, x, y, width, depth, null)) {
        return { x: x, y: y };
      }
    }
  }
  const x = layout.width;
  layout.width = layout.width + width;
  if (layout.depth < depth) {
    layout.depth = depth;
  }
  return { x: x, y: 0 };
}

export function clearAround(layout, x, y, width, depth) {
  for (let i = 0; i < layout.pieces.length; i++) {
    const other = layout.pieces[i];
    if (x - 1 < other.x + other.width && other.x < x + width + 1 && y - 1 < other.y + other.depth && other.y < y + depth + 1) {
      return false;
    }
  }
  return true;
}

//true when the box is inside the floor and touches no other piece. skip = the piece itself
export function fits(layout, x, y, width, depth, skip) {
  if (x < 0 || y < 0 || x + width > layout.width || y + depth > layout.depth) {
    return false;
  }
  for (let i = 0; i < layout.pieces.length; i++) {
    const other = layout.pieces[i];
    if (other === skip) {
      continue;
    }
    //two boxes touch when they cross left to right and also top to bottom
    if (x < other.x + other.width && other.x < x + width && y < other.y + other.depth && other.y < y + depth) {
      return false;
    }
  }
  return true;
}

export function findPiece(layout, id) {
  for (let i = 0; i < layout.pieces.length; i++) {
    if (layout.pieces[i].id === id) {
      return layout.pieces[i];
    }
  }
  return null;
}

//the machine piece with this name, null if it is not on the floor
export function machineOnFloor(layout, name) {
  for (let i = 0; i < layout.pieces.length; i++) {
    if (layout.pieces[i].kind === "machine" && layout.pieces[i].name === name) {
      return layout.pieces[i];
    }
  }
  return null;
}

//the real size of some tiles, like "34 ft"
export function realLength(layout, tiles) {
  //round to 2 decimals so 0.1 x 3 shows 0.3
  const size = Math.round(tiles * layout.tileSize * 100) / 100;
  return size + " " + layout.tileUnit;
}

//the picture of a piece: a machine uses the picture the user picked
export function pictureOf(piece) {
  if (piece.kind === "machine") {
    return pictures[piece.picture];
  }
  return pictures[piece.kind];
}

//the words on a piece: the machine name, the steps of a table, or the kind
export function pieceLabel(piece) {
  if (piece.kind === "machine") {
    return piece.name;
  }
  return kinds[piece.kind].label;
}

//build the box of one piece: its picture and its name
export function makePieceBox(piece, tile) {
  const pieceBox = document.createElement("div");
  pieceBox.className = "piece";
  if (piece.fresh === true) {
    pieceBox.classList.add("fresh");
  }
  pieceBox.dataset.id = piece.id;
  pieceBox.style.left = piece.x * tile + "px";
  pieceBox.style.top = piece.y * tile + "px";
  pieceBox.style.width = piece.width * tile + "px";
  pieceBox.style.height = piece.depth * tile + "px";
  //the picture keeps clear of the 15px name line at the bottom
  const boxWidth = piece.width * tile;
  let boxHeight = piece.depth * tile - 15;
  if (boxHeight < 6) {
    boxHeight = 6;
  }
  //a turned piece: draw the picture lying down, then rotate it
  let pictureWidth = boxWidth;
  let pictureHeight = boxHeight;
  if (piece.turn === 1 || piece.turn === 3) {
    pictureWidth = boxHeight;
    pictureHeight = boxWidth;
  }
  const picture = document.createElement("div");
  picture.className = "picture";
  picture.style.width = pictureWidth + "px";
  picture.style.height = pictureHeight + "px";
  picture.style.left = (boxWidth - pictureWidth) / 2 + "px";
  picture.style.top = (boxHeight - pictureHeight) / 2 + "px";
  picture.style.transform = "rotate(" + piece.turn * 90 + "deg)";
  //the svg text is ours, not user input, so innerHTML is safe here
  picture.innerHTML = "<svg viewBox='0 0 100 100' preserveAspectRatio='none'>" + pictureOf(piece).svg + "</svg>";
  pieceBox.appendChild(picture);
  const name = document.createElement("div");
  name.className = "piece-name";
  //use textContent since the user typed the machine and step names
  name.textContent = pieceLabel(piece);
  name.title = pieceLabel(piece);
  pieceBox.appendChild(name);
  return pieceBox;
}

export function loadSavedLayouts() {
  const text = localStorage.getItem("bakery-layouts");
  if (text === null) {
    return {};
  }
  return JSON.parse(text);
}

export function saveLayout(configName, layout) {
  const layouts = loadSavedLayouts();
  layouts[configName] = layout;
  localStorage.setItem("bakery-layouts", JSON.stringify(layouts));
}
