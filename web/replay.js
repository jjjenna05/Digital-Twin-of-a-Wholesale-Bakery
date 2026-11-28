import { removeOldPieces } from "./floor.js";
import { addMissingPieces } from "./floor.js";
import { makePieceBox } from "./floor.js";
import { loadSavedLayouts } from "./floor.js";
import { findPiece } from "./floor.js";
import { pieceLabel } from "./floor.js";

const replayTitle = document.getElementById("replay-title");
const replayMessage = document.getElementById("replay-message");
const backLink = document.getElementById("back-to-results");
const replayContent = document.getElementById("replay-content");
const replayHost = document.getElementById("replay-floor-host");
const replayFloor = document.getElementById("replay-floor");
const playButton = document.getElementById("play-button");
const speedPick = document.getElementById("speed-pick");
const clockText = document.getElementById("replay-clock");
const timeSlider = document.getElementById("time-slider");
const ordersBox = document.getElementById("replay-orders");
const legendBox = document.getElementById("replay-legend");
const cardBox = document.getElementById("replay-card");
const timelineBox = document.getElementById("replay-timeline");

const productColors = ["#d98a2b", "#3b6fb6", "#b6553b", "#3b9b7a", "#8a5bb6", "#b69a3b", "#5b6b7a", "#c0558a"];
const roleColors = ["#3b6fb6", "#b6553b", "#3b9b7a", "#8a5bb6", "#b69a3b", "#5b6b7a"];
const speeds = { "Real time": 1 / 60, "Slow": 2, "Normal": 6, "Fast": 20 };
const dotSize = 23;
const slotSize = 30;
const partPadding = 6;
const partLabelHeight = 16;
const partGap = 10;
const stripGap = 14;
const trayNarrow = 58;
const trayWide = 88;
const trayHeight = 15;

let run = null;
let layout = null;
let tile = 20;
let nightLength = 0;
let now = 0;
let shownMinute = -1;
let playing = false;
let speed = speeds["Normal"];
let lastStamp = null;
let picked = null;

let products = [];
let roles = [];
let workers = [];
let tonightMachines = [];
let presences = [];
let jobs = {};
let jobTables = {};
let machinePieces = {};
let tables = [];
let racks = [];
let doneSpots = [];
let restParts = [];
let stripColumns = 3;
let pieceBoxes = {};
let personDots = {};
let orderRows = [];
let nowLines = [];

function clockToMinutes(clock) {
  const parts = clock.split(":");
  const startParts = run.startClock.split(":");
  let minutes = Number(parts[0]) * 60 + Number(parts[1]) - Number(startParts[0]) * 60 - Number(startParts[1]);
  if (minutes < 0) {
    minutes = minutes + 24 * 60;
  }
  return minutes;
}

function clockAt(minute) {
  const startParts = run.startClock.split(":");
  const total = Number(startParts[0]) * 60 + Number(startParts[1]) + Math.floor(minute);
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");
}

function productOf(batchName) {
  const space = batchName.lastIndexOf(" ");
  if (space < 0) {
    return batchName;
  }
  return batchName.slice(0, space);
}

function productColor(product) {
  return productColors[products.indexOf(product) % productColors.length];
}

function roleColor(role) {
  return roleColors[roles.indexOf(role) % roleColors.length];
}

function batchNamesOf(row) {
  if (row.batches !== undefined) {
    return row.batches;
  }
  if (row.batch === undefined || row.batch === "") {
    return [];
  }
  return [row.batch];
}

function makeNightLength() {
  nightLength = Math.ceil(run.summary.finish);
  for (let i = 0; i < run.rows.length; i++) {
    if (run.rows[i].end > nightLength) {
      nightLength = Math.ceil(run.rows[i].end);
    }
  }
  if (nightLength < 1) {
    nightLength = 1;
  }
}

function makeTonightMachines() {
  tonightMachines = [];
  const equipment = run.scenario.equipment;
  for (let i = 0; i < equipment.length; i++) {
    if (equipment[i].count === 1) {
      tonightMachines.push(equipment[i].name);
    }
    if (equipment[i].count > 1) {
      for (let j = 1; j <= equipment[i].count; j++) {
        tonightMachines.push(equipment[i].name + " " + j);
      }
    }
  }
  for (let i = 0; i < run.rows.length; i++) {
    if (run.rows[i].type === "machine" && tonightMachines.includes(run.rows[i].who) === false) {
      tonightMachines.push(run.rows[i].who);
    }
  }
}

function rowNameOf(pieceName) {
  if (tonightMachines.includes(pieceName)) {
    return pieceName;
  }
  if (pieceName.endsWith(" 1")) {
    const baseName = pieceName.slice(0, pieceName.length - 2);
    if (tonightMachines.includes(baseName)) {
      return baseName;
    }
  }
  return null;
}

function pieceOfMachine(rowName) {
  if (machinePieces[rowName] !== undefined) {
    return machinePieces[rowName];
  }
  if (machinePieces[rowName + " 1"] !== undefined) {
    return machinePieces[rowName + " 1"];
  }
  return null;
}

