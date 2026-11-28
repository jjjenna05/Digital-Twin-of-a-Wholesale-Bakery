// Results page: shows one saved run, read from GET /api/runs/<name>.
// The run name comes from the address, e.g. SimReport.html?run=Tonight

const MIN_WAIT = 3; // "Find out why" lists only waits of 3 min or more

const reportBox = document.getElementById("report");
const messageBox = document.getElementById("reportMessage");

// ---------- time helpers ----------

// "22:00" -> 1320 (minutes after midnight)
function clockToMinutes(clock) {
  const parts = String(clock || "00:00").split(":");
  return Number(parts[0]) * 60 + Number(parts[1] || 0);
}

// minutes after the night starts -> clock time, e.g. 250 after 22:00 -> "02:10"
function toClock(minutes, startClock) {
  const total = (clockToMinutes(startClock) + Math.round(Number(minutes) || 0)) % 1440;
  const fixed = (total + 1440) % 1440; // past 23:59 the clock starts again at 00:00
  const hours = Math.floor(fixed / 60);
  const mins = fixed % 60;
  return String(hours).padStart(2, "0") + ":" + String(mins).padStart(2, "0");
}

// length of time, e.g. 17 -> "17 min", 247 -> "4 h 7 min", 60 -> "1 h"
function toDuration(minutes) {
  const total = Math.round(Number(minutes) || 0);
  if (total < 60) return total + " min";
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins === 0 ? hours + " h" : hours + " h " + mins + " min";
}

// ---------- small DOM helpers ----------

function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function cell(text) {
  return make("td", "", text);
}

function emptyNote(text) {
  return make("p", "emptyNote", text);
}

// a bar made of parts: [{ className, minutes, label }]
// each part's width is its share of the bar's total
function makeBar(parts, ariaLabel) {
  const bar = make("div", "bar");
  bar.setAttribute("role", "img");
  bar.setAttribute("aria-label", ariaLabel);

  const total = parts.reduce(function (sum, part) { return sum + part.minutes; }, 0);
  parts.forEach(function (part) {
    if (part.minutes <= 0) return; // nothing to draw
    const segment = make("span", part.className);
    segment.dataset.minutes = String(part.minutes);
    segment.style.width = (part.minutes / total) * 100 + "%";
    segment.title = toDuration(part.minutes) + " " + part.label;
    bar.appendChild(segment);
  });
  return bar;
}

// one labelled bar row, placed before the legend of its breakdown box
function addBarRow(box, name, bar, valueText, extraClass) {
  const row = make("div", "breakdownRow" + (extraClass ? " " + extraClass : ""));
  row.appendChild(make("span", "rowLabel", name));
  row.appendChild(bar);
  row.appendChild(make("span", "rowValue", valueText));
  box.insertBefore(row, box.querySelector(".legend"));
}

// ---------- sections ----------

// Orders table: Item | Quantity | Due | Ready | Status
function showOrders(orders, startClock) {
  const body = document.getElementById("ordersBody");
  body.innerHTML = "";

  orders.forEach(function (order) {
    const row = document.createElement("tr");
    row.appendChild(cell(order.item));
    row.appendChild(cell(order.quantity + " " + order.unit));
    row.appendChild(cell(order.deadline || toClock(order.deadlineMinutes, startClock)));
    row.appendChild(cell(toClock(order.ready, startClock)));

    const lateBy = Math.round(Number(order.lateBy) || 0);
    const status = lateBy > 0
      ? make("span", "status late", "Late " + lateBy + " min")
      : make("span", "status", "On time");
    const statusCell = document.createElement("td");
    statusCell.appendChild(status);
    row.appendChild(statusCell);

    body.appendChild(row);
  });
}

// "Find out why": one section per late order with that item's waits
function showLateOrders(orders, waits, startClock) {
  const holder = document.getElementById("lateSections");
  holder.innerHTML = "";

  const lateOrders = orders.filter(function (order) { return Number(order.lateBy) > 0; });
  holder.hidden = lateOrders.length === 0;

  lateOrders.forEach(function (order, index) {
    const titleId = "late-title-" + index;
    const section = make("section", "lateSection");
    section.setAttribute("aria-labelledby", titleId);

    const title = make("h2", "", "Find out why " + order.item + " was " +
      Math.round(Number(order.lateBy)) + " min late");
    title.id = titleId;
    section.appendChild(title);

    const itemWaits = waits
      .filter(function (wait) { return wait.item === order.item && Number(wait.minutes) >= MIN_WAIT; })
      .sort(function (a, b) { return Number(a.start) - Number(b.start); });

    if (itemWaits.length === 0) {
      section.appendChild(make("p", "sectionNote", "No waits of " + MIN_WAIT + " minutes or more were found."));
      holder.appendChild(section);
      return;
    }

    section.appendChild(make("p", "sectionNote", "Every wait of " + MIN_WAIT + " minutes or more listed below in order"));

    const list = make("ol", "timeline");
    itemWaits.forEach(function (wait) {
      const item = document.createElement("li");

      const stamp = make("span", "stamp", "At ");
      stamp.appendChild(make("strong", "", toClock(wait.start, startClock)));
      item.appendChild(stamp);

      const event = make("p", "event",
        (wait.batch || wait.item) + " was waiting for " + wait.for + " for " + toDuration(wait.minutes) + ".");
      if (wait.because) {
        event.appendChild(make("span", "detail", wait.because));
      }
      item.appendChild(event);

      list.appendChild(item);
    });
    section.appendChild(list);
    holder.appendChild(section);
  });
}

