document.addEventListener("DOMContentLoaded", async () => {
  const status = document.getElementById("report-status");
  const $ = (id) => document.getElementById(id);
  const appendRows = (target, rows, colspan, emptyText) => {
    target.replaceChildren();
    if (!rows.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = colspan;
      cell.className = "tableEmpty";
      cell.textContent = emptyText;
      row.append(cell);
      target.append(row);
    } else rows.forEach((row) => target.append(row));
  };
  const makeRow = (values) => {
    const row = document.createElement("tr");
    values.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
      if (index === 0) cell.className = "item";
      row.append(cell);
    });
    return row;
  };
  const clock = (start, offset) => {
    const [hours, minutes] = String(start || "00:00").split(":").map(Number);
    const total = ((hours * 60 + minutes + Number(offset || 0)) % 1440 + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };
  const orderMap = (log) => new Map((log.summary?.orders || []).map((o) => [o.item, o]));

  function renderSummary(log, number) {
    const orders = log.summary?.orders || [];
    $(`scenario-${number}-finish`).textContent = log.summary?.finish === undefined ? "—" : clock(log.startClock, log.summary.finish);
    const onTime = orders.filter((order) => Number(order.lateBy || 0) === 0).length;
    $(`scenario-${number}-on-time`).textContent = `${onTime} / ${orders.length}`;
  }

  function renderOrders(first, second) {
    const a = orderMap(first), b = orderMap(second);
    const items = [...new Set([...a.keys(), ...b.keys()])];
    const rows = items.map((item) => {
      const x = a.get(item), y = b.get(item), sample = x || y;
      const readyA = x ? clock(first.startClock, x.ready) : "—";
      const readyB = y ? clock(second.startClock, y.ready) : "—";
      const delta = x && y ? Number(y.ready) - Number(x.ready) : null;
      const difference = delta === null ? "—" : delta === 0 ? "Same ready time" :
        `${Math.abs(delta)} min ${delta < 0 ? "earlier in Scenario 2" : "later in Scenario 2"}`;
      const row = makeRow([
        item, [sample.quantity, sample.unit].filter((v) => v !== undefined && v !== "").join(" "),
        sample.deadline || (sample.deadlineMinutes !== undefined ? clock(first.startClock, sample.deadlineMinutes) : "—"),
        readyA, readyB, difference
      ]);
      [[x, row.children[3]], [y, row.children[4]]].forEach(([order, cell]) => {
        if (!order) return;
        const late = Number(order.lateBy || 0);
        cell.classList.add(late > 0 ? "bad" : "good");
        if (late > 0) cell.textContent += ` · ${late} min late`;
        else if (order.status) cell.textContent += ` · ${order.status}`;
      });
      return row;
    });
    appendRows($("orders-body"), rows, 6, "No order summary is available in these event logs.");
  }

  function renderWaits(first, second) {
    const a = first.summary?.waits || [], b = second.summary?.waits || [];
    const key = (w) => [w.item, w.step, w.for, w.start].join("|");
    const mapA = new Map(a.map((w) => [key(w), w])), mapB = new Map(b.map((w) => [key(w), w]));
    const keys = [...new Set([...mapA.keys(), ...mapB.keys()])];
    const describe = (w, log) => w ? `${w.minutes} min at ${clock(log.startClock, w.start)}${w.because ? ` · ${w.because}` : ""}` : "—";
    const rows = keys.map((k) => {
      const x = mapA.get(k), y = mapB.get(k), w = x || y;
      return makeRow([[w.item, w.step].filter(Boolean).join(" · "), w.for || "—", describe(x, first), describe(y, second)]);
    });
    appendRows($("waits-body"), rows, 4, "No wait events are recorded.");
  }

  function renderSteps(first, second) {
    const index = (log) => {
      const result = new Map();
      (log.summary?.timePerStep || []).forEach((item) => {
        (item.steps || []).forEach((step) => result.set(`${item.item}|${step.step}`, step.minutes));
        if (item.total !== undefined) result.set(`${item.item}|Total`, item.total);
      });
      return result;
    };
    const a = index(first), b = index(second), keys = [...new Set([...a.keys(), ...b.keys()])];
    const rows = keys.map((k) => {
      const [item, step] = k.split("|");
      return makeRow([`${item} · ${step}`, a.has(k) ? `${a.get(k)} min` : "—", b.has(k) ? `${b.get(k)} min` : "—"]);
    });
    appendRows($("steps-body"), rows, 3, "No step timing data is recorded.");
  }

  function renderBreakdown(first, second, field, nameKey, bodyId, columns, emptyText, valueKeys) {
    const a = new Map((first.summary?.[field] || []).map((entry) => [entry[nameKey], entry]));
    const b = new Map((second.summary?.[field] || []).map((entry) => [entry[nameKey], entry]));
    const names = [...new Set([...a.keys(), ...b.keys()])];
    const rows = names.map((name) => {
      const x = a.get(name), y = b.get(name);
      const values = (entry) => valueKeys.map((key) => entry ? `${entry[key]} min` : "—");
      return makeRow([name, ...values(x), ...values(y)]);
    });
    appendRows($(bodyId), rows, columns, emptyText);
  }

  try {
    const response = await fetch("/api/eventlogs", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Unable to load event logs (${response.status}).`);
    const logs = await response.json();
    if (!logs.scenario1 || !logs.scenario2) throw new Error("The event log response is incomplete.");
    status.textContent = "";
    renderSummary(logs.scenario1, "1");
    renderSummary(logs.scenario2, "2");
    renderOrders(logs.scenario1, logs.scenario2);
    renderWaits(logs.scenario1, logs.scenario2);
    renderSteps(logs.scenario1, logs.scenario2);
    renderBreakdown(logs.scenario1, logs.scenario2, "staff", "who", "staff-body", 7,
      "No staff breakdown is recorded.", ["working", "waiting", "onBreak"]);
    renderBreakdown(logs.scenario1, logs.scenario2, "equipment", "name", "equipment-body", 13,
      "No equipment breakdown is recorded.", ["inUse", "waitingForWorker", "switching", "warmingUp", "unavailable", "idle"]);
  } catch (error) {
    status.textContent = error.message || "The event logs could not be loaded.";
  }
  $("downloadPdf").addEventListener("click", () => window.print());
  $("download-report").addEventListener("click", () => window.print());
});