function makeWorkers() {
  workers = [];
  roles = [];
  const counts = {};
  const staff = run.scenario.staff;
  for (let i = 0; i < staff.length; i++) {
    const role = staff[i].role;
    if (roles.includes(role) === false) {
      roles.push(role);
    }
    let shiftStart = 0;
    if (staff[i].shiftStart !== "") {
      shiftStart = clockToMinutes(staff[i].shiftStart);
    }
    let shiftEnd = nightLength;
    if (staff[i].shiftEnd !== "") {
      shiftEnd = clockToMinutes(staff[i].shiftEnd);
      if (shiftEnd < shiftStart) {
        shiftEnd = shiftEnd + 24 * 60;
      }
    }
    for (let j = 0; j < staff[i].count; j++) {
      if (counts[role] === undefined) {
        counts[role] = 0;
      }
      counts[role] = counts[role] + 1;
      workers.push({
        name: role + " " + counts[role],
        role: role,
        shiftStart: shiftStart,
        shiftEnd: shiftEnd,
        segments: []
      });
    }
  }
  for (let i = 0; i < workers.length; i++) {
    const worker = workers[i];
    const rows = [];
    for (let j = 0; j < run.rows.length; j++) {
      if (run.rows[j].type === "worker" && run.rows[j].who === worker.name) {
        rows.push(run.rows[j]);
      }
    }
    rows.sort(function (a, b) {
      return a.start - b.start;
    });
    let time = worker.shiftStart;
    for (let j = 0; j < rows.length; j++) {
      if (rows[j].start > time) {
        worker.segments.push({ kind: "wait", start: time, end: rows[j].start, row: null });
      }
      let kind = "work";
      if (rows[j].kind === "break") {
        kind = "break";
      }
      worker.segments.push({ kind: kind, start: rows[j].start, end: rows[j].end, row: rows[j] });
      if (rows[j].end > time) {
        time = rows[j].end;
      }
    }
    let end = worker.shiftEnd;
    if (end > nightLength) {
      end = nightLength + 1;
    }
    if (time < end) {
      worker.segments.push({ kind: "wait", start: time, end: end, row: null });
    }
  }
}

function segmentOf(worker, time) {
  for (let i = 0; i < worker.segments.length; i++) {
    if (worker.segments[i].start <= time && time < worker.segments[i].end) {
      return worker.segments[i];
    }
  }
  return null;
}

function addPresence(batch, state, step, where, machine, start, end, row) {
  presences.push({
    batch: batch,
    product: productOf(batch),
    state: state,
    step: step,
    where: where,
    machine: machine,
    start: start,
    end: end,
    row: row,
    pieceId: null
  });
}

function makePresences() {
  presences = [];
  products = [];
  const lastEnd = {};
  for (let i = 0; i < run.rows.length; i++) {
    const row = run.rows[i];
    const names = batchNamesOf(row);
    for (let j = 0; j < names.length; j++) {
      if (lastEnd[names[j]] === undefined || row.end > lastEnd[names[j]]) {
        lastEnd[names[j]] = row.end;
      }
      if (products.includes(productOf(names[j])) === false) {
        products.push(productOf(names[j]));
      }
      if (row.type === "machine" && (row.kind === "load" || row.kind === "run" || row.kind === "unload")) {
        addPresence(names[j], "work", row.step, "machine", row.who, row.start, row.end, row);
      }
      if (row.type === "machine" && row.kind === "waiting") {
        addPresence(names[j], "wait", row.step, "machine", row.who, row.start, row.end, row);
      }
      if (row.type === "worker" && row.kind === "work") {
        addPresence(names[j], "work", row.step, "table", "", row.start, row.end, row);
      }
      if (row.type === "batch" && row.kind === "wait") {
        addPresence(names[j], "work", row.step, "rack", "", row.start, row.end, row);
      }
      if (row.type === "batch" && row.kind === "waiting") {
        addPresence(names[j], "wait", row.step, "rack", "", row.start, row.end, row);
      }
    }
  }
  const orders = run.summary.orders;
  const batchNames = Object.keys(lastEnd);
  for (let i = 0; i < batchNames.length; i++) {
    let ready = false;
    for (let j = 0; j < orders.length; j++) {
      if (orders[j].item === productOf(batchNames[i]) && orders[j].ready !== null && orders[j].ready !== undefined) {
        ready = true;
      }
    }
    if (ready === true) {
      addPresence(batchNames[i], "done", "", "done", "", lastEnd[batchNames[i]], nightLength + 1, null);
    }
  }
}

function makeJobs() {
  jobs = {};
  for (let i = 0; i < presences.length; i++) {
    const presence = presences[i];
    if (presence.where !== "table") {
      continue;
    }
    const key = presence.batch + "|" + presence.step;
    if (jobs[key] === undefined) {
      jobs[key] = { from: presence.start, to: presence.end, workers: 1, rows: [] };
    }
    if (presence.start < jobs[key].from) {
      jobs[key].from = presence.start;
    }
    if (presence.end > jobs[key].to) {
      jobs[key].to = presence.end;
    }
    jobs[key].rows.push(presence.row);
  }
  const keys = Object.keys(jobs);
  for (let i = 0; i < keys.length; i++) {
    const rows = jobs[keys[i]].rows;
    for (let j = 0; j < rows.length; j++) {
      let together = 0;
      for (let k = 0; k < rows.length; k++) {
        if (rows[k].start <= rows[j].start && rows[j].start < rows[k].end) {
          together = together + 1;
        }
      }
      if (together > jobs[keys[i]].workers) {
        jobs[keys[i]].workers = together;
      }
    }
  }
}