// Staff working breakdown: working and waiting for each person
// (onBreak is always 0 for now, so it is not drawn)
function showStaff(staff) {
  const box = document.getElementById("staffBreakdown");
  if (!staff || staff.length === 0) {
    box.insertBefore(emptyNote("No staff in this run."), box.querySelector(".legend"));
    return;
  }

  staff.forEach(function (person) {
    const working = Math.round(Number(person.working) || 0);
    const waiting = Math.round(Number(person.waiting) || 0);
    const text = toDuration(working) + " working, " + toDuration(waiting) + " waiting";
    const bar = makeBar([
      { className: "working", minutes: working, label: "working" },
      { className: "waiting", minutes: waiting, label: "waiting" }
    ], text);
    addBarRow(box, person.who, bar, text);
  });
}

// Equipment usage breakdown: in use, waiting for worker, switching, warming up, idle
// (unavailable is always 0 for now, so it is not drawn)
const EQUIPMENT_PARTS = [
  { key: "inUse", className: "inUse", label: "in use" },
  { key: "waitingForWorker", className: "waitingForWorker", label: "waiting for worker" },
  { key: "switching", className: "switching", label: "switching" },
  { key: "warmingUp", className: "warming", label: "warming up" },
  { key: "idle", className: "idle", label: "idle" }
];

function showEquipment(equipment, finish) {
  const box = document.getElementById("equipmentBreakdown");
  const note = document.getElementById("equipmentNote");
  note.textContent = finish > 0 ? "Share of the " + toDuration(finish) + " production run" : "";

  if (!equipment || equipment.length === 0) {
    box.insertBefore(emptyNote("No equipment data in this run."), box.querySelector(".legend"));
    return;
  }

  equipment.forEach(function (machine) {
    const parts = EQUIPMENT_PARTS.map(function (part) {
      return {
        className: part.className,
        minutes: Math.round(Number(machine[part.key]) || 0),
        label: part.label
      };
    });
    const label = parts
      .filter(function (part) { return part.minutes > 0; })
      .map(function (part) { return toDuration(part.minutes) + " " + part.label; })
      .join(", ") || "not used";
    const bar = makeBar(parts, label);
    addBarRow(box, machine.name, bar, toDuration(parts[0].minutes) + " in use", "equipmentRow");
  });
}

// Time per step: one row per item, one column per step (in config order), then Total
function showTimePerStep(timePerStep, configSteps) {
  const head = document.getElementById("stepsHead");
  const totalHead = document.getElementById("stepsTotalHead");
  const body = document.getElementById("stepsBody");
  head.querySelectorAll(".stepCol").forEach(function (th) { th.remove(); });
  body.innerHTML = "";

  if (!timePerStep || timePerStep.length === 0) {
    const row = document.createElement("tr");
    const empty = cell("No step times in this run.");
    empty.colSpan = 2;
    row.appendChild(empty);
    body.appendChild(row);
    return;
  }

  // steps some item uses
  const used = new Set();
  timePerStep.forEach(function (item) {
    (item.steps || []).forEach(function (step) { used.add(step.step); });
  });

  // keep the order of config.steps; any step not in the config goes at the end
  const columns = (configSteps || [])
    .map(function (step) { return step.name; })
    .filter(function (name) { return used.has(name); });
  used.forEach(function (name) {
    if (!columns.includes(name)) columns.push(name);
  });

  columns.forEach(function (name) {
    const th = make("th", "stepCol", name);
    th.scope = "col";
    head.insertBefore(th, totalHead);
  });

  timePerStep.forEach(function (item) {
    const minutesByStep = {};
    (item.steps || []).forEach(function (step) { minutesByStep[step.step] = step.minutes; });

    const row = document.createElement("tr");
    row.appendChild(cell(item.item));
    columns.forEach(function (name) {
      row.appendChild(cell(name in minutesByStep ? toDuration(minutesByStep[name]) : ""));
    });
    row.appendChild(cell(toDuration(item.total)));
    body.appendChild(row);
  });
}

// ---------- load the run ----------

function showMessage(text, isError) {
  messageBox.textContent = text;
  messageBox.classList.toggle("error", Boolean(isError));
  messageBox.hidden = false;
  reportBox.hidden = true;
}

function showRun(run) {
  const summary = run.summary || {};
  const startClock = run.startClock || (run.scenario && run.scenario.startClock) || "00:00";
  const configSteps = run.config && run.config.steps;

  showOrders(summary.orders || [], startClock);
  showLateOrders(summary.orders || [], summary.waits || [], startClock);
  showStaff(summary.staff);
  showEquipment(summary.equipment, Number(summary.finish) || 0);
  showTimePerStep(summary.timePerStep, configSteps);

  document.title = run.name + " | Results | Bakery";
  const slug = String(run.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  document.querySelector(".downloadMenu").dataset.csvName = (slug || "simulation-report") + ".csv";

  messageBox.hidden = true;
  reportBox.hidden = false;
}

async function loadRun() {
  const runName = new URLSearchParams(window.location.search).get("run");
  if (!runName) {
    showMessage("No run selected. Run a simulation to see its results.", true);
    return;
  }
  document.getElementById("replayLink").href = "replay.html?run=" + encodeURIComponent(runName);

  try {
    const response = await fetch("/api/runs/" + encodeURIComponent(runName), { cache: "no-store" });
    if (response.status === 401) {
      window.location.href = "login.html";
      return;
    }
    const data = await response.json().catch(function () { return null; });
    if (!response.ok) {
      throw new Error(data && data.error ? data.error.message : "Something went wrong.");
    }
    showRun(data);
  } catch (error) {
    showMessage("Could not load the run \"" + runName + "\": " + error.message, true);
  }
}

document.getElementById("newSimulation").addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

document.getElementById("compareRun").addEventListener("click", () => {
  window.location.href = "compare.html";
});

loadRun();