function giveSlots(kind) {
  const segments = [];
  for (let i = 0; i < workers.length; i++) {
    for (let j = 0; j < workers[i].segments.length; j++) {
      if (workers[i].segments[j].kind === kind) {
        segments.push(workers[i].segments[j]);
      }
    }
  }
  segments.sort(function (a, b) {
    return a.start - b.start;
  });
  const freeAt = [];
  for (let i = 0; i < segments.length; i++) {
    let slot = freeAt.length;
    for (let j = 0; j < freeAt.length; j++) {
      if (freeAt[j] <= segments[i].start) {
        slot = j;
        break;
      }
    }
    segments[i].slot = slot;
    freeAt[slot] = segments[i].end;
  }
  return freeAt.length;
}

function frontRoom(piece) {
  let frontTiles = piece.width;
  if (piece.turn === 1 || piece.turn === 3) {
    frontTiles = piece.depth;
  }
  let room = Math.floor(frontTiles * tile / dotSize) - 1;
  if (room < 1) {
    room = 1;
  }
  return room;
}

function frontSpot(piece, index, count) {
  const perRow = frontRoom(piece);
  const rowNumber = Math.floor(index / perRow);
  let inRow = count - rowNumber * perRow;
  if (inRow > perRow) {
    inRow = perRow;
  }
  const along = (index % perRow + 1) / (inRow + 1);
  const out = 0.75 + rowNumber * dotSize / tile;
  if (piece.turn === 0) {
    return { x: piece.x + piece.width * along, y: piece.y + piece.depth + out };
  }
  if (piece.turn === 1) {
    return { x: piece.x - out, y: piece.y + piece.depth * along };
  }
  if (piece.turn === 2) {
    return { x: piece.x + piece.width * along, y: piece.y - out };
  }
  return { x: piece.x + piece.width + out, y: piece.y + piece.depth * along };
}

function trayRoom(piece) {
  let trayWidth = trayWide;
  if (piece.kind === "rack" || piece.kind === "done") {
    trayWidth = trayNarrow;
  }
  let columns = Math.floor((piece.width * tile - 4) / trayWidth);
  if (columns < 1) {
    columns = 1;
  }
  let rowCount = Math.floor((piece.depth * tile - 18) / trayHeight);
  if (rowCount < 1) {
    rowCount = 1;
  }
  return columns * rowCount;
}

function stepsBetween(pieceA, pieceB) {
  const ax = pieceA.x + pieceA.width / 2;
  const ay = pieceA.y + pieceA.depth / 2;
  const bx = pieceB.x + pieceB.width / 2;
  const by = pieceB.y + pieceB.depth / 2;
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function closestFirst(list, other) {
  const sorted = list.slice();
  if (other !== null) {
    sorted.sort(function (a, b) {
      return stepsBetween(a, other) - stepsBetween(b, other);
    });
  }
  return sorted;
}

function heldAt(holds, piece, time) {
  let list = holds[piece.id];
  if (list === undefined) {
    list = [];
  }
  const still = [];
  for (let i = 0; i < list.length; i++) {
    if (list[i].to > time) {
      still.push(list[i]);
    }
  }
  holds[piece.id] = still;
  return still;
}

function tableFor(job, last, near, holds) {
  if (tables.length === 0) {
    return null;
  }
  let pick = null;
  if (last !== null && last.kind === "table") {
    pick = last;
    heldAt(holds, pick, job.from);
  }
  const order = closestFirst(tables, near);
  let least = null;
  let leastFree = -Infinity;
  for (let i = 0; i < order.length; i++) {
    if (pick !== null) {
      break;
    }
    const there = heldAt(holds, order[i], job.from);
    let busy = 0;
    for (let j = 0; j < there.length; j++) {
      busy = busy + there[j].workers;
    }
    const free = frontRoom(order[i]) - busy - job.workers;
    if (free >= 0) {
      pick = order[i];
    } else if (free > leastFree) {
      least = order[i];
      leastFree = free;
    }
  }
  if (pick === null) {
    pick = least;
  }
  holds[pick.id].push({ to: job.to, workers: job.workers });
  return pick;
}

function spotFor(list, presence, last, near, holds) {
  if (list.length === 0) {
    return null;
  }
  const key = presence.product + "|" + presence.state + "|" + presence.step;
  const order = closestFirst(list, near);
  let pick = null;
  if (last !== null && list.includes(last)) {
    pick = last;
    heldAt(holds, pick, presence.start);
  }
  for (let i = 0; i < order.length; i++) {
    if (pick !== null) {
      break;
    }
    const there = heldAt(holds, order[i], presence.start);
    let productHere = false;
    let trayHere = false;
    const trays = [];
    for (let j = 0; j < there.length; j++) {
      if (there[j].product === presence.product) {
        productHere = true;
      }
      if (there[j].key === key) {
        trayHere = true;
      }
      if (trays.includes(there[j].key) === false) {
        trays.push(there[j].key);
      }
    }
    if (productHere === true && (trayHere === true || trays.length < trayRoom(order[i]))) {
      pick = order[i];
    }
  }
  let least = null;
  let leastFree = -Infinity;
  for (let i = 0; i < order.length; i++) {
    if (pick !== null) {
      break;
    }
    const there = heldAt(holds, order[i], presence.start);
    const trays = [];
    for (let j = 0; j < there.length; j++) {
      if (trays.includes(there[j].key) === false) {
        trays.push(there[j].key);
      }
    }
    const free = trayRoom(order[i]) - trays.length - 1;
    if (free >= 0) {
      pick = order[i];
    } else if (free > leastFree) {
      least = order[i];
      leastFree = free;
    }
  }
  if (pick === null) {
    pick = least;
  }
  holds[pick.id].push({ to: presence.end, key: key, product: presence.product });
  return pick;
}

function staysPut(presence) {
  for (let i = 0; i < presences.length; i++) {
    const other = presences[i];
    if (other !== presence && other.batch === presence.batch && other.where === presence.where && other.end === presence.start) {
      return 1;
    }
  }
  return 0;
}

function firstMachineOf(batch) {
  let first = null;
  for (let i = 0; i < presences.length; i++) {
    if (presences[i].batch === batch && presences[i].where === "machine") {
      if (first === null || presences[i].start < first.start) {
        first = presences[i];
      }
    }
  }
  if (first === null) {
    return null;
  }
  return pieceOfMachine(first.machine);
}

function placePresences() {
  const ordered = presences.slice();
  for (let i = 0; i < ordered.length; i++) {
    ordered[i].stays = staysPut(ordered[i]);
  }
  ordered.sort(function (a, b) {
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    return b.stays - a.stays;
  });
  const holds = {};
  const lastOf = {};
  jobTables = {};
  for (let i = 0; i < ordered.length; i++) {
    const presence = ordered[i];
    let last = null;
    if (lastOf[presence.batch] !== undefined) {
      last = lastOf[presence.batch];
    }
    let near = last;
    if (near === null) {
      near = firstMachineOf(presence.batch);
    }
    let piece = null;
    if (presence.where === "machine") {
      piece = pieceOfMachine(presence.machine);
    }
    if (presence.where === "table") {
      const key = presence.batch + "|" + presence.step;
      if (jobTables[key] === undefined) {
        jobTables[key] = tableFor(jobs[key], last, near, holds);
      }
      piece = jobTables[key];
    }
    if (presence.where === "rack") {
      piece = spotFor(racks, presence, last, near, holds);
    }
    if (presence.where === "done") {
      piece = spotFor(doneSpots, presence, last, near, holds);
    }
    presence.pieceId = null;
    if (piece !== null) {
      presence.pieceId = piece.id;
      lastOf[presence.batch] = piece;
    }
  }
}

function partHeight(part) {
  return partLabelHeight + partPadding * 2 + Math.ceil(part.slots / stripColumns) * slotSize;
}

function pickStripColumns() {
  const room = replayHost.clientHeight - 40;
  for (stripColumns = 3; stripColumns < 12; stripColumns++) {
    let height = 0;
    for (let i = 0; i < restParts.length; i++) {
      if (restParts[i].slots > 0) {
        height = height + partHeight(restParts[i]) + partGap;
      }
    }
    if (height - partGap <= room) {
      break;
    }
  }
}

function stripWidth() {
  if (restParts[0].slots === 0 && restParts[1].slots === 0) {
    return 0;
  }
  return stripGap + stripColumns * slotSize + partPadding * 2;
}

function drawStrip() {
  let top = 0;
  for (let i = 0; i < restParts.length; i++) {
    const part = restParts[i];
    if (part.slots === 0) {
      continue;
    }
    part.left = layout.width * tile + stripGap;
    part.top = top;
    const partBox = document.createElement("div");
    partBox.className = "rest-part";
    partBox.style.left = part.left + "px";
    partBox.style.top = part.top + "px";
    partBox.style.width = stripColumns * slotSize + partPadding * 2 + "px";
    partBox.style.height = partHeight(part) + "px";
    const label = document.createElement("div");
    label.className = "rest-label";
    label.textContent = part.label;
    partBox.appendChild(label);
    replayFloor.appendChild(partBox);
    top = top + partHeight(part) + partGap;
  }
}

function slotSpot(state, slot) {
  for (let i = 0; i < restParts.length; i++) {
    const part = restParts[i];
    if (part.state === state) {
      const column = slot % stripColumns;
      const rowNumber = Math.floor(slot / stripColumns);
      return {
        x: part.left + partPadding + column * slotSize + slotSize / 2,
        y: part.top + partLabelHeight + partPadding + rowNumber * slotSize + slotSize / 2
      };
    }
  }
  return null;
}

function initialsOf(name) {
  const parts = name.split(" ");
  let letters = "";
  for (let i = 0; i < parts.length; i++) {
    if (i < 3) {
      letters = letters + parts[i].charAt(0).toUpperCase();
    }
  }
  return letters;
}

function drawFloor() {
  pickStripColumns();
  tile = Math.floor(Math.min((replayHost.clientWidth - 40 - stripWidth()) / layout.width, (replayHost.clientHeight - 40) / layout.depth));
  if (tile < 8) {
    tile = 8;
  }
  if (tile > 34) {
    tile = 34;
  }
  replayFloor.style.width = layout.width * tile + "px";
  replayFloor.style.height = layout.depth * tile + "px";
  replayFloor.style.backgroundSize = tile + "px " + tile + "px";
  replayFloor.style.marginRight = stripWidth() + "px";
  placePresences();
  replayFloor.replaceChildren();
  pieceBoxes = {};
  personDots = {};
  for (let i = 0; i < layout.pieces.length; i++) {
    const piece = layout.pieces[i];
    const pieceBox = makePieceBox(piece, tile);
    const trays = document.createElement("div");
    trays.className = "trays";
    pieceBox.appendChild(trays);
    if (piece.kind === "machine" && rowNameOf(piece.name) === null) {
      const offTag = document.createElement("div");
      offTag.className = "off-tag";
      offTag.textContent = "Not working tonight";
      pieceBox.appendChild(offTag);
    }
    pieceBoxes[piece.id] = pieceBox;
    replayFloor.appendChild(pieceBox);
  }
  drawStrip();
  for (let i = 0; i < workers.length; i++) {
    const dot = document.createElement("div");
    dot.className = "person off";
    dot.textContent = initialsOf(workers[i].name);
    dot.title = workers[i].name;
    dot.dataset.name = workers[i].name;
    dot.style.background = roleColor(workers[i].role);
    personDots[workers[i].name] = dot;
    replayFloor.appendChild(dot);
  }
  shownMinute = -1;
  showNow();
}

function machineState(pieceName, time) {
  const rowName = rowNameOf(pieceName);
  if (rowName === null) {
    return "off";
  }
  let inUse = false;
  let waiting = false;
  let switching = false;
  let warming = false;
  for (let i = 0; i < run.rows.length; i++) {
    const row = run.rows[i];
    if (row.type !== "machine" || row.who !== rowName || row.start > time || time >= row.end) {
      continue;
    }
    if (row.kind === "load" || row.kind === "run" || row.kind === "unload") {
      inUse = true;
    }
    if (row.kind === "waiting") {
      waiting = true;
    }
    if (row.kind === "switch") {
      switching = true;
    }
    if (row.kind === "warmup") {
      warming = true;
    }
  }
  if (inUse === true) {
    return "run";
  }
  if (waiting === true) {
    return "full";
  }
  if (switching === true) {
    return "switch";
  }
  if (warming === true) {
    return "warmup";
  }
  return "idle";
}

function showMachines(time) {
  const states = ["run", "full", "switch", "warmup", "idle", "off"];
  for (let i = 0; i < layout.pieces.length; i++) {
    const piece = layout.pieces[i];
    if (piece.kind !== "machine") {
      continue;
    }
    for (let j = 0; j < states.length; j++) {
      pieceBoxes[piece.id].classList.remove("state-" + states[j]);
    }
    pieceBoxes[piece.id].classList.add("state-" + machineState(piece.name, time));
  }
}

function traysAt(time) {
  const byPiece = {};
  for (let i = 0; i < presences.length; i++) {
    const presence = presences[i];
    if (presence.pieceId === null || presence.start > time || time >= presence.end) {
      continue;
    }
    const key = presence.product + "|" + presence.state + "|" + presence.step;
    if (byPiece[presence.pieceId] === undefined) {
      byPiece[presence.pieceId] = {};
    }
    if (byPiece[presence.pieceId][key] === undefined) {
      byPiece[presence.pieceId][key] = {
        key: key,
        product: presence.product,
        state: presence.state,
        step: presence.step,
        batches: [],
        rows: []
      };
    }
    const group = byPiece[presence.pieceId][key];
    if (group.batches.includes(presence.batch) === false) {
      group.batches.push(presence.batch);
      group.rows.push(presence.row);
    }
  }
  return byPiece;
}

function trayWords(group, piece) {
  if (group.state === "work") {
    return group.step;
  }
  if (group.state === "wait" && piece.kind !== "rack") {
    return "waiting";
  }
  if (group.state === "done" && piece.kind !== "done") {
    return "done";
  }
  return group.product;
}

function showTrays(time) {
  const byPiece = traysAt(time);
  for (let i = 0; i < layout.pieces.length; i++) {
    const piece = layout.pieces[i];
    const traysBox = pieceBoxes[piece.id].querySelector(".trays");
    let groups = byPiece[piece.id];
    if (groups === undefined) {
      groups = {};
    }
    const keys = Object.keys(groups);
    let mark = "";
    for (let j = 0; j < keys.length; j++) {
      mark = mark + keys[j] + "=" + groups[keys[j]].batches.length + ";";
    }
    if (traysBox.dataset.mark === mark) {
      continue;
    }
    traysBox.dataset.mark = mark;
    traysBox.replaceChildren();
    let shown = keys.length;
    if (keys.length > trayRoom(piece)) {
      shown = trayRoom(piece) - 1;
    }
    for (let j = 0; j < shown; j++) {
      const group = groups[keys[j]];
      const tray = document.createElement("div");
      tray.className = "tray " + group.state;
      tray.dataset.key = group.key;
      tray.title = group.batches.join(", ") + ": " + trayWords(group, piece);
      const swatch = document.createElement("div");
      swatch.className = "swatch";
      swatch.style.background = productColor(group.product);
      tray.appendChild(swatch);
      const words = document.createElement("span");
      words.textContent = trayWords(group, piece);
      tray.appendChild(words);
      traysBox.appendChild(tray);
    }
    if (shown < keys.length) {
      const more = document.createElement("div");
      more.className = "tray more";
      more.textContent = "+" + (keys.length - shown) + " more";
      traysBox.appendChild(more);
    }
  }
}

function pieceOfWork(row) {
  if (row.kind === "work") {
    const table = jobTables[row.batch + "|" + row.step];
    if (table !== undefined) {
      return table;
    }
    return null;
  }
  for (let i = 0; i < run.rows.length; i++) {
    const other = run.rows[i];
    if (other.type === "machine" && other.kind === row.kind && other.batch === row.batch && other.step === row.step && other.start === row.start) {
      return pieceOfMachine(other.who);
    }
  }
  return null;
}

function peopleAt(time) {
  const people = [];
  for (let i = 0; i < workers.length; i++) {
    const segment = segmentOf(workers[i], time);
    let state = "off";
    let piece = null;
    if (segment !== null) {
      state = segment.kind;
      if (segment.kind === "work") {
        piece = pieceOfWork(segment.row);
      }
    }
    people.push({ worker: workers[i], state: state, piece: piece, segment: segment });
  }
  return people;
}

function doorSpot() {
  for (let i = 0; i < layout.pieces.length; i++) {
    const piece = layout.pieces[i];
    if (piece.kind === "door") {
      return { x: piece.x + piece.width / 2, y: piece.y + piece.depth / 2 };
    }
  }
  return { x: layout.width / 2, y: layout.depth - 0.5 };
}

function showPeople(time) {
  const people = peopleAt(time);
  const counts = {};
  for (let i = 0; i < people.length; i++) {
    if (people[i].piece !== null) {
      if (counts[people[i].piece.id] === undefined) {
        counts[people[i].piece.id] = 0;
      }
      counts[people[i].piece.id] = counts[people[i].piece.id] + 1;
    }
  }
  const taken = {};
  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    const dot = personDots[person.worker.name];
    let spot = null;
    if (person.state === "wait" || person.state === "break") {
      spot = slotSpot(person.state, person.segment.slot);
    } else if (person.piece !== null) {
      if (taken[person.piece.id] === undefined) {
        taken[person.piece.id] = 0;
      }
      const tileSpot = frontSpot(person.piece, taken[person.piece.id], counts[person.piece.id]);
      taken[person.piece.id] = taken[person.piece.id] + 1;
      spot = { x: tileSpot.x * tile, y: tileSpot.y * tile };
    }
    if (spot === null) {
      const door = doorSpot();
      spot = { x: door.x * tile, y: door.y * tile };
    }
    dot.style.transform = "translate(" + spot.x + "px," + spot.y + "px)";
    dot.className = "person " + person.state;
    if (picked !== null && picked.what === "person" && picked.name === person.worker.name) {
      dot.classList.add("picked");
    }
  }
}

function makeOrders() {
  ordersBox.replaceChildren();
  orderRows = [];
  const orders = run.summary.orders;
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const orderBox = document.createElement("div");
    orderBox.className = "order";
    const top = document.createElement("div");
    top.className = "order-top";
    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.background = productColor(order.item);
    top.appendChild(swatch);
    const name = document.createElement("span");
    name.className = "order-name";
    name.textContent = order.item;
    top.appendChild(name);
    const quantity = document.createElement("span");
    quantity.className = "order-quantity";
    quantity.textContent = order.quantity + " " + order.unit;
    top.appendChild(quantity);
    const status = document.createElement("span");
    status.className = "order-status";
    top.appendChild(status);
    orderBox.appendChild(top);
    const meter = document.createElement("div");
    meter.className = "order-meter";
    const fill = document.createElement("div");
    meter.appendChild(fill);
    orderBox.appendChild(meter);
    ordersBox.appendChild(orderBox);
    orderRows.push({ status: status, fill: fill });
  }
  legendBox.replaceChildren();
  for (let i = 0; i < products.length; i++) {
    const item = document.createElement("span");
    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.background = productColor(products[i]);
    item.appendChild(swatch);
    item.append(products[i]);
    legendBox.appendChild(item);
  }
}

function showOrders(time) {
  const orders = run.summary.orders;
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    let total = 0;
    let done = 0;
    for (let j = 0; j < presences.length; j++) {
      if (presences[j].where === "done" && presences[j].product === order.item) {
        total = total + 1;
        if (presences[j].start <= time) {
          done = done + 1;
        }
      }
    }
    let part = 0;
    if (total > 0) {
      part = done / total;
    }
    orderRows[i].fill.style.width = Math.round(part * 100) + "%";
    orderRows[i].status.className = "order-status";
    if (order.ready !== null && order.ready !== undefined && time >= order.ready) {
      if (order.lateBy > 0) {
        orderRows[i].status.textContent = "Late " + Math.round(order.lateBy) + " min";
        orderRows[i].status.classList.add("late");
      } else {
        orderRows[i].status.textContent = "On time";
      }
    } else {
      orderRows[i].status.textContent = "Due " + order.deadline;
    }
  }
}

function addCardLine(tag, text, className) {
  const line = document.createElement(tag);
  line.textContent = text;
  if (className !== "") {
    line.className = className;
  }
  cardBox.appendChild(line);
}

function addTrayLines(group) {
  for (let i = 0; i < group.batches.length; i++) {
    let text = group.batches[i] + ": ";
    if (group.state === "done") {
      text = text + "ready";
    } else if (group.state === "wait") {
      text = text + "waiting";
      if (group.step !== "") {
        text = text + " for " + group.step;
      }
    } else {
      text = text + group.step;
    }
    addCardLine("p", text, "");
    const row = group.rows[i];
    if (row !== null && row.because !== undefined) {
      addCardLine("p", "Waiting for " + row.for + ". " + row.because + ".", "grey");
    }
  }
}

function showCard(time) {
  cardBox.replaceChildren();
  const marked = replayFloor.querySelectorAll(".picked");
  for (let i = 0; i < marked.length; i++) {
    marked[i].classList.remove("picked");
  }
  if (picked === null) {
    return;
  }
  const byPiece = traysAt(time);
  if (picked.what === "person") {
    const people = peopleAt(time);
    for (let i = 0; i < people.length; i++) {
      if (people[i].worker.name !== picked.name) {
        continue;
      }
      personDots[picked.name].classList.add("picked");
      addCardLine("h4", picked.name, "");
      addCardLine("p", people[i].worker.role, "grey");
      const segment = people[i].segment;
      if (segment === null) {
        addCardLine("p", "Not on shift", "");
      } else if (segment.kind === "wait") {
        addCardLine("p", "Waiting for work, " + clockAt(segment.start) + " to " + clockAt(segment.end), "");
      } else if (segment.kind === "break") {
        addCardLine("p", "On break, " + clockAt(segment.start) + " to " + clockAt(segment.end), "");
      } else {
        let text = segment.row.kind + " " + segment.row.step;
        if (segment.row.batch !== "") {
          text = text + ", " + segment.row.batch;
        }
        addCardLine("p", text + ", " + clockAt(segment.start) + " to " + clockAt(segment.end), "");
      }
    }
    return;
  }
  let groups = byPiece[picked.pieceId];
  if (groups === undefined) {
    groups = {};
  }
  if (picked.what === "tray" && groups[picked.key] !== undefined) {
    const trays = pieceBoxes[picked.pieceId].querySelectorAll(".tray");
    for (let i = 0; i < trays.length; i++) {
      if (trays[i].dataset.key === picked.key) {
        trays[i].classList.add("picked");
      }
    }
    addCardLine("h4", groups[picked.key].product, "");
    addTrayLines(groups[picked.key]);
    return;
  }
  const piece = findPiece(layout, picked.pieceId);
  pieceBoxes[piece.id].classList.add("picked");
  addCardLine("h4", pieceLabel(piece), "");
  if (piece.kind === "machine") {
    const state = machineState(piece.name, time);
    const words = { run: "In use", full: "Waiting for a worker", switch: "Switching", warmup: "Warming up", idle: "Idle", off: "Not working tonight" };
    addCardLine("p", words[state], "grey");
  }
  const people = peopleAt(time);
  for (let i = 0; i < people.length; i++) {
    if (people[i].piece === piece) {
      addCardLine("p", people[i].worker.name + ": " + people[i].segment.row.kind + " " + people[i].segment.row.step, "");
    }
  }
  const keys = Object.keys(groups);
  for (let i = 0; i < keys.length; i++) {
    addTrayLines(groups[keys[i]]);
  }
}

function addTimelineGroup(title, names, isMachine) {
  const heading = document.createElement("h3");
  heading.textContent = title;
  timelineBox.appendChild(heading);
  const rowsBox = document.createElement("div");
  rowsBox.className = "timeline-rows";
  for (let i = 0; i < names.length; i++) {
    const rowBox = document.createElement("div");
    rowBox.className = "timeline-row";
    const name = document.createElement("div");
    name.className = "timeline-name";
    name.textContent = names[i];
    name.title = names[i];
    rowBox.appendChild(name);
    const bar = document.createElement("div");
    bar.className = "timeline-bar";
    let parts = [];
    if (isMachine === true) {
      bar.classList.add("machine");
      for (let j = 0; j < run.rows.length; j++) {
        if (run.rows[j].type === "machine" && run.rows[j].who === names[i]) {
          parts.push({ kind: run.rows[j].kind, start: run.rows[j].start, end: run.rows[j].end });
        }
      }
    } else {
      parts = workers[i].segments;
    }
    for (let j = 0; j < parts.length; j++) {
      const partBox = document.createElement("div");
      partBox.className = "kind-" + parts[j].kind;
      partBox.style.left = parts[j].start / nightLength * 100 + "%";
      partBox.style.width = (parts[j].end - parts[j].start) / nightLength * 100 + "%";
      partBox.title = parts[j].kind + ", " + clockAt(parts[j].start) + " to " + clockAt(parts[j].end);
      bar.appendChild(partBox);
    }
    bar.addEventListener("click", function (event) {
      const box = bar.getBoundingClientRect();
      setNow((event.clientX - box.left) / box.width * nightLength);
    });
    rowBox.appendChild(bar);
    rowsBox.appendChild(rowBox);
  }
  const nowLine = document.createElement("div");
  nowLine.className = "timeline-now";
  rowsBox.appendChild(nowLine);
  nowLines.push(nowLine);
  timelineBox.appendChild(rowsBox);
  const hours = document.createElement("div");
  hours.className = "timeline-hours";
  const startParts = run.startClock.split(":");
  const firstHour = (60 - Number(startParts[1])) % 60;
  for (let minute = firstHour; minute <= nightLength; minute = minute + 60) {
    const hour = document.createElement("span");
    hour.textContent = clockAt(minute);
    hour.style.left = minute / nightLength * 100 + "%";
    hours.appendChild(hour);
  }
  timelineBox.appendChild(hours);
}

function addTimelineKey(pairs) {
  const key = document.createElement("div");
  key.className = "timeline-key";
  for (let i = 0; i < pairs.length; i++) {
    const square = document.createElement("div");
    square.className = pairs[i][0];
    key.appendChild(square);
    key.append(pairs[i][1]);
  }
  timelineBox.appendChild(key);
}

function makeTimeline() {
  timelineBox.replaceChildren();
  nowLines = [];
  addTimelineGroup("Equipment", tonightMachines, true);
  addTimelineKey([["kind-run", "in use"], ["kind-waiting", "waiting for worker"], ["kind-switch", "switching"], ["kind-warmup", "warming up"], ["kind-idle", "idle"]]);
  const names = [];
  for (let i = 0; i < workers.length; i++) {
    names.push(workers[i].name);
  }
  addTimelineGroup("Staff", names, false);
  addTimelineKey([["kind-work", "working"], ["kind-wait", "waiting for work"], ["kind-break", "on break"]]);
}

function showNow() {
  timeSlider.value = Math.floor(now);
  for (let i = 0; i < nowLines.length; i++) {
    nowLines[i].style.left = "calc(140px + (100% - 140px) * " + now / nightLength + ")";
  }
  let minute = Math.floor(now);
  if (minute > nightLength) {
    minute = nightLength;
  }
  let clockWords = clockAt(minute);
  if (speed === speeds["Real time"]) {
    const seconds = Math.floor((now - Math.floor(now)) * 60);
    clockWords = clockWords + ":" + String(seconds).padStart(2, "0");
  }
  if (clockText.textContent !== clockWords) {
    clockText.textContent = clockWords;
  }
  if (minute === shownMinute) {
    return;
  }
  shownMinute = minute;
  showMachines(minute);
  showTrays(minute);
  showPeople(minute);
  showOrders(minute);
  showCard(minute);
}

function setNow(minute) {
  now = minute;
  if (now < 0) {
    now = 0;
  }
  if (now > nightLength) {
    now = nightLength;
  }
  showNow();
}

function tick(stamp) {
  if (playing === false) {
    return;
  }
  if (lastStamp !== null) {
    now = now + (stamp - lastStamp) / 1000 * speed;
  }
  lastStamp = stamp;
  if (now >= nightLength) {
    now = nightLength;
    playing = false;
    playButton.textContent = "Play";
  }
  showNow();
  requestAnimationFrame(tick);
}

playButton.addEventListener("click", function () {
  if (playing === true) {
    playing = false;
    playButton.textContent = "Play";
    return;
  }
  playing = true;
  playButton.textContent = "Pause";
  if (now >= nightLength) {
    now = 0;
  }
  lastStamp = null;
  requestAnimationFrame(tick);
});

speedPick.addEventListener("change", function () {
  speed = speeds[speedPick.value];
  showNow();
});

timeSlider.addEventListener("input", function () {
  setNow(Number(timeSlider.value));
});

replayFloor.addEventListener("click", function (event) {
  const tray = event.target.closest(".tray");
  const dot = event.target.closest(".person");
  const pieceBox = event.target.closest(".piece");
  if (tray !== null && tray.dataset.key !== undefined) {
    picked = { what: "tray", pieceId: Number(pieceBox.dataset.id), key: tray.dataset.key };
  } else if (dot !== null) {
    picked = { what: "person", name: dot.dataset.name };
  } else if (pieceBox !== null) {
    picked = { what: "piece", pieceId: Number(pieceBox.dataset.id) };
  } else {
    picked = null;
  }
  showCard(shownMinute);
});

window.addEventListener("resize", function () {
  if (layout !== null) {
    drawFloor();
  }
});

async function loadRun() {
  const runName = new URLSearchParams(window.location.search).get("run");
  if (runName === null) {
    replayMessage.textContent = "No run to replay!";
    return;
  }
  const response = await fetch("/api/runs/" + encodeURIComponent(runName));
  if (response.status === 401) {
    window.location.href = "login.html";
    return;
  }
  if (response.ok === false) {
    replayMessage.textContent = "This run was not found!";
    return;
  }
  run = await response.json();
  replayTitle.textContent = "Replay: " + run.name;
  backLink.href = "SimReport.html?run=" + encodeURIComponent(run.name);
  layout = loadSavedLayouts()[run.config.name];
  if (layout === undefined) {
    layout = {
      width: 24,
      depth: 16,
      tileSize: 1,
      tileUnit: "ft",
      nextId: 1,
      pieces: []
    };
  }
  removeOldPieces(run.config, layout);
  addMissingPieces(run.config, layout);
  machinePieces = {};
  tables = [];
  racks = [];
  doneSpots = [];
  for (let i = 0; i < layout.pieces.length; i++) {
    const piece = layout.pieces[i];
    if (piece.kind === "machine") {
      machinePieces[piece.name] = piece;
    }
    if (piece.kind === "table") {
      tables.push(piece);
    }
    if (piece.kind === "rack") {
      racks.push(piece);
    }
    if (piece.kind === "done") {
      doneSpots.push(piece);
    }
  }
  makeNightLength();
  makeTonightMachines();
  makeWorkers();
  makePresences();
  makeJobs();
  restParts = [
    { state: "wait", label: "Idle workers", slots: giveSlots("wait"), left: 0, top: 0 },
    { state: "break", label: "Workers on break", slots: giveSlots("break"), left: 0, top: 0 }
  ];
  timeSlider.max = nightLength;
  replayContent.hidden = false;
  makeOrders();
  makeTimeline();
  drawFloor();
}

loadRun();
